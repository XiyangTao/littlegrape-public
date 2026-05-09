/**
 * 订单路由
 * 套餐购买、订单管理、支付回调
 */

import { Router, Request, Response } from 'express';
import { getPlanList, calculateUpgradePrice } from '@/services/quotaService';
import {
  createOrder,
  getOrder,
  getUserOrders,
  simulatePayment,
  handlePaymentSuccess,
  checkOrderPayment,
} from '@/services/orderService';
import { alipaySdk } from '@/config/alipay';
import { logger } from '@/utils/logger';
import { config } from '@/config';

const router = Router();

/**
 * 获取套餐列表
 * GET /api/order/plans
 */
router.get('/plans', async (_req: Request, res: Response): Promise<void> => {
  try {
    const plans = getPlanList();
    res.json({ success: true, data: plans });
  } catch (error: unknown) {
    logger.error('获取套餐列表失败:', error);
    res.status(500).json({ success: false, error: '获取套餐列表失败' });
  }
});

/**
 * 计算升级/续费价格
 * GET /api/order/price?planType=pro&billingCycle=monthly
 */
router.get('/price', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const { planType, billingCycle = 'monthly' } = req.query as { planType: string; billingCycle?: string };
    if (!planType) {
      res.status(400).json({ success: false, error: '缺少 planType' });
      return;
    }

    const result = await calculateUpgradePrice(userId, planType as any, billingCycle as any);
    res.json({
      success: true,
      data: {
        amount: result.amount,
        periodEnd: result.periodEnd.toISOString(),
        isRenewal: result.isRenewal,
      },
    });
  } catch (error: unknown) {
    logger.error('计算价格失败:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '计算价格失败',
    });
  }
});

/**
 * 创建订单
 * POST /api/order/create
 * Body: { planType: string, billingCycle: string, paymentMethod: string }
 */
router.post('/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const { planType, billingCycle = 'monthly', paymentMethod } = req.body;
    if (!planType || !paymentMethod) {
      res.status(400).json({ success: false, error: '缺少必要参数' });
      return;
    }

    const { order, orderString } = await createOrder({ userId, planType, billingCycle, paymentMethod });

    res.json({
      success: true,
      data: {
        order,
        orderString, // 支付宝 App 支付签名串，客户端调用 Alipay.pay(orderString)
      },
    });
  } catch (error: unknown) {
    logger.error('创建订单失败:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '创建订单失败',
    });
  }
});

/**
 * 查询用户订单列表
 * GET /api/order/list
 */
router.get('/list', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const orders = await getUserOrders(userId);
    res.json({ success: true, data: orders });
  } catch (error: unknown) {
    logger.error('查询订单列表失败:', error);
    res.status(500).json({ success: false, error: '查询订单列表失败' });
  }
});

/**
 * 查询订单详情
 * GET /api/order/:id
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const order = await getOrder(req.params.id, userId);
    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' });
      return;
    }

    res.json({ success: true, data: order });
  } catch (error: unknown) {
    logger.error('查询订单失败:', error);
    res.status(500).json({ success: false, error: '查询订单失败' });
  }
});

/**
 * 查询订单支付状态（客户端轮询）
 * GET /api/order/:id/check-pay
 * 如果后端未收到支付宝回调，会主动查询支付宝确认
 */
router.get('/:id/check-pay', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const result = await checkOrderPayment(req.params.id, userId);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logger.error('查询订单支付状态失败:', error);
    res.status(500).json({ success: false, error: '查询失败' });
  }
});

/**
 * 支付宝异步通知回调
 * POST /api/order/alipay/notify
 * 注意：此接口不需要认证
 */
router.post('/alipay/notify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { out_trade_no, trade_no, trade_status } = req.body;

    logger.info(`[Alipay] 收到异步通知: orderNo=${out_trade_no}, status=${trade_status}`);

    // 验证支付宝签名
    const signVerified = alipaySdk.checkNotifySign(req.body);
    if (!signVerified) {
      logger.error('[Alipay] 签名验证失败，拒绝处理');
      res.send('fail');
      return;
    }

    if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
      const success = await handlePaymentSuccess(out_trade_no, trade_no);
      res.send(success ? 'success' : 'fail');
    } else {
      res.send('success'); // 非支付成功状态也返回 success 避免重复通知
    }
  } catch (error: unknown) {
    logger.error('[Alipay] 处理通知失败:', error);
    res.send('fail');
  }
});

/**
 * 模拟支付成功（仅开发环境）
 * POST /api/order/:id/simulate-pay
 */
router.post('/:id/simulate-pay', async (req: Request, res: Response): Promise<void> => {
  try {
    if (config.server.runtimeEnv === 'production') {
      res.status(403).json({ success: false, error: '生产环境不可用' });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const success = await simulatePayment(req.params.id, userId);
    if (!success) {
      res.status(400).json({ success: false, error: '模拟支付失败' });
      return;
    }

    res.json({ success: true, data: { message: '支付成功' } });
  } catch (error: unknown) {
    logger.error('模拟支付失败:', error);
    res.status(500).json({ success: false, error: '模拟支付失败' });
  }
});

export default router;
