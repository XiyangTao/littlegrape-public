import { Request, Response, NextFunction } from 'express';
import { AuthStrategy, createAuthMiddleware } from './auth';
import { logger } from '@/utils/logger';
import { config } from '@/config';

/**
 * HTTP方法枚举
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD'
}

/**
 * 路由认证规则
 */
export interface RouteAuthRule {
  /** 路径匹配模式 */
  path: string | RegExp;
  /** HTTP方法限制 (可选) */
  methods?: HttpMethod[];
  /** 认证策略 */
  strategy: AuthStrategy;
  /** 规则描述 */
  description?: string;
  /** 优先级 (数字越小优先级越高) */
  priority?: number;
}

/**
 * 路由守卫配置
 */
export interface RouteGuardConfig {
  /** 认证规则列表 */
  rules: RouteAuthRule[];
  /** 默认认证策略 */
  defaultStrategy: AuthStrategy;
  /** 是否启用调试日志 */
  enableDebugLog?: boolean;
}

/**
 * 默认路由守卫配置
 * 遵循安全优先原则：默认需要认证，明确配置公开路由
 */
const DEFAULT_CONFIG: RouteGuardConfig = {
  defaultStrategy: AuthStrategy.REQUIRED,
  enableDebugLog: config.server.runtimeEnv === 'development',
  rules: [
    // 完全公开的端点
    {
      path: '/health',
      strategy: AuthStrategy.PUBLIC,
      description: 'Health check endpoint',
      priority: 1
    },
    {
      path: '/api/version/check',
      methods: [HttpMethod.GET],
      strategy: AuthStrategy.PUBLIC,
      description: 'Version check endpoint',
      priority: 1
    },

    // Public authentication endpoints
    {
      path: /^\/api\/auth\/(register|login|password-reset|email|phone)\/.+/,
      methods: [HttpMethod.POST],
      strategy: AuthStrategy.PUBLIC,
      description: 'Public authentication endpoints (register, login, password-reset, etc.)',
      priority: 2
    },

    // Token-related endpoints
    {
      path: /^\/api\/auth\/token\/(refresh|verify)$/,
      methods: [HttpMethod.POST],
      strategy: AuthStrategy.PUBLIC,
      description: 'Token management endpoints',
      priority: 2
    },
    
    // 用户名可用性检查 - 公开
    {
      path: /^\/api\/user\/check\/username\/.+$/,
      methods: [HttpMethod.GET],
      strategy: AuthStrategy.PUBLIC,
      description: 'Username availability check',
      priority: 3
    },

    // 文件上传 - 公开（内部脚本使用）
    {
      path: /^\/api\/upload\//,
      strategy: AuthStrategy.PUBLIC,
      description: 'File upload endpoints (internal use)',
      priority: 3
    },

    // 支付宝异步通知回调 - 公开
    {
      path: '/api/order/alipay/notify',
      methods: [HttpMethod.POST],
      strategy: AuthStrategy.PUBLIC,
      description: 'Alipay payment notification callback',
      priority: 3
    },

    // 套餐列表 - 公开
    {
      path: '/api/order/plans',
      methods: [HttpMethod.GET],
      strategy: AuthStrategy.PUBLIC,
      description: 'Plan list endpoint',
      priority: 3
    },

    // 查看他人公开资料 - 可选认证
    {
      path: /^\/api\/user\/[^\/]+\/profile$/,
      methods: [HttpMethod.GET],
      strategy: AuthStrategy.OPTIONAL,
      description: 'View public user profiles',
      priority: 4
    },

    // 管理员接口 - 跳过 JWT 认证（路由层自带 x-admin-key 校验）
    {
      path: /^\/api\/admin\//,
      strategy: AuthStrategy.PUBLIC,
      description: 'Admin endpoints (protected by x-admin-key header)',
      priority: 3
    },

    // 所有其他API路由 - 默认需要认证
    {
      path: /^\/api\//,
      strategy: AuthStrategy.REQUIRED,
      description: 'Protected API endpoints',
      priority: 100
    }
  ]
};

/**
 * 路径匹配器
 */
class PathMatcher {
  /**
   * 检查路径是否匹配规则
   */
  static matches(requestPath: string, rulePath: string | RegExp): boolean {
    if (typeof rulePath === 'string') {
      return requestPath === rulePath;
    }
    return rulePath.test(requestPath);
  }

  /**
   * 检查HTTP方法是否匹配规则
   */
  static matchesMethod(requestMethod: string, ruleMethods?: HttpMethod[]): boolean {
    if (!ruleMethods?.length) {
      return true; // 未指定方法则匹配所有方法
    }
    return ruleMethods.includes(requestMethod.toUpperCase() as HttpMethod);
  }
}

/**
 * 路由守卫引擎
 */
class RouteGuardEngine {
  private config: RouteGuardConfig;

  constructor(config: RouteGuardConfig = DEFAULT_CONFIG) {
    this.config = { ...config };
    this.sortRulesByPriority();
  }

  /**
   * 按优先级排序规则
   */
  private sortRulesByPriority(): void {
    this.config.rules.sort((a, b) => (a.priority || 100) - (b.priority || 100));
  }

  /**
   * 查找匹配的认证规则
   */
  findMatchingRule(path: string, method: string): RouteAuthRule | null {
    for (const rule of this.config.rules) {
      if (PathMatcher.matches(path, rule.path) &&
          PathMatcher.matchesMethod(method, rule.methods)) {
        return rule;
      }
    }
    return null;
  }

  /**
   * 获取路径的认证策略
   */
  getAuthStrategy(path: string, method: string): {
    strategy: AuthStrategy;
    rule?: RouteAuthRule;
  } {
    const matchedRule = this.findMatchingRule(path, method);
    return {
      strategy: matchedRule?.strategy || this.config.defaultStrategy,
      rule: matchedRule || undefined
    };
  }

  /**
   * 记录调试信息
   */
  private logDebug(message: string, data: any): void {
    if (this.config.enableDebugLog) {
      logger.debug(message, data);
    }
  }

  /**
   * 执行路由守卫
   */
  async guard(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { path, method } = req;
    const { strategy, rule } = this.getAuthStrategy(path, method);

    // 记录守卫决策
    this.logDebug('Route guard decision', {
      path,
      method,
      strategy,
      rule: rule?.description || 'default strategy'
    });

    // 获取对应的认证中间件并执行
    const authMiddleware = createAuthMiddleware(strategy);
    return authMiddleware(req, res, next);
  }

  /**
   * 添加认证规则
   */
  addRule(rule: RouteAuthRule): void {
    this.config.rules.push(rule);
    this.sortRulesByPriority();

    this.logDebug('Added route guard rule', {
      path: rule.path.toString(),
      methods: rule.methods,
      strategy: rule.strategy,
      description: rule.description
    });
  }

  /**
   * 移除认证规则
   */
  removeRule(path: string | RegExp, methods?: HttpMethod[]): number {
    const initialLength = this.config.rules.length;

    this.config.rules = this.config.rules.filter(rule => {
      const pathMatches = rule.path.toString() === path.toString();
      const methodsMatch = !methods ||
        JSON.stringify(rule.methods?.sort()) === JSON.stringify(methods.sort());
      return !(pathMatches && methodsMatch);
    });

    const removedCount = initialLength - this.config.rules.length;

    if (removedCount > 0) {
      this.logDebug('Removed route guard rules', {
        path: path.toString(),
        methods,
        removedCount
      });
    }

    return removedCount;
  }

  /**
   * 获取所有规则 (只读)
   */
  getRules(): readonly RouteAuthRule[] {
    return Object.freeze([...this.config.rules]);
  }

  /**
   * 测试路径的认证需求
   */
  testPath(path: string, method: string = 'GET'): {
    strategy: AuthStrategy;
    rule?: RouteAuthRule;
    description?: string;
  } {
    const result = this.getAuthStrategy(path, method);
    return {
      strategy: result.strategy,
      rule: result.rule,
      description: result.rule?.description
    };
  }
}

// 全局路由守卫实例
const globalRouteGuard = new RouteGuardEngine();

/**
 * 创建路由守卫中间件
 */
export function createRouteGuard(config?: Partial<RouteGuardConfig>) {
  let guardEngine = globalRouteGuard;

  // 如果提供了自定义配置，创建新的守卫实例
  if (config) {
    const mergedConfig: RouteGuardConfig = {
      ...DEFAULT_CONFIG,
      ...config,
      rules: config.rules || DEFAULT_CONFIG.rules
    };
    guardEngine = new RouteGuardEngine(mergedConfig);
  }

  // 返回中间件函数
  return (req: Request, res: Response, next: NextFunction) =>
    guardEngine.guard(req, res, next);
}

/**
 * 默认路由守卫中间件
 */
export const routeGuard = createRouteGuard();

/**
 * 路由守卫管理器 - 用于运行时管理规则
 */
export const guardManager = {
  /**
   * 添加认证规则
   */
  addRule: (rule: RouteAuthRule) => globalRouteGuard.addRule(rule),

  /**
   * 移除认证规则
   */
  removeRule: (path: string | RegExp, methods?: HttpMethod[]) =>
    globalRouteGuard.removeRule(path, methods),

  /**
   * 获取所有规则
   */
  getRules: () => globalRouteGuard.getRules(),

  /**
   * 测试路径认证需求
   */
  testPath: (path: string, method: string = 'GET') =>
    globalRouteGuard.testPath(path, method)
};
