/**
 * 订单服务
 * 管理套餐购买订单的创建、查询、支付回调处理
 */

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { formatDateTimeCN } from '@/utils/dateUtils';
import { config } from '@/config';
import { alipaySdk } from '@/config/alipay';
import { calculateUpgradePrice, upgradeUserPlan, scheduleRenewal, getActiveSubscription } from './quotaService';

// ==================== 常量 ====================

const ORDER_EXPIRE_MINUTES = 30;

// ==================== 类型定义 ====================

export type BillingCycle = 'monthly' | 'yearly';

export interface CreateOrderParams {
  userId: string;
  planType: string;
  billingCycle: BillingCycle;
  paymentMethod: string;
}

export interface OrderInfo {
  id: string;
  orderNo: string;
  planType: string;
  planName: string;
  billingCycle: string;
  amount: number;
  status: string;
  paymentMethod: string | null;
  createdAt: Date;
  expiredAt: Date;
  paidAt: Date | null;
}

// ==================== 工具函数 ====================

/** 生成订单号：LG + 北京时间戳(YYMMDDHHmmss) + 随机数 */
function generateOrderNo(): string {
  const rand = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `LG${formatDateTimeCN()}${rand}`;
}

// ==================== 核心功能 ====================

/**
 * 创建订单
 */
export async function createOrder(params: CreateOrderParams): Promise<{ order: OrderInfo; orderString: string | null }> {
  const { userId, planType, billingCycle, paymentMethod } = params;

  if (planType === 'free') {
    throw new Error('无效的套餐类型');
  }

  if (paymentMethod !== 'alipay') {
    throw new Error('暂不支持该支付方式');
  }

  // 检查是否已有待生效续费（防止重复续费，月付→年付切换除外）
  const activeSub = await getActiveSubscription(userId);
  const isCycleUpgrade = activeSub && activeSub.billingCycle === 'monthly' && billingCycle === 'yearly' && activeSub.planType === planType;

  const scheduledSub = await prisma.userSubscription.findFirst({
    where: { userId, status: 'scheduled' },
  });
  if (scheduledSub && activeSub?.planType === planType && !isCycleUpgrade && activeSub.periodEnd > new Date() && !activeSub.isTrial) {
    throw new Error('您已续费，请等待当前周期到期后自动生效');
  }

  // 计算价格
  const upgradeInfo = await calculateUpgradePrice(userId, planType as any, billingCycle);
  const amount = Math.max(0.01, upgradeInfo.amount);

  // 从 Plan 缓存获取套餐信息（通过 getPlanList 间接获取）
  const fullPrice = upgradeInfo.isRenewal ? amount : upgradeInfo.amount;
  // 计算原价和折扣
  const plan = await prisma.plan.findUnique({ where: { planType } });
  if (!plan) throw new Error('无效的套餐类型');

  const originalAmount = billingCycle === 'yearly' ? Number(plan.yearlyPrice) : Number(plan.monthlyPrice);
  const discountAmount = Math.max(0, Math.round((originalAmount - amount) * 100) / 100);
  let discountReason: string | null = null;
  if (discountAmount > 0) {
    if (isCycleUpgrade) {
      discountReason = 'cycle_upgrade';
    } else if (!upgradeInfo.isRenewal) {
      discountReason = 'upgrade_prorate';
    }
  }

  const periodLabel = billingCycle === 'yearly' ? '年' : '月';
  const isUpgrade = !upgradeInfo.isRenewal && discountAmount > 0;

  // 取消该用户所有未支付的订单
  await prisma.userOrder.updateMany({
    where: { userId, status: 'pending' },
    data: { status: 'cancelled' },
  });

  const expiredAt = new Date();
  expiredAt.setMinutes(expiredAt.getMinutes() + ORDER_EXPIRE_MINUTES);

  // 生成支付宝签名串
  let orderString: string;
  const orderNo = generateOrderNo();
  try {
    const result = await alipaySdk.sdkExec('alipay.trade.app.pay', {
      bizContent: {
        out_trade_no: orderNo,
        total_amount: amount.toFixed(2),
        subject: `小葡萄${plan.name}${isUpgrade ? '(升级补差)' : ''} - ${periodLabel}付`,
        product_code: 'QUICK_MSECURITY_PAY',
        timeout_express: `${ORDER_EXPIRE_MINUTES}m`,
      },
      notify_url: config.alipay.notifyUrl,
    });
    orderString = result as string;
  } catch (error) {
    logger.error('[Order] 生成支付宝签名串失败:', error);
    throw new Error('支付通道异常，请稍后重试');
  }

  const order = await prisma.userOrder.create({
    data: {
      userId,
      orderNo,
      planType,
      billingCycle,
      originalAmount,
      amount,
      discountAmount,
      discountReason,
      periodStart: upgradeInfo.isRenewal ? null : new Date(), // 续费的周期在支付成功后确定
      periodEnd: upgradeInfo.periodEnd,
      status: 'pending',
      paymentMethod,
      expiredAt,
    },
  });

  return { order: formatOrder(order, plan.name), orderString };
}

/**
 * 查询订单详情
 */
export async function getOrder(orderId: string, userId: string): Promise<OrderInfo | null> {
  const order = await prisma.userOrder.findFirst({
    where: { id: orderId, userId },
  });

  if (!order) return null;
  return formatOrder(order);
}

/**
 * 查询用户订单列表
 */
export async function getUserOrders(userId: string, limit: number = 20): Promise<OrderInfo[]> {
  const orders = await prisma.userOrder.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return orders.map(o => formatOrder(o));
}

/**
 * 处理支付成功回调（支付宝异步通知）
 */
export async function handlePaymentSuccess(
  orderNo: string,
  paymentTradeNo: string
): Promise<boolean> {
  const order = await prisma.userOrder.findUnique({
    where: { orderNo },
  });

  if (!order) {
    logger.error(`[OrderService] 订单不存在: ${orderNo}`);
    return false;
  }

  if (order.status === 'paid') {
    logger.info(`[OrderService] 订单已支付，跳过: ${orderNo}`);
    return true;
  }

  if (order.status !== 'pending') {
    logger.error(`[OrderService] 订单状态异常: ${orderNo}, status=${order.status}`);
    return false;
  }

  if (new Date() > order.expiredAt) {
    logger.warn(`[OrderService] 订单已过期但支付宝已扣款，继续处理: ${orderNo}`);
  }

  const billingCycle = (order.billingCycle || 'monthly') as 'monthly' | 'yearly';

  try {
    await prisma.$transaction(async (tx) => {
      // 1. 更新订单状态
      await tx.userOrder.update({
        where: { id: order.id },
        data: {
          status: 'paid',
          paymentTradeNo,
          paidAt: new Date(),
        },
      });

      // 2. 判断续费 vs 升级/新购
      const activeSub = await tx.userSubscription.findFirst({
        where: { userId: order.userId, status: 'active' },
        orderBy: { createdAt: 'desc' },
      });

      const isCycleUpgrade = activeSub && activeSub.planType === order.planType && activeSub.billingCycle === 'monthly' && billingCycle === 'yearly';
      const isRenewal = activeSub
        && activeSub.planType === order.planType
        && !isCycleUpgrade
        && activeSub.periodEnd > new Date()
        && !activeSub.isTrial;

      if (isRenewal) {
        await scheduleRenewal(order.userId, order.planType as any, billingCycle, order.id, tx);
        logger.info(`[OrderService] 续费成功，待到期生效: userId=${order.userId}, plan=${order.planType}`);
      } else {
        await upgradeUserPlan(order.userId, order.planType as any, billingCycle, order.id, tx);
        logger.info(`[OrderService] 支付成功，套餐已升级: userId=${order.userId}, plan=${order.planType}`);
      }
    });

    return true;
  } catch (error) {
    logger.error(`[OrderService] 处理支付回调失败:`, error);
    return false;
  }
}

/**
 * 查询订单支付状态（客户端轮询用）
 */
export async function checkOrderPayment(orderId: string, userId: string): Promise<{ status: string; paid: boolean }> {
  const order = await prisma.userOrder.findFirst({
    where: { id: orderId, userId },
  });

  if (!order) {
    return { status: 'not_found', paid: false };
  }

  if (order.status === 'paid') {
    return { status: 'paid', paid: true };
  }
  if (order.status !== 'pending') {
    return { status: order.status, paid: false };
  }

  try {
    const queryResult: any = await alipaySdk.exec('alipay.trade.query', {
      bizContent: { out_trade_no: order.orderNo },
    });

    const tradeStatus = queryResult?.tradeStatus || queryResult?.trade_status;
    const tradeNo = queryResult?.tradeNo || queryResult?.trade_no;

    if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
      const success = await handlePaymentSuccess(order.orderNo, tradeNo || '');
      return { status: success ? 'paid' : 'processing', paid: success };
    }

    return { status: 'pending', paid: false };
  } catch (error) {
    logger.error('[OrderService] 主动查询支付宝失败:', error);
    return { status: 'pending', paid: false };
  }
}

/**
 * 模拟支付成功（开发/测试用）
 */
export async function simulatePayment(orderId: string, userId: string): Promise<boolean> {
  const order = await prisma.userOrder.findFirst({
    where: { id: orderId, userId, status: 'pending' },
  });

  if (!order) return false;

  return handlePaymentSuccess(order.orderNo, `SIM_${Date.now()}`);
}

// ==================== 格式化 ====================

function formatOrder(order: any, planName?: string): OrderInfo {
  return {
    id: order.id,
    orderNo: order.orderNo,
    planType: order.planType,
    planName: planName || order.planType,
    billingCycle: order.billingCycle,
    amount: Number(order.amount),
    status: order.status,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
    expiredAt: order.expiredAt,
    paidAt: order.paidAt,
  };
}
