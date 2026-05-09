import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/services/authService';
import { UserService } from '@/services/userService';
import { logger } from '@/utils/logger';

// 扩展Express Request类型以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        phone?: string;
        username?: string;
        nickname?: string;
        avatar?: string;
        gender?: string;
        birthday?: string;
        bio?: string;
        isActive: boolean;
      };
    }
  }
}

/**
 * 认证策略枚举
 */
export enum AuthStrategy {
  PUBLIC = 'public',       // 完全公开，所有人都能访问
  OPTIONAL = 'optional',   // 登录用户体验更好，未登录也能基本使用
  REQUIRED = 'required'    // 必须登录才能访问，否则401
}

/**
 * 认证结果接口
 */
export interface AuthResult {
  success: boolean;
  user?: Express.Request['user'];
  error?: string;
}

/**
 * 从请求中提取Token
 */
function extractToken(req: Request): string | null {
  // 1. 优先从Authorization header中获取 Bearer Token
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 2. 从query参数中获取token (用于WebSocket等场景)
  if (req.query.token && typeof req.query.token === 'string') {
    return req.query.token;
  }

  // 3. 从cookie中获取accessToken (用于浏览器session)
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
}

/**
 * 验证用户Token并获取用户信息
 */
async function verifyUserToken(token: string): Promise<AuthResult> {
  try {
    // 验证JWT Token
    const decoded = AuthService.verifyToken(token, 'access');
    if (!decoded) {
      return {
        success: false,
        error: 'Invalid or expired access token'
      };
    }

    // 从数据库获取用户信息
    const user = await UserService.getUserById(decoded.userId);
    if (!user || !user.isActive) {
      return {
        success: false,
        error: 'User not found or inactive'
      };
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email || undefined,
        phone: user.phone || undefined,
        username: user.username || undefined,
        nickname: user.nickname || undefined,
        avatar: user.avatar || undefined,
        gender: user.gender || undefined,
        birthday: user.birthday || undefined,
        bio: user.bio || undefined,
        isActive: user.isActive
      }
    };
  } catch (error) {
    logger.error('Token verification failed:', error);
    return {
      success: false,
      error: 'Authentication failed'
    };
  }
}

/**
 * PUBLIC策略：完全公开访问
 * 不进行任何认证检查，直接放行
 */
export function publicAccess(req: Request, res: Response, next: NextFunction): void {
  next();
}

/**
 * OPTIONAL策略：可选认证
 * 如果有Token就验证，没有Token也允许访问
 * 登录用户可获得更好的体验或更多功能
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      // 没有Token，允许访问但用户为未登录状态
      return next();
    }

    const authResult = await verifyUserToken(token);
    if (authResult.success && authResult.user) {
      // Token有效，设置用户信息
      req.user = authResult.user;
    }
    // Token无效也不报错，继续执行

    next();
  } catch (error) {
    logger.error('Optional auth error:', error);
    // 可选认证失败时继续执行，不阻断请求
    next();
  }
}

/**
 * REQUIRED策略：必须认证
 * 必须提供有效Token，否则返回401
 */
export async function requiredAuth(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token is required',
        code: 'NO_TOKEN'
      });
    }

    const authResult = await verifyUserToken(token);
    if (!authResult.success) {
      return res.status(401).json({
        success: false,
        error: authResult.error || 'Authentication failed',
        code: 'INVALID_TOKEN'
      });
    }

    // 认证成功，设置用户信息
    req.user = authResult.user!;
    next();
  } catch (error) {
    logger.error('Required auth error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication system error',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * 创建认证中间件工厂函数
 * @param strategy 认证策略
 * @returns 对应的认证中间件
 */
export function createAuthMiddleware(strategy: AuthStrategy) {
  switch (strategy) {
    case AuthStrategy.PUBLIC:
      return publicAccess;
    case AuthStrategy.OPTIONAL:
      return optionalAuth;
    case AuthStrategy.REQUIRED:
      return requiredAuth;
    default:
      throw new Error(`Unknown auth strategy: ${strategy}`);
  }
}


