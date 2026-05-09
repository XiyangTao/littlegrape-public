/**
 * 功能权限中间件 —— 路由级 feature 守护
 *
 * 使用：
 *   router.post('/messages', requireFeature('aiChat'), handler);
 *
 * 职责：
 *   - 取 req.user.id（由 routeGuard 已注入）
 *   - 调 checkFeatureAccess 判断套餐是否包含该 feature
 *   - Free 用户 → 403 UPGRADE_REQUIRED；付费用户放行
 *
 * 与 quotaCheck 区别：
 *   - requireFeature：判"有没有这个功能"（套餐级别）
 *   - quotaCheck：判"预算够不够"（用量级别）
 *   - 两者正交，通常一起挂：
 *     router.post('/xxx', requireFeature('xxx'), quotaCheck, handler)
 */
import { Request, Response, NextFunction } from 'express';
import { checkFeatureAccess, type FeatureKey } from '@/services/featureAccessService';

export function requireFeature(feature: FeatureKey) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    const access = await checkFeatureAccess(userId, feature);
    if (!access.allowed) {
      res.status(403).json({
        success: false,
        error: 'UPGRADE_REQUIRED',
        reason: access.reason,
        feature,
      });
      return;
    }
    next();
  };
}
