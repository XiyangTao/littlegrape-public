/**
 * 支付定价逻辑测试脚本
 * 运行：npx tsx services/api-gateway/src/tests/test-pricing.ts
 *
 * 测试 calculateUpgradePrice 的所有场景
 */

// 模拟 PLAN_DEFINITIONS（测试价格）
const PLAN_DEFINITIONS = {
  free:  { name: '免费版', price: 0,   yearlyPrice: 0   },
  basic: { name: '基础版', price: 0.1, yearlyPrice: 1   },
  pro:   { name: 'Pro',   price: 0.2, yearlyPrice: 2   },
  max:   { name: 'Max',   price: 0.4, yearlyPrice: 4   },
};

// 模拟 addMonths（含月末溢出修复）
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const targetMonth = result.getMonth() + months;
  const dayOfMonth = result.getDate();
  result.setMonth(targetMonth);
  if (result.getDate() !== dayOfMonth) {
    result.setDate(0);
  }
  return result;
}

// 纯函数版本的 calculateUpgradePrice（与 quotaService.ts 同步）
function calculateUpgradePrice(
  existing: { planType: string; currentPeriodStart: Date; currentPeriodEnd: Date } | null,
  newPlanType: string,
  billingCycle: 'monthly' | 'yearly',
  now: Date,
): { amount: number; periodEnd: Date; isRenewal: boolean } {
  const newPlanDef = PLAN_DEFINITIONS[newPlanType as keyof typeof PLAN_DEFINITIONS];
  const newPrice = billingCycle === 'yearly' ? newPlanDef.yearlyPrice : newPlanDef.price;

  // 同级续费
  if (existing && existing.planType === newPlanType && existing.currentPeriodEnd > now) {
    const periodEnd = billingCycle === 'yearly'
      ? addMonths(existing.currentPeriodEnd, 12)
      : addMonths(existing.currentPeriodEnd, 1);
    return { amount: newPrice, periodEnd, isRenewal: true };
  }

  // 升级：旧套餐剩余价值抵扣新套餐全价
  if (existing && existing.planType !== 'free' && existing.currentPeriodEnd > now) {
    const oldPlanDef = PLAN_DEFINITIONS[existing.planType as keyof typeof PLAN_DEFINITIONS];
    if (oldPlanDef) {
      const oldTotalDays = Math.max(1, Math.ceil((existing.currentPeriodEnd.getTime() - existing.currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24)));
      const remainingDays = Math.max(0, Math.ceil((existing.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      const oldIsYearly = oldTotalDays > 180;
      const oldPrice = oldIsYearly ? oldPlanDef.yearlyPrice : oldPlanDef.price;
      const oldRemainingValue = (oldPrice / oldTotalDays) * remainingDays;

      // 新周期从现在开始
      const newPeriodEnd = billingCycle === 'yearly'
        ? addMonths(now, 12)
        : addMonths(now, 1);

      const amount = Math.max(0, Math.round((newPrice - oldRemainingValue) * 100) / 100);
      return { amount, periodEnd: newPeriodEnd, isRenewal: false };
    }
  }

  // 新用户 / 免费用户
  const periodEnd = billingCycle === 'yearly'
    ? addMonths(now, 12)
    : addMonths(now, 1);
  return { amount: newPrice, periodEnd, isRenewal: false };
}

// ==================== 测试用例 ====================

let passed = 0;
let failed = 0;

function assert(name: string, actual: number, expected: number) {
  if (Math.abs(actual - expected) < 0.005) {
    console.log(`  ✅ ${name}: ¥${actual} (预期 ¥${expected})`);
    passed++;
  } else {
    console.log(`  ❌ ${name}: ¥${actual} (预期 ¥${expected})`);
    failed++;
  }
}

function assertDate(name: string, actual: Date, expected: Date) {
  const a = actual.toISOString().slice(0, 10);
  const e = expected.toISOString().slice(0, 10);
  if (a === e) {
    console.log(`  ✅ ${name}: ${a}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}: ${a} (预期 ${e})`);
    failed++;
  }
}

function assertBool(name: string, actual: boolean, expected: boolean) {
  if (actual === expected) {
    console.log(`  ✅ ${name}: ${actual}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}: ${actual} (预期 ${expected})`);
    failed++;
  }
}

// ==================== 场景 1：新用户 / 免费用户 ====================
console.log('\n📦 场景 1：新用户购买');

const now = new Date('2026-03-28');

const r1a = calculateUpgradePrice(null, 'basic', 'monthly', now);
assert('新用户买基础版月付', r1a.amount, 0.1);
assertBool('非续费', r1a.isRenewal, false);
assertDate('到期日', r1a.periodEnd, new Date('2026-04-28'));

const r1b = calculateUpgradePrice(null, 'pro', 'yearly', now);
assert('新用户买Pro年付', r1b.amount, 2);
assertDate('到期日', r1b.periodEnd, new Date('2027-03-28'));

const r1c = calculateUpgradePrice(
  { planType: 'free', currentPeriodStart: new Date('2020-01-01'), currentPeriodEnd: new Date('2099-12-31') },
  'max', 'monthly', now,
);
assert('免费用户买Max月付', r1c.amount, 0.4);

// ==================== 场景 2：同级续费（未到期，窗口期内） ====================
console.log('\n🔄 场景 2：同级续费');

const r2a = calculateUpgradePrice(
  { planType: 'pro', currentPeriodStart: new Date('2026-03-01'), currentPeriodEnd: new Date('2026-04-01') },
  'pro', 'monthly', now,
);
assert('Pro月付续费', r2a.amount, 0.2);
assertBool('是续费', r2a.isRenewal, true);
assertDate('到期日从原到期日延续', r2a.periodEnd, new Date('2026-05-01'));

const r2b = calculateUpgradePrice(
  { planType: 'basic', currentPeriodStart: new Date('2026-01-15'), currentPeriodEnd: new Date('2027-01-15') },
  'basic', 'yearly', now,
);
assert('基础版年付续费', r2b.amount, 1);
assertBool('是续费', r2b.isRenewal, true);
assertDate('到期日从原到期日延续', r2b.periodEnd, new Date('2028-01-15'));

// ==================== 场景 3：升级（月付 → 月付） ====================
console.log('\n⬆️  场景 3：升级（月付基础版 → 月付Pro）');

// 3月1日开通基础版月付，3月11日升级Pro
const r3 = calculateUpgradePrice(
  { planType: 'basic', currentPeriodStart: new Date('2026-03-01'), currentPeriodEnd: new Date('2026-04-01') },
  'pro', 'monthly', new Date('2026-03-11'),
);
// totalDays=31, remainingDays=21
// oldRemainingValue = 0.1/31*21 = 0.0677
// amount = max(0, round((0.2 - 0.0677)*100)/100) = 0.13
assert('基础版→Pro差价', r3.amount, 0.13);
assertBool('非续费', r3.isRenewal, false);
assertDate('新周期从现在开始', r3.periodEnd, new Date('2026-04-11'));

// ==================== 场景 4：升级（月付基础版 → 月付Max） ====================
console.log('\n⬆️  场景 4：升级（月付基础版 → 月付Max）');

const r4 = calculateUpgradePrice(
  { planType: 'basic', currentPeriodStart: new Date('2026-03-01'), currentPeriodEnd: new Date('2026-04-01') },
  'max', 'monthly', new Date('2026-03-11'),
);
// oldRemainingValue = 0.1/31*21 = 0.0677
// amount = max(0, round((0.4 - 0.0677)*100)/100) = 0.33
assert('基础版→Max差价', r4.amount, 0.33);

// ==================== 场景 5：升级（月付Pro → 月付Max） ====================
console.log('\n⬆️  场景 5：升级（月付Pro → 月付Max）');

const r5 = calculateUpgradePrice(
  { planType: 'pro', currentPeriodStart: new Date('2026-03-01'), currentPeriodEnd: new Date('2026-04-01') },
  'max', 'monthly', new Date('2026-03-16'),
);
// totalDays=31, remainingDays=16
// oldRemainingValue = 0.2/31*16 = 0.1032
// amount = max(0, round((0.4 - 0.1032)*100)/100) = 0.30
assert('Pro→Max差价（16天剩余）', r5.amount, 0.30);
assertDate('新周期从现在开始', r5.periodEnd, new Date('2026-04-16'));

// ==================== 场景 6：升级（年付基础版 → 年付Pro） ====================
console.log('\n⬆️  场景 6：升级（年付基础版 → 年付Pro）');

const r6 = calculateUpgradePrice(
  { planType: 'basic', currentPeriodStart: new Date('2026-01-01'), currentPeriodEnd: new Date('2027-01-01') },
  'pro', 'yearly', new Date('2026-03-28'),
);
// totalDays=365, remainingDays=279
// oldRemainingValue = 1/365*279 = 0.7644
// amount = max(0, round((2 - 0.7644)*100)/100) = 1.24
assert('年付基础版→年付Pro差价', r6.amount, 1.24);
assertDate('新周期从现在开始', r6.periodEnd, new Date('2027-03-28'));

// ==================== 场景 7：升级当天（剩余天数=总天数） ====================
console.log('\n⬆️  场景 7：开通当天就升级');

const r7 = calculateUpgradePrice(
  { planType: 'basic', currentPeriodStart: new Date('2026-03-28'), currentPeriodEnd: new Date('2026-04-28') },
  'pro', 'monthly', new Date('2026-03-28'),
);
// totalDays=31, remainingDays=31
// oldRemainingValue = 0.1/31*31 = 0.1
// amount = 0.2 - 0.1 = 0.10
assert('当天升级差价=全价差', r7.amount, 0.10);

// ==================== 场景 8：最后一天升级 ====================
console.log('\n⬆️  场景 8：到期前1天升级');

const r8 = calculateUpgradePrice(
  { planType: 'basic', currentPeriodStart: new Date('2026-03-01'), currentPeriodEnd: new Date('2026-04-01') },
  'max', 'monthly', new Date('2026-03-31'),
);
// totalDays=31, remainingDays=1
// oldRemainingValue = 0.1/31*1 = 0.0032
// amount = max(0, round((0.4 - 0.0032)*100)/100) = 0.40
assert('最后1天升级差价≈全价', r8.amount, 0.40);

// ==================== 场景 9：已过期用户重新购买 ====================
console.log('\n📦 场景 9：已过期用户');

const r9 = calculateUpgradePrice(
  { planType: 'pro', currentPeriodStart: new Date('2026-02-01'), currentPeriodEnd: new Date('2026-03-01') },
  'pro', 'monthly', now, // 3月28日，已过期
);
assert('过期用户买Pro=全价', r9.amount, 0.2);
assertBool('非续费', r9.isRenewal, false);
assertDate('从今天开始', r9.periodEnd, new Date('2026-04-28'));

// ==================== 场景 10：addMonths 月末溢出修复 ====================
console.log('\n📅 场景 10：自然月边界（addMonths 月末修复）');

const jan31 = addMonths(new Date('2026-01-31'), 1);
assertDate('1月31日 + 1月 = 2月28日', jan31, new Date('2026-02-28'));

const mar31 = addMonths(new Date('2026-03-31'), 1);
assertDate('3月31日 + 1月 = 4月30日', mar31, new Date('2026-04-30'));

const may31 = addMonths(new Date('2026-05-31'), 1);
assertDate('5月31日 + 1月 = 6月30日', may31, new Date('2026-06-30'));

const jan30 = addMonths(new Date('2026-01-30'), 1);
assertDate('1月30日 + 1月 = 2月28日', jan30, new Date('2026-02-28'));

const mar15 = addMonths(new Date('2026-03-15'), 1);
assertDate('3月15日 + 1月 = 4月15日（无溢出）', mar15, new Date('2026-04-15'));

// ==================== 场景 11：月付升级为年付（跨周期类型） ====================
console.log('\n⬆️  场景 11：月付基础版 → 年付Pro');

const r11 = calculateUpgradePrice(
  { planType: 'basic', currentPeriodStart: new Date('2026-03-01'), currentPeriodEnd: new Date('2026-04-01') },
  'pro', 'yearly', new Date('2026-03-11'),
);
// totalDays=31, remainingDays=21
// oldRemainingValue = 0.1/31*21 = 0.0677
// newPrice = 2（年付全价）
// amount = max(0, round((2 - 0.0677)*100)/100) = 1.93
assert('月付基础版→年付Pro差价', r11.amount, 1.93);
assertDate('新周期12个月', r11.periodEnd, new Date('2027-03-11'));

// ==================== 场景 12：体验期用户升级 ====================
console.log('\n🎁 场景 12：体验期用户购买基础版');

const r12 = calculateUpgradePrice(
  { planType: 'basic', currentPeriodStart: new Date('2026-03-26'), currentPeriodEnd: new Date('2026-03-29') },
  'basic', 'monthly', new Date('2026-03-28'),
);
// 体验期 basic 未到期，同级续费
assert('体验期续费=全价', r12.amount, 0.1);
assertBool('是续费', r12.isRenewal, true);
assertDate('从体验到期日延续', r12.periodEnd, new Date('2026-04-29'));

// ==================== 场景 13：体验期用户升级Pro ====================
console.log('\n🎁 场景 13：体验期用户升级Pro');

const r13 = calculateUpgradePrice(
  { planType: 'basic', currentPeriodStart: new Date('2026-03-26'), currentPeriodEnd: new Date('2026-03-29') },
  'pro', 'monthly', new Date('2026-03-28'),
);
// totalDays=3, remainingDays=1
// oldRemainingValue = 0.1/3*1 = 0.0333
// amount = max(0, round((0.2 - 0.0333)*100)/100) = 0.17
assert('体验期升级Pro差价', r13.amount, 0.17);

// ==================== 场景 14：同级月付切年付 ====================
console.log('\n🔄 场景 14：Pro月付 → Pro年付（同级换周期）');

const r14 = calculateUpgradePrice(
  { planType: 'pro', currentPeriodStart: new Date('2026-03-01'), currentPeriodEnd: new Date('2026-04-01') },
  'pro', 'yearly', new Date('2026-03-28'),
);
assert('同级换年付=年付全价', r14.amount, 2);
assertBool('是续费', r14.isRenewal, true);
assertDate('从到期日延续12个月', r14.periodEnd, new Date('2027-04-01'));

// ==================== 场景 15：差价极小（接近0） ====================
console.log('\n⚠️  场景 15：差价极小');

// Pro → Max，只剩1天
const r15 = calculateUpgradePrice(
  { planType: 'pro', currentPeriodStart: new Date('2026-03-01'), currentPeriodEnd: new Date('2026-04-01') },
  'max', 'monthly', new Date('2026-03-31'),
);
// totalDays=31, remainingDays=1
// oldRemainingValue = 0.2/31*1 = 0.00645
// amount = max(0, round((0.4 - 0.00645)*100)/100) = 0.39
assert('极小剩余值→接近全价', r15.amount, 0.39);

// ==================== 场景 16：正式价格测试 ====================
console.log('\n💰 场景 16：正式价格验算');

// 用正式价格手动验算
const REAL_PRICES = { basic: 9.9, pro: 19.9, max: 39.9 };
// 基础版月付 → Pro月付，用了10天（31天周期）
const realOldRemaining = (REAL_PRICES.basic / 31) * 21; // 6.7065
const realDiff = Math.round((REAL_PRICES.pro - realOldRemaining) * 100) / 100; // 13.19
console.log(`  ℹ️  正式价格：基础版→Pro（用10天后升级）差价 = ¥${realDiff}`);
assert('正式价格基础版→Pro差价', realDiff, 13.19);

// Pro月付 → Max月付，用了15天
const realOldRemaining2 = (REAL_PRICES.pro / 31) * 16; // 10.2710
const realDiff2 = Math.round((REAL_PRICES.max - realOldRemaining2) * 100) / 100; // 29.63
console.log(`  ℹ️  正式价格：Pro→Max（用15天后升级）差价 = ¥${realDiff2}`);
assert('正式价格Pro→Max差价', realDiff2, 29.63);

// ==================== 场景 17：降级套餐走升级路径应返回全价 ====================
console.log('\n⬇️  场景 17：降级不退款');

// Max → basic（降级不应走升级折算，实际UI会禁止，但算法应正确）
const r17 = calculateUpgradePrice(
  { planType: 'max', currentPeriodStart: new Date('2026-03-01'), currentPeriodEnd: new Date('2026-04-01') },
  'basic', 'monthly', new Date('2026-03-15'),
);
// oldRemainingValue = 0.4/31*17 = 0.2194
// amount = max(0, round((0.1 - 0.2194)*100)/100) = 0（不退款）
assert('降级差价=0（不退款）', r17.amount, 0);

// ==================== 结果 ====================
console.log(`\n${'='.repeat(40)}`);
console.log(`测试结果：${passed} 通过, ${failed} 失败`);
if (failed > 0) process.exit(1);
