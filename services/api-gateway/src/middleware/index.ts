// 核心认证中间件
export {
  AuthStrategy,
  publicAccess,
  optionalAuth,
  requiredAuth,
  createAuthMiddleware,
} from './auth';

// 路由守卫系统
export {
  HttpMethod,
  routeGuard,
  createRouteGuard,
  guardManager
} from './route-guard';

// 类型导出
export type {
  RouteAuthRule,
  RouteGuardConfig
} from './route-guard';