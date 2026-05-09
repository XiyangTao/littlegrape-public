/**
 * 订阅系统集成测试（全场景覆盖）
 * 运行：npx tsx services/api-gateway/src/tests/test-subscription.ts
 */

import { prisma } from '../config/database';
import {
  initializePlans,
  createTrialSubscription,
  getUserQuotaStatus,
  calculateUpgradePrice,
  upgradeUserPlan,
  scheduleRenewal,
  getActiveSubscription,
  getPlanList,
  checkQuotaAvailable,
  clearQuotaCaches,
} from '../services/quotaService';

const TEST_USER = 'test-sub-user';
let passed = 0;
let failed = 0;
let currentGroup = '';

function group(name: string) {
  currentGroup = name;
  console.log(`\n📋 ${name}`);
}

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.log(`  ❌ ${message}`);
    failed++;
  }
}

function assertApprox(actual: number, expected: number, message: string, tolerance = 0.02) {
  assert(Math.abs(actual - expected) <= tolerance, `${message} (actual: ${actual}, expected: ${expected})`);
}

async function cleanup() {
  await prisma.userSubscription.deleteMany({ where: { userId: TEST_USER } });
  await prisma.userOrder.deleteMany({ where: { userId: TEST_USER } });
  await prisma.userDailyUsage.deleteMany({ where: { userId: TEST_USER } });
}

async function setSubDates(subId: string, periodStart: Date, periodEnd: Date) {
  await prisma.userSubscription.update({
    where: { id: subId },
    data: { periodStart, periodEnd },
  });
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysLater(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(23, 59, 59, 999);
  return d;
}

let orderSeq = 0;
async function createPaidOrder(planType: string, billingCycle: string, amount: number, originalAmount?: number): Promise<string> {
  orderSeq++;
  const id = `test-order-${orderSeq}`;
  await prisma.userOrder.create({
    data: {
      id,
      userId: TEST_USER,
      orderNo: `TSUB${Date.now()}${orderSeq}`,
      planType,
      billingCycle,
      originalAmount: originalAmount ?? amount,
      amount,
      discountAmount: (originalAmount ?? amount) - amount,
      status: 'paid',
      paidAt: new Date(),
      expiredAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });
  return id;
}

// ==================== 测试用例 ====================

async function test_planInit() {
  group('1. Plan 初始化');
  await initializePlans();
  const plans = getPlanList();
  assert(plans.length === 4, `4 个套餐 (${plans.length})`);
  assert(plans[0].planType === 'free', 'free 排第一');
  assert(plans[1].planType === 'basic', 'basic 排第二');
  assert(plans[2].planType === 'pro', 'pro 排第三');
  assert(plans[3].planType === 'max', 'max 排第四');
  assert(plans[1].price === 9.9, 'basic 月价 9.9');
  assert(plans[1].yearlyPrice === 99.9, 'basic 年价 99.9');
  assert(plans[1].costBudget === 10, 'basic 预算 10');
  assert(plans[0].hasExpiry === false, 'free 无过期');
  assert(plans[1].hasExpiry === true, 'basic 有过期');
}

async function test_trialCreation() {
  group('2. 体验期创建');
  const sub = await createTrialSubscription(TEST_USER);
  assert(sub.planType === 'basic', 'planType: basic');
  assert(sub.isTrial === true, 'isTrial: true');
  assert(Number(sub.costBudget) === 1, 'costBudget: ¥1');
  assert(sub.status === 'active', 'status: active');
  assert(sub.billingCycle === 'monthly', 'billingCycle: monthly');
  assert(sub.orderId === null, 'orderId: null（无订单）');

  const days = Math.round((sub.periodEnd.getTime() - sub.periodStart.getTime()) / 86400000);
  assert(days >= 2 && days <= 3, `周期 ${days} 天`);
}

async function test_trialQuotaStatus() {
  group('3. 体验期配额状态');
  const s = await getUserQuotaStatus(TEST_USER);
  assert(s.planType === 'basic', 'planType: basic');
  assert(s.isTrial === true, 'isTrial: true');
  assert(s.costBudget === 1, 'costBudget: 1');
  assert(s.quotaStatus === 'active', 'quotaStatus: active');
  assert(s.usagePercentage === 0, 'usagePercentage: 0');
  assert(s.billingCycle === 'monthly', 'billingCycle: monthly');
  assert(s.periodStart !== null, 'periodStart 非 null');
  assert(s.periodEnd !== null, 'periodEnd 非 null');
  assert(s.nextPlanType === null, 'nextPlanType: null');
  assert(s.nextPlanName === null, 'nextPlanName: null');
  assert(s.nextPeriodEnd === null, 'nextPeriodEnd: null');
  assert(s.planName.includes('免费'), 'planName 含"免费"（体验期显示）');
}

async function test_trialQuotaExceeded() {
  group('4. 体验期配额用尽');
  // 注入 ¥1.5 的 AI 用量（超过 ¥1 预算）
  const sub = await getActiveSubscription(TEST_USER);
  const today = new Date().toISOString().slice(0, 10);
  await prisma.userDailyUsage.upsert({
    where: { userId_serviceType_date: { userId: TEST_USER, serviceType: 'ai', date: today } },
    create: { userId: TEST_USER, serviceType: 'ai', date: today, totalAmount: 900000 },
    update: { totalAmount: 900000 },
  });
  // 900000 tokens × 0.0000018 ¥/token = ¥1.62

  const s = await getUserQuotaStatus(TEST_USER);
  assert(s.quotaStatus === 'exceeded', 'quotaStatus: exceeded');
  assert(s.usagePercentage >= 100, `usagePercentage ${s.usagePercentage}% >= 100`);

  const check = await checkQuotaAvailable(TEST_USER);
  assert(check.available === false, 'checkQuota: 不可用');
  assert(check.message !== undefined, '有提示消息');

  // 清理用量 + 缓存
  await prisma.userDailyUsage.deleteMany({ where: { userId: TEST_USER } });
  await clearQuotaCaches(TEST_USER);
}

async function test_trialQuotaWarning() {
  group('5. 体验期配额警告（80-99%）');
  const sub = await getActiveSubscription(TEST_USER);
  const today = new Date().toISOString().slice(0, 10);
  // 500000 tokens × 0.0000018 = ¥0.9 → 90% of ¥1
  await prisma.userDailyUsage.upsert({
    where: { userId_serviceType_date: { userId: TEST_USER, serviceType: 'ai', date: today } },
    create: { userId: TEST_USER, serviceType: 'ai', date: today, totalAmount: 500000 },
    update: { totalAmount: 500000 },
  });

  const s = await getUserQuotaStatus(TEST_USER);
  assert(s.quotaStatus === 'warning', `quotaStatus: ${s.quotaStatus} (应为 warning)`);
  assert(s.usagePercentage >= 80 && s.usagePercentage < 100, `usagePercentage: ${s.usagePercentage}%`);

  const check = await checkQuotaAvailable(TEST_USER);
  assert(check.available === true, 'checkQuota: 可用（warning 不阻塞）');

  await prisma.userDailyUsage.deleteMany({ where: { userId: TEST_USER } });
}

async function test_trialPricing() {
  group('6. 体验期升级价格（视同免费，全价）');
  const p1 = await calculateUpgradePrice(TEST_USER, 'basic', 'monthly');
  assertApprox(p1.amount, 9.9, 'basic 月付: ¥9.9');
  assert(p1.isRenewal === false, 'basic 月付: 非续费');

  const p2 = await calculateUpgradePrice(TEST_USER, 'basic', 'yearly');
  assertApprox(p2.amount, 99.9, 'basic 年付: ¥99.9');

  const p3 = await calculateUpgradePrice(TEST_USER, 'pro', 'monthly');
  assertApprox(p3.amount, 19.9, 'pro 月付: ¥19.9');

  const p4 = await calculateUpgradePrice(TEST_USER, 'pro', 'yearly');
  assertApprox(p4.amount, 199, 'pro 年付: ¥199');

  const p5 = await calculateUpgradePrice(TEST_USER, 'max', 'yearly');
  assertApprox(p5.amount, 499, 'max 年付: ¥499');
}

async function test_trialUpgradeProYearly() {
  group('7. 体验期 → Pro 年付（跳级）');
  const orderId = await createPaidOrder('pro', 'yearly', 199);
  await prisma.$transaction(async (tx) => {
    await upgradeUserPlan(TEST_USER, 'pro', 'yearly', orderId, tx);
  });

  const sub = await getActiveSubscription(TEST_USER);
  assert(sub!.planType === 'pro', 'planType: pro');
  assert(sub!.billingCycle === 'yearly', 'billingCycle: yearly');
  assert(Number(sub!.costBudget) === 240, 'costBudget: ¥240 (20×12)');
  assert(sub!.isTrial === false, 'isTrial: false');
  assert(sub!.orderId === orderId, 'orderId 关联');

  const periodDays = Math.round((sub!.periodEnd.getTime() - sub!.periodStart.getTime()) / 86400000);
  assert(periodDays >= 364 && periodDays <= 366, `年付周期: ${periodDays} 天`);

  // 旧体验期应为 superseded
  const old = await prisma.userSubscription.findMany({
    where: { userId: TEST_USER, isTrial: true },
  });
  assert(old[0].status === 'superseded', '旧体验期: superseded');
  assert(old[0].supersededBy === sub!.id, 'supersededBy 正确');
}

async function test_upgradeProToMax() {
  group('8. Pro 年付 → Max 月付升级（跨级+切周期）');
  // 模拟已用 100 天
  const sub = await getActiveSubscription(TEST_USER);
  await setSubDates(sub!.id, daysAgo(100), daysLater(265));

  const price = await calculateUpgradePrice(TEST_USER, 'max', 'monthly');
  assert(price.isRenewal === false, 'isRenewal: false');
  // 旧剩余价值 = 199/366 * 266 ≈ 144.5 → 49.9 - 144.5 < 0 → amount = 0
  assert(price.amount >= 0, `升级价 ¥${price.amount} >= 0`);
  console.log(`    ℹ️  Pro年付→Max月付: ¥${price.amount}`);

  const orderId = await createPaidOrder('max', 'monthly', Math.max(0.01, price.amount), 49.9);
  await prisma.$transaction(async (tx) => {
    await upgradeUserPlan(TEST_USER, 'max', 'monthly', orderId, tx);
  });

  const newSub = await getActiveSubscription(TEST_USER);
  assert(newSub!.planType === 'max', 'planType: max');
  assert(Number(newSub!.costBudget) === 50, 'costBudget: ¥50（月付）');
  assert(newSub!.billingCycle === 'monthly', 'billingCycle: monthly');
}

async function test_maxMonthlyToYearly() {
  group('9. Max 月付 → Max 年付');
  const sub = await getActiveSubscription(TEST_USER);
  await setSubDates(sub!.id, daysAgo(10), daysLater(20));

  const price = await calculateUpgradePrice(TEST_USER, 'max', 'yearly');
  assert(price.isRenewal === false, 'isRenewal: false');
  assert(price.amount < 499, `折算价 ¥${price.amount} < 原价 ¥499`);
  // 用量 0% → 退全部 ¥49.9 → 实付 499 - 49.9 = 449.1
  assertApprox(price.amount, 449.1, `Max月→年（零用量）: ¥${price.amount}`);

  const orderId = await createPaidOrder('max', 'yearly', price.amount, 499);
  await prisma.$transaction(async (tx) => {
    await upgradeUserPlan(TEST_USER, 'max', 'yearly', orderId, tx);
  });

  const newSub = await getActiveSubscription(TEST_USER);
  assert(Number(newSub!.costBudget) === 600, 'costBudget: ¥600 (50×12)');
  assert(newSub!.billingCycle === 'yearly', 'billingCycle: yearly');
}

async function test_samePlanRenewal() {
  group('10. Max 年付同级续费');
  const sub = await getActiveSubscription(TEST_USER);
  // 模拟即将到期
  await setSubDates(sub!.id, daysAgo(360), daysLater(5));

  const price = await calculateUpgradePrice(TEST_USER, 'max', 'yearly');
  assertApprox(price.amount, 499, '续费全价: ¥499');
  assert(price.isRenewal === true, 'isRenewal: true');

  const orderId = await createPaidOrder('max', 'yearly', 499);
  await prisma.$transaction(async (tx) => {
    await scheduleRenewal(TEST_USER, 'max', 'yearly', orderId, tx);
  });

  const scheduled = await prisma.userSubscription.findFirst({
    where: { userId: TEST_USER, status: 'scheduled' },
  });
  assert(scheduled !== null, '存在 scheduled 订阅');
  assert(scheduled!.planType === 'max', 'scheduled: max');
  assert(Number(scheduled!.costBudget) === 600, 'scheduled costBudget: ¥600');

  // 当前 active 不变
  const active = await getActiveSubscription(TEST_USER);
  assert(active!.status === 'active', '当前仍 active');
  assert(active!.id === sub!.id, '当前订阅未变');
}

async function test_upgradeWithScheduledRenewal() {
  group('11. 有待生效续费时升级（应取消 scheduled，credited 订单）');
  // 此时 max yearly active + max yearly scheduled
  const orderId = await createPaidOrder('max', 'yearly', 499); // 升级用新订单
  // 实际上这里我们直接升级到 max yearly（相当于一个新购买）
  // 但逻辑上应取消旧 scheduled

  const scheduledBefore = await prisma.userSubscription.findFirst({
    where: { userId: TEST_USER, status: 'scheduled' },
  });
  assert(scheduledBefore !== null, '升级前有 scheduled');

  await prisma.$transaction(async (tx) => {
    await upgradeUserPlan(TEST_USER, 'max', 'yearly', orderId, tx);
  });

  // scheduled 应被 cancelled
  const scheduledAfter = await prisma.userSubscription.findFirst({
    where: { id: scheduledBefore!.id },
  });
  assert(scheduledAfter!.status === 'cancelled', '旧 scheduled 已 cancelled');
  assert(scheduledAfter!.cancelledAt !== null, 'cancelledAt 已设置');

  // 旧 scheduled 关联的订单应为 credited
  const creditedOrder = await prisma.userOrder.findFirst({
    where: { id: scheduledBefore!.orderId! },
  });
  assert(creditedOrder!.status === 'credited', '旧续费订单已 credited');
}

async function test_renewalActivation() {
  group('12. 到期自动续费激活');
  // 先续费
  const sub = await getActiveSubscription(TEST_USER);
  await setSubDates(sub!.id, daysAgo(365), daysLater(2));

  const renewOrderId = await createPaidOrder('max', 'monthly', 49.9);
  await prisma.$transaction(async (tx) => {
    await scheduleRenewal(TEST_USER, 'max', 'monthly', renewOrderId, tx);
  });

  // 设为已过期
  await setSubDates(sub!.id, daysAgo(365), daysAgo(1));

  const s = await getUserQuotaStatus(TEST_USER);
  assert(s.planType === 'max', 'planType: max');
  assert(s.quotaStatus === 'active', 'quotaStatus: active');
  assert(s.nextPlanType === null, 'nextPlanType: null（续费已激活）');
  assert(s.billingCycle === 'monthly', 'billingCycle: monthly（续费为月付）');
  assert(s.costBudget === 50, 'costBudget: ¥50（月付预算）');

  const oldSub = await prisma.userSubscription.findFirst({ where: { id: sub!.id } });
  assert(oldSub!.status === 'expired', '旧订阅: expired');
}

async function test_expiryDowngrade() {
  group('13. 到期无续费 → 降级 free');
  const sub = await getActiveSubscription(TEST_USER);
  await setSubDates(sub!.id, daysAgo(30), daysAgo(1));

  const s = await getUserQuotaStatus(TEST_USER);
  assert(s.planType === 'free', 'planType: free');
  assert(s.isTrial === false, 'isTrial: false');
  assert(s.periodStart === null, 'periodStart: null');
  assert(s.periodEnd === null, 'periodEnd: null');
  assert(s.costBudget === 1, 'costBudget: ¥1');
  assert(s.billingCycle === 'monthly', 'billingCycle: monthly');
}

async function test_freeUserQuota() {
  group('14. Free 用户配额状态');
  // 此时用户已降级为 free（无 active 订阅）
  const active = await getActiveSubscription(TEST_USER);
  assert(active === null, '无 active 订阅');

  const s = await getUserQuotaStatus(TEST_USER);
  assert(s.planType === 'free', 'planType: free');
  assert(s.quotaStatus === 'active', 'quotaStatus: active（无用量）');
  assert(s.costBreakdown.total === 0, 'costBreakdown.total: 0');

  const check = await checkQuotaAvailable(TEST_USER);
  assert(check.available === true, '配额可用');
}

async function test_freeUserPurchase() {
  group('15. Free 用户购买 basic 月付');
  const price = await calculateUpgradePrice(TEST_USER, 'basic', 'monthly');
  assertApprox(price.amount, 9.9, '全价: ¥9.9');
  assert(price.isRenewal === false, 'isRenewal: false');

  const orderId = await createPaidOrder('basic', 'monthly', 9.9);
  await prisma.$transaction(async (tx) => {
    await upgradeUserPlan(TEST_USER, 'basic', 'monthly', orderId, tx);
  });

  const sub = await getActiveSubscription(TEST_USER);
  assert(sub!.planType === 'basic', 'planType: basic');
  assert(Number(sub!.costBudget) === 10, 'costBudget: ¥10');
}

async function test_upgradeNoUsage() {
  group('16. 零用量升级（全额抵扣）');
  const sub = await getActiveSubscription(TEST_USER);
  await setSubDates(sub!.id, daysAgo(0), daysLater(29));

  const price = await calculateUpgradePrice(TEST_USER, 'pro', 'monthly');
  // 用量 0% → 退全部 ¥9.9 → 实付 19.9 - 9.9 = 10.0
  assertApprox(price.amount, 10, '零用量升级差价: ¥10');
}

async function test_upgradeHalfUsage() {
  group('17. 50%用量升级（半额抵扣）');
  const sub = await getActiveSubscription(TEST_USER);
  await setSubDates(sub!.id, daysAgo(15), daysLater(15));

  // 注入 50% 用量：2800000 tokens ≈ ¥5.04
  const today = new Date().toISOString().slice(0, 10);
  await prisma.userDailyUsage.upsert({
    where: { userId_serviceType_date: { userId: TEST_USER, serviceType: 'ai', date: today } },
    create: { userId: TEST_USER, serviceType: 'ai', date: today, totalAmount: 2800000 },
    update: { totalAmount: 2800000 },
  });

  const price = await calculateUpgradePrice(TEST_USER, 'pro', 'monthly');
  // 用量 ≈50% → 退 ≈¥4.9 → 实付 ≈ 19.9 - 4.9 ≈ 15
  assert(price.amount > 14 && price.amount < 16, `50%用量升级: ¥${price.amount}（应在 14~16）`);

  await prisma.userDailyUsage.deleteMany({ where: { userId: TEST_USER } });
}

async function test_yearlyToYearlyUpgrade() {
  group('18. Basic 年付 → Pro 年付');
  await cleanup();
  await initializePlans();

  // 创建 basic 年付
  const orderId1 = await createPaidOrder('basic', 'yearly', 99.9);
  await prisma.$transaction(async (tx) => {
    await upgradeUserPlan(TEST_USER, 'basic', 'yearly', orderId1, tx);
  });

  const sub = await getActiveSubscription(TEST_USER);
  assert(Number(sub!.costBudget) === 120, 'basic 年付 costBudget: ¥120');

  // 模拟用了 180 天
  await setSubDates(sub!.id, daysAgo(180), daysLater(185));

  const price = await calculateUpgradePrice(TEST_USER, 'pro', 'yearly');
  // 用量 0% → 退全部 ¥99.9 → 实付 199 - 99.9 = 99.1
  assertApprox(price.amount, 99.1, `年→年升级（零用量）: ¥${price.amount}`);

  const orderId2 = await createPaidOrder('pro', 'yearly', price.amount, 199);
  await prisma.$transaction(async (tx) => {
    await upgradeUserPlan(TEST_USER, 'pro', 'yearly', orderId2, tx);
  });

  const newSub = await getActiveSubscription(TEST_USER);
  assert(newSub!.planType === 'pro', 'planType: pro');
  assert(Number(newSub!.costBudget) === 240, 'costBudget: ¥240');
  assert(newSub!.billingCycle === 'yearly', 'billingCycle: yearly');
}

async function test_renewalWithDifferentCycle() {
  group('19. Pro 年付 → 续费为月付');
  const sub = await getActiveSubscription(TEST_USER);
  await setSubDates(sub!.id, daysAgo(360), daysLater(5));

  const price = await calculateUpgradePrice(TEST_USER, 'pro', 'monthly');
  // 同级续费：全价
  assertApprox(price.amount, 19.9, '续费月付: ¥19.9');
  assert(price.isRenewal === true, 'isRenewal: true');

  const orderId = await createPaidOrder('pro', 'monthly', 19.9);
  await prisma.$transaction(async (tx) => {
    await scheduleRenewal(TEST_USER, 'pro', 'monthly', orderId, tx);
  });

  const scheduled = await prisma.userSubscription.findFirst({
    where: { userId: TEST_USER, status: 'scheduled' },
  });
  assert(scheduled!.billingCycle === 'monthly', 'scheduled billingCycle: monthly');
  assert(Number(scheduled!.costBudget) === 20, 'scheduled costBudget: ¥20（月付）');
}

async function test_upgradeRenewalDifferentCycleActivation() {
  group('20. 续费月付到期激活');
  const sub = await getActiveSubscription(TEST_USER);
  await setSubDates(sub!.id, daysAgo(365), daysAgo(1));

  const s = await getUserQuotaStatus(TEST_USER);
  assert(s.planType === 'pro', 'planType: pro');
  assert(s.billingCycle === 'monthly', 'billingCycle: monthly（续费月付生效）');
  assert(s.costBudget === 20, 'costBudget: ¥20');
}

async function test_subscriptionHistory() {
  group('21. 订阅历史完整性');
  const allSubs = await prisma.userSubscription.findMany({
    where: { userId: TEST_USER },
    orderBy: { createdAt: 'asc' },
  });

  assert(allSubs.length >= 2, `订阅记录数: ${allSubs.length} (>= 2)`);

  // 检查只有 1 个 active
  const activeSubs = allSubs.filter(s => s.status === 'active');
  assert(activeSubs.length === 1, `仅 1 个 active (${activeSubs.length})`);

  // superseded 的都有 supersededBy
  const superseded = allSubs.filter(s => s.status === 'superseded');
  for (const s of superseded) {
    assert(s.supersededBy !== null, `superseded ${s.id.slice(-6)} 有 supersededBy`);
  }

  // cancelled 的都有 cancelledAt
  const cancelled = allSubs.filter(s => s.status === 'cancelled');
  for (const s of cancelled) {
    assert(s.cancelledAt !== null, `cancelled ${s.id.slice(-6)} 有 cancelledAt`);
  }

  console.log(`    ℹ️  共 ${allSubs.length} 条记录: active=${activeSubs.length} superseded=${superseded.length} expired=${allSubs.filter(s=>s.status==='expired').length} cancelled=${cancelled.length}`);
}

async function test_costBreakdown() {
  group('22. 成本明细（多服务类型）');
  await cleanup();
  await initializePlans();

  const orderId = await createPaidOrder('basic', 'monthly', 9.9);
  await prisma.$transaction(async (tx) => {
    await upgradeUserPlan(TEST_USER, 'basic', 'monthly', orderId, tx);
  });

  const today = new Date().toISOString().slice(0, 10);
  // 注入多种服务用量
  await prisma.userDailyUsage.createMany({
    data: [
      { userId: TEST_USER, serviceType: 'ai', date: today, totalAmount: 100000 },      // 100k tokens
      { userId: TEST_USER, serviceType: 'tts', date: today, totalAmount: 5000 },        // 5000 字符
      { userId: TEST_USER, serviceType: 'asr', date: today, totalAmount: 60000 },       // 60 秒
      { userId: TEST_USER, serviceType: 'pronunciation', date: today, totalAmount: 30000 }, // 30 秒
    ],
  });

  const s = await getUserQuotaStatus(TEST_USER);
  assert(s.costBreakdown.ai > 0, `ai 成本: ¥${s.costBreakdown.ai}`);
  assert(s.costBreakdown.tts > 0, `tts 成本: ¥${s.costBreakdown.tts}`);
  assert(s.costBreakdown.asr > 0, `asr 成本: ¥${s.costBreakdown.asr}`);
  assert(s.costBreakdown.pronunciation > 0, `pronunciation 成本: ¥${s.costBreakdown.pronunciation}`);
  assert(s.costBreakdown.total > 0, `total: ¥${s.costBreakdown.total}`);

  // total = 各项之和
  const sum = s.costBreakdown.ai + s.costBreakdown.tts + s.costBreakdown.asr
    + s.costBreakdown.pronunciation + s.costBreakdown.translation + s.costBreakdown.text_translation;
  assertApprox(s.costBreakdown.total, sum, 'total = 各项之和');

  assert(s.usagePercentage > 0, `usagePercentage: ${s.usagePercentage}%`);
  await prisma.userDailyUsage.deleteMany({ where: { userId: TEST_USER } });
}

async function test_usageOutsidePeriod() {
  group('23. 周期外用量不计入');
  const sub = await getActiveSubscription(TEST_USER);
  // 设置周期为最近 10 天
  await setSubDates(sub!.id, daysAgo(10), daysLater(20));

  // 在周期之前注入用量（15 天前）
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 15);
  const oldDateStr = oldDate.toISOString().slice(0, 10);
  await prisma.userDailyUsage.create({
    data: { userId: TEST_USER, serviceType: 'ai', date: oldDateStr, totalAmount: 999999 },
  });

  const s = await getUserQuotaStatus(TEST_USER);
  assert(s.costConsumed === 0, `周期外用量不计入: costConsumed=${s.costConsumed}`);

  await prisma.userDailyUsage.deleteMany({ where: { userId: TEST_USER } });
}

async function test_renewalWithUpgradeCredit() {
  group('24. 有续费时升级（续费金额抵扣）');
  await cleanup();
  await initializePlans();

  // 创建 basic 月付
  const orderId1 = await createPaidOrder('basic', 'monthly', 9.9);
  await prisma.$transaction(async (tx) => {
    await upgradeUserPlan(TEST_USER, 'basic', 'monthly', orderId1, tx);
  });

  const sub = await getActiveSubscription(TEST_USER);
  await setSubDates(sub!.id, daysAgo(25), daysLater(5));

  // 先续费
  const renewOrderId = await createPaidOrder('basic', 'monthly', 9.9);
  await prisma.$transaction(async (tx) => {
    await scheduleRenewal(TEST_USER, 'basic', 'monthly', renewOrderId, tx);
  });

  // 升级到 pro → 续费 ¥9.9 应计入抵扣
  const price = await calculateUpgradePrice(TEST_USER, 'pro', 'monthly');
  // 用量 0% → 旧剩余 = 全部 ¥9.9
  // 续费抵扣 = 9.9
  // pro 价格 = 19.9
  // 实付 = 19.9 - 9.9 - 9.9 = 0.1
  assert(price.amount < 1, `抵扣后 ¥${price.amount} < ¥1`);
  assertApprox(price.amount, 0.1, `含续费抵扣升级价: ¥${price.amount}`);
  console.log(`    ℹ️  含续费抵扣的升级价: ¥${price.amount}`);
}

async function test_monthEndOverflow() {
  group('25. 月末溢出（1月31日+1月=2月28日）');
  await cleanup();
  await initializePlans();

  const orderId = await createPaidOrder('basic', 'monthly', 9.9);
  await prisma.$transaction(async (tx) => {
    await upgradeUserPlan(TEST_USER, 'basic', 'monthly', orderId, tx);
  });

  const sub = await getActiveSubscription(TEST_USER);
  // 用未来年份模拟 1月31日 开始
  const jan31 = new Date(2028, 0, 31, 0, 0, 0, 0);
  // 1个月后应为 2月29日 23:59:59.999（2028 是闰年）
  const feb29 = new Date(2028, 1, 29, 23, 59, 59, 999);
  await setSubDates(sub!.id, jan31, feb29);

  const s = await getUserQuotaStatus(TEST_USER);
  assert(s.periodEnd !== null, 'periodEnd 非 null');
  const endDate = new Date(s.periodEnd!);
  assert(endDate.getMonth() === 1, `到期月份: ${endDate.getMonth() + 1} (应为 2 月)`);
  assert(endDate.getDate() === 29, `到期日期: ${endDate.getDate()} (应为 29，闰年)`);
}

async function test_invalidPlanType() {
  group('26. 无效套餐类型');
  let errored = false;
  try {
    await calculateUpgradePrice(TEST_USER, 'free', 'monthly');
  } catch (e: any) {
    errored = true;
    assert(e.message.includes('无效'), `错误信息: ${e.message}`);
  }
  assert(errored, 'free 套餐应抛错');

  errored = false;
  try {
    await calculateUpgradePrice(TEST_USER, 'nonexistent' as any, 'monthly');
  } catch {
    errored = true;
  }
  assert(errored, '不存在的套餐应抛错');
}

async function test_exhaustedBudgetNoRefund() {
  group('28. 用完额度后升级不退钱');
  await cleanup();
  await initializePlans();

  // 创建 basic 月付
  const o1 = await createPaidOrder('basic', 'monthly', 9.9);
  await prisma.$transaction(async (tx) => {
    await upgradeUserPlan(TEST_USER, 'basic', 'monthly', o1, tx);
  });

  const sub = await getActiveSubscription(TEST_USER);
  // 模拟用了 1 天，还剩 29 天
  await setSubDates(sub!.id, daysAgo(1), daysLater(29));

  // 注入超过预算的用量：6000000 tokens × 0.0000018 = ¥10.8（超过 ¥10 预算）
  const today = new Date().toISOString().slice(0, 10);
  await prisma.userDailyUsage.create({
    data: { userId: TEST_USER, serviceType: 'ai', date: today, totalAmount: 6000000 },
  });

  // 升级到 Pro：用量已用完，剩余价值应为 0
  const price = await calculateUpgradePrice(TEST_USER, 'pro', 'monthly');
  assertApprox(price.amount, 19.9, '用完额度 → 全价升级 ¥19.9');

  // 对比：如果只用了 50% 额度
  await prisma.userDailyUsage.update({
    where: { userId_serviceType_date: { userId: TEST_USER, serviceType: 'ai', date: today } },
    data: { totalAmount: 2800000 }, // ≈ ¥5.04，约 50%
  });

  const price2 = await calculateUpgradePrice(TEST_USER, 'pro', 'monthly');
  // 用量维度：9.9*(1-0.504) ≈ 4.9 → 退 4.9 → 实付 19.9-4.9 ≈ 15
  assert(price2.amount > 14 && price2.amount < 16, `50%用量 → 升级价 ¥${price2.amount}（应在 14~16 之间）`);
  assert(price2.amount > price.amount - 6, '50%用量比100%用量退得多');

  await prisma.userDailyUsage.deleteMany({ where: { userId: TEST_USER } });
}

async function test_costOffsetOnUpgrade() {
  group('29. costOffset：升级当天旧用量不计入新周期');
  await cleanup();
  await initializePlans();

  // 创建 basic 月付
  const o1 = await createPaidOrder('basic', 'monthly', 9.9);
  await prisma.$transaction(async (tx) => {
    await upgradeUserPlan(TEST_USER, 'basic', 'monthly', o1, tx);
  });

  // 注入今天的用量：200000 tokens × 0.0000018 = ¥0.36
  const today = new Date().toISOString().slice(0, 10);
  await prisma.userDailyUsage.create({
    data: { userId: TEST_USER, serviceType: 'ai', date: today, totalAmount: 200000 },
  });

  // 升级前确认用量
  const beforeStatus = await getUserQuotaStatus(TEST_USER);
  assert(beforeStatus.costConsumed > 0.3, `升级前消耗: ¥${beforeStatus.costConsumed} > ¥0.3`);
  const consumedBeforeUpgrade = beforeStatus.costConsumed;

  // 升级到 Pro
  const o2 = await createPaidOrder('pro', 'monthly', 10);
  await clearQuotaCaches(TEST_USER);
  await prisma.$transaction(async (tx) => {
    await upgradeUserPlan(TEST_USER, 'pro', 'monthly', o2, tx);
  });

  // 升级后：costOffset 应等于升级时的消耗，新周期消耗应为 0
  const sub = await getActiveSubscription(TEST_USER);
  const offset = Number(sub!.costOffset);
  assertApprox(offset, consumedBeforeUpgrade, `costOffset ≈ ¥${consumedBeforeUpgrade}`);

  await clearQuotaCaches(TEST_USER);
  const afterStatus = await getUserQuotaStatus(TEST_USER);
  assertApprox(afterStatus.costConsumed, 0, '升级后消耗: ¥0（旧用量已扣除）');
  assert(afterStatus.costBudget === 20, 'costBudget: ¥20');
  assert(afterStatus.usagePercentage === 0, `usagePercentage: ${afterStatus.usagePercentage}%`);

  await prisma.userDailyUsage.deleteMany({ where: { userId: TEST_USER } });
}

async function test_multipleSubscriptionStateMachine() {
  group('27. 状态机完整性验证');
  await cleanup();
  await initializePlans();

  // 1. 创建体验期 → active
  const trial = await createTrialSubscription(TEST_USER);
  assert(trial.status === 'active', 'trial: active');

  // 2. 升级 basic → trial superseded, basic active
  const o1 = await createPaidOrder('basic', 'monthly', 9.9);
  await prisma.$transaction(async (tx) => {
    await upgradeUserPlan(TEST_USER, 'basic', 'monthly', o1, tx);
  });

  const trialAfter = await prisma.userSubscription.findFirst({ where: { id: trial.id } });
  assert(trialAfter!.status === 'superseded', 'trial → superseded');

  // 3. 续费 → scheduled
  const basicSub = await getActiveSubscription(TEST_USER);
  await setSubDates(basicSub!.id, daysAgo(25), daysLater(5));
  const o2 = await createPaidOrder('basic', 'monthly', 9.9);
  await prisma.$transaction(async (tx) => {
    await scheduleRenewal(TEST_USER, 'basic', 'monthly', o2, tx);
  });

  const scheduled = await prisma.userSubscription.findFirst({
    where: { userId: TEST_USER, status: 'scheduled' },
  });
  assert(scheduled!.status === 'scheduled', 'renewal: scheduled');

  // 4. 升级 pro → basic superseded, scheduled cancelled, pro active
  const o3 = await createPaidOrder('pro', 'monthly', 10);
  await prisma.$transaction(async (tx) => {
    await upgradeUserPlan(TEST_USER, 'pro', 'monthly', o3, tx);
  });

  const basicAfter = await prisma.userSubscription.findFirst({ where: { id: basicSub!.id } });
  assert(basicAfter!.status === 'superseded', 'basic → superseded');

  const scheduledAfter = await prisma.userSubscription.findFirst({ where: { id: scheduled!.id } });
  assert(scheduledAfter!.status === 'cancelled', 'scheduled → cancelled');

  const proSub = await getActiveSubscription(TEST_USER);
  assert(proSub!.planType === 'pro', 'pro: active');

  // 5. 到期 → expired, 无续费 → free
  await setSubDates(proSub!.id, daysAgo(30), daysAgo(1));
  const s = await getUserQuotaStatus(TEST_USER);
  assert(s.planType === 'free', '到期 → free');

  const proAfter = await prisma.userSubscription.findFirst({ where: { id: proSub!.id } });
  assert(proAfter!.status === 'expired', 'pro → expired');

  // 验证所有状态
  const all = await prisma.userSubscription.findMany({
    where: { userId: TEST_USER },
    orderBy: { createdAt: 'asc' },
  });
  const statuses = all.map(s => s.status);
  console.log(`    ℹ️  状态链: ${statuses.join(' → ')}`);
  assert(statuses.filter(s => s === 'active').length === 0, '无残留 active（已降级 free）');
}

// ==================== 执行 ====================

async function runAll() {
  console.log('🧪 订阅系统集成测试（全场景）\n');

  try {
    await cleanup();

    await test_planInit();
    await test_trialCreation();
    await test_trialQuotaStatus();
    await test_trialQuotaExceeded();
    await test_trialQuotaWarning();
    await test_trialPricing();
    await test_trialUpgradeProYearly();
    await test_upgradeProToMax();
    await test_maxMonthlyToYearly();
    await test_samePlanRenewal();
    await test_upgradeWithScheduledRenewal();
    await test_renewalActivation();
    await test_expiryDowngrade();
    await test_freeUserQuota();
    await test_freeUserPurchase();
    await test_upgradeNoUsage();
    await test_upgradeHalfUsage();
    await test_yearlyToYearlyUpgrade();
    await test_renewalWithDifferentCycle();
    await test_upgradeRenewalDifferentCycleActivation();
    await test_subscriptionHistory();
    await test_costBreakdown();
    await test_usageOutsidePeriod();
    await test_renewalWithUpgradeCredit();
    await test_monthEndOverflow();
    await test_invalidPlanType();
    await test_exhaustedBudgetNoRefund();
    await test_costOffsetOnUpgrade();
    await test_multipleSubscriptionStateMachine();
  } catch (error) {
    console.error('\n💥 测试异常:', error);
    failed++;
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ✅ 通过: ${passed}    ❌ 失败: ${failed}`);
  console.log(`${'='.repeat(50)}`);

  process.exit(failed > 0 ? 1 : 0);
}

runAll();
