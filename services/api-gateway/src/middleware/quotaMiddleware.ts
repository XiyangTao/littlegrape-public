/**
 * 配额检查中间件
 * - 在 AI 相关路由前检查用户配额是否充足
 * - 在响应中注入 _usage 摘要，供前端 piggyback 同步实时用量（仅用量维度，不含会员）
 *
 * piggyback 只承载高频用量数据；会员维度由 GET /api/quota 权威路径 + WS subscription:updated
 * 推送独立维护 —— 避免每次接口响应都重写 planType/costBudget 这类低频强一致字段。
 */

import { Request, Response, NextFunction } from 'express';
import { checkQuotaAvailable, getUsageSummary } from '@/services/quotaService';
import { logger } from '@/utils/logger';

export async function quotaCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    // 未认证的请求交给认证中间件处理
    next();
    return;
  }

  try {
    const result = await checkQuotaAvailable(userId);

    if (!result.available) {
      res.status(429).json({
        success: false,
        error: result.message,
        quotaExceeded: true,
      });
      return;
    }

    // 注入 _usage piggyback：override res.json，在成功响应中附带实时用量摘要
    const originalJson = res.json.bind(res);
    res.json = function (data: any) {
      if (data && typeof data === 'object' && res.statusCode < 400) {
        // 异步获取实时用量摘要（Redis GET，亚毫秒级）；订阅缺失时返回 null，跳过注入
        getUsageSummary(userId).then(usage => {
          if (usage) data._usage = usage;
          originalJson(data);
        }).catch(() => {
          originalJson(data);
        });
        return res;
      }
      return originalJson(data);
    } as any;

    next();
  } catch (error) {
    // 配额检查失败时放行请求，避免因 DB 异常阻断付费用户
    logger.error('配额检查中间件异常，放行请求:', error);
    next();
  }
}
