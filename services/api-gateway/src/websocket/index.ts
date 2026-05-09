import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';
import { randomUUID } from 'crypto';
import { logger } from '@/utils/logger';
import { AuthService } from '@/services/authService';
import { checkQuotaAvailable } from '@/services/quotaService';
import { checkFeatureAccess, type FeatureKey } from '@/services/featureAccessService';
import { setupASRStreamProxy } from './asr-stream';
import { setupPronunciationStreamProxy } from './pronunciation-stream';
import { setupTTSStreamProxy } from './tts-stream';
import { setupTranslationStreamProxy } from './translation-stream';
import { setupInterpretationStreamProxy } from './interpretation-stream';
import { setupPushChannel } from './push-channel';
import { setupClassicsSentenceStream } from './classics-sentence-stream';

// ==================== 连接管理常量 ====================

/** 配额检查期间最大缓冲消息数（防 DoS） */
const MAX_PENDING_MESSAGES = 50;
/** 上游 WebSocket 连接超时（ms） */
const UPSTREAM_CONNECT_TIMEOUT = 10_000;
/** 首条消息认证超时（ms） */
const AUTH_TIMEOUT = 5_000;
/** 全局 WebSocket 最大连接数 */
const MAX_GLOBAL_CONNECTIONS = 5000;
/** 客户端心跳检测间隔（ms） */
const CLIENT_PING_INTERVAL = 30_000;
/** 单用户最大连接数（跨所有代理路由） */
const MAX_USER_CONNECTIONS = 10;
/** 单条消息最大负载（1MB） */
const MAX_PAYLOAD = 1_048_576;

// ==================== 共享 WebSocketServer 实例 ====================

const sharedWss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD });

// ==================== 全局连接管理 ====================

let activeConnections = 0;
/** 所有活跃的客户端 WebSocket 连接（用于 graceful shutdown） */
const activeClientSockets = new Set<WebSocket>();
/** 用户连接跟踪（userId → WebSocket 集合） */
const userConnectionMap = new Map<string, Set<WebSocket>>();

export function getActiveConnectionCount() {
  return activeConnections;
}

/** 关闭所有客户端连接（用于 graceful shutdown） */
export function closeAllClientConnections() {
  for (const ws of activeClientSockets) {
    try {
      ws.close(1001, 'Server shutting down');
    } catch {
      try { ws.terminate(); } catch { /* ignore */ }
    }
  }
  activeClientSockets.clear();
  activeConnections = 0;
  userConnectionMap.clear();
}

// ==================== 用户连接数管理 ====================

function trackUserConnection(userId: string, ws: WebSocket) {
  if (!userConnectionMap.has(userId)) {
    userConnectionMap.set(userId, new Set());
  }
  userConnectionMap.get(userId)!.add(ws);
}

function untrackUserConnection(userId: string, ws: WebSocket) {
  const conns = userConnectionMap.get(userId);
  if (conns) {
    conns.delete(ws);
    if (conns.size === 0) userConnectionMap.delete(userId);
  }
}

function isUserOverLimit(userId: string): boolean {
  return (userConnectionMap.get(userId)?.size ?? 0) >= MAX_USER_CONNECTIONS;
}

// ==================== 类型定义 ====================

interface WebSocketRoute {
  path: string;
  handler: (ws: WebSocket, request: any) => void;
}

interface WebSocketProxyRoute {
  path: string;
  target: string;
}

/** 流式代理路由配置（统一：配额检查 + 用量统计 + 双向转发） */
export interface StreamRouteConfig {
  path: string;
  target: string;
  /** 日志标签（如 'ASR', 'TTS'） */
  label: string;
  /** 是否将客户端 query 参数转发到上游 */
  forwardQueryString?: boolean;
  /** 可选：该 WS 对应的 feature key；config 消息时会检查用户套餐是否包含此 feature */
  requiredFeature?: FeatureKey;
  /** 从解析后的消息中提取用量数值（客户端→上游方向），无法提取时返回 0。metadata 为连接级共享对象，可在此写入供 onComplete 读取 */
  extractUsage: (message: any, metadata: Record<string, any>) => number;
  /** 可选：从上游消息（上游→客户端方向）提取用量/计费数据，直接写入 metadata，无返回值。用于上游主动上报计费（如火山 UsageResponse） */
  extractUpstreamUsage?: (message: any, metadata: Record<string, any>) => void;
  /** 连接关闭时回调，用于记录用量。metadata 为 extractUsage/extractUpstreamUsage 写入的连接级数据 */
  onComplete: (userId: string | null, totalUsage: number, metadata: Record<string, any>) => void;
}

/** 统一上游连接处理配置 */
interface UpstreamOptions {
  label: string;
  target: string;
  forwardQueryString?: boolean;
  /** 流式特性（配额检查 + 用量统计），不传则为简单代理 */
  stream?: {
    requiredFeature?: FeatureKey;
    extractUsage: (message: any, metadata: Record<string, any>) => number;
    extractUpstreamUsage?: (message: any, metadata: Record<string, any>) => void;
    onComplete: (userId: string | null, totalUsage: number, metadata: Record<string, any>) => void;
  };
}

// ==================== 路由表 ====================

const routes: WebSocketRoute[] = [];
const proxyRoutes: WebSocketProxyRoute[] = [];
const streamRoutes: StreamRouteConfig[] = [];

// ==================== 路由注册 ====================

export function registerWebSocketRoute(path: string, handler: (ws: WebSocket, request: any) => void) {
  routes.push({ path, handler });
  logger.info(`WebSocket route registered: ${path}`);
}

export function registerWebSocketProxy(path: string, target: string) {
  proxyRoutes.push({ path, target });
  logger.info(`WebSocket proxy registered: ${path} -> ${target}`);
}

export function registerStreamHandler(config: StreamRouteConfig) {
  streamRoutes.push(config);
  logger.info(`${config.label} stream handler registered: ${config.path} -> ${config.target}`);
}

// ==================== WebSocket 服务初始化 ====================

export function setupWebSocket(httpServer: HttpServer) {
  setupASRStreamProxy();
  setupPronunciationStreamProxy();
  setupTTSStreamProxy();
  setupTranslationStreamProxy();
  setupInterpretationStreamProxy();
  setupPushChannel();
  setupClassicsSentenceStream();

  httpServer.on('upgrade', (request, socket, head) => {
    // 全局连接数限制
    if (activeConnections >= MAX_GLOBAL_CONNECTIONS) {
      logger.warn('WebSocket connection rejected: max global connections reached', { activeConnections });
      socket.destroy();
      return;
    }

    const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : '';
    logger.info('WebSocket upgrade request', { pathname });

    // 流式代理路由（带配额检查和用量统计）
    const streamRoute = streamRoutes.find(r => r.path === pathname);
    if (streamRoute) {
      handleUpstreamConnection({
        label: streamRoute.label,
        target: streamRoute.target,
        forwardQueryString: streamRoute.forwardQueryString,
        stream: {
          requiredFeature: streamRoute.requiredFeature,
          extractUsage: streamRoute.extractUsage,
          extractUpstreamUsage: streamRoute.extractUpstreamUsage,
          onComplete: streamRoute.onComplete,
        },
      }, request, socket, head);
      return;
    }

    // 简单代理路由
    const proxyRoute = proxyRoutes.find(r => r.path === pathname);
    if (proxyRoute) {
      handleUpstreamConnection({
        label: 'Proxy',
        target: proxyRoute.target,
      }, request, socket, head);
      return;
    }

    // 本地处理路由
    const route = routes.find(r => r.path === pathname);
    if (route) {
      handleLocalConnection(route, request, socket, head);
      return;
    }

    logger.warn('Unknown WebSocket path', { pathname });
    socket.destroy();
  });

  logger.info('WebSocket service initialized', {
    routes: routes.map(r => r.path),
    proxies: proxyRoutes.map(r => `${r.path} -> ${r.target}`),
    streams: streamRoutes.map(r => `${r.path} -> ${r.target}`),
  });
}

// ==================== 上游代理连接处理（统一流式 + 简单代理） ====================

/**
 * 处理上游代理连接（合并原 handleStreamConnection 与 handleProxyConnection）
 * 双模式认证（URL query token 向后兼容 + 首条 auth 消息）→ 用户连接限制 → 双向转发
 * 流式模式额外：配额检查 → 用量统计
 */
function handleUpstreamConnection(options: UpstreamOptions, request: any, socket: any, head: Buffer) {
  const connId = randomUUID().slice(0, 8);
  const clientUrl = new URL(request.url, `http://${request.headers.host}`);

  // 双模式认证第一步：尝试 URL query token（已弃用，向后兼容）
  const urlToken = clientUrl.searchParams.get('token');
  let userId: string | null = null;
  let authenticated = false;

  if (urlToken) {
    logger.info(`${options.label} using deprecated URL token auth, please migrate to message auth`, { connId });
    const decoded = AuthService.verifyToken(urlToken, 'access');
    if (decoded) {
      userId = decoded.userId;
      authenticated = true;
    } else {
      logger.warn(`${options.label} connection rejected: invalid URL token`, { connId });
      socket.destroy();
      return;
    }
  }

  // 构造上游 URL，转发 query 参数时剥离 token
  let targetUrl = options.target;
  if (options.forwardQueryString) {
    const upstreamParams = new URLSearchParams(clientUrl.searchParams);
    upstreamParams.delete('token');
    const qs = upstreamParams.toString();
    targetUrl += qs ? `?${qs}` : '';
  }

  logger.info(`${options.label} connecting`, { connId, target: targetUrl, userId: userId || 'pending-auth' });

  // 先升级客户端连接
  sharedWss.handleUpgrade(request, socket, head, (clientWs) => {
    activeConnections++;
    activeClientSockets.add(clientWs);
    if (authenticated && userId) trackUserConnection(userId, clientWs);

    let upstream: WebSocket | null = null;
    let upstreamReady = false;
    let pendingMessages: any[] = [];
    let closed = false; // 防止 close + error 双重触发导致计数器异常

    // 流式特性状态
    let totalUsage = 0;
    const streamMetadata: Record<string, any> = {}; // 连接级 metadata
    let quotaCheckPending = false;
    let quotaBlocked = false;
    let usageRecorded = false;

    // 心跳检测：检测客户端死连接
    let isAlive = true;
    clientWs.on('pong', () => { isAlive = true; });
    const heartbeatTimer = setInterval(() => {
      if (clientWs.readyState !== WebSocket.OPEN) {
        clearInterval(heartbeatTimer);
        return;
      }
      if (!isAlive) {
        logger.info(`${options.label} client no pong, closing`, { connId, userId });
        clientWs.terminate();
        return;
      }
      isAlive = false;
      clientWs.ping();
    }, CLIENT_PING_INTERVAL);

    const recordUsageOnce = () => {
      if (!options.stream || !userId) return;
      if (usageRecorded) {
        // 幂等保护：同一会话被多处触发（error/close/cleanup）只扣一次
        logger.debug(`${options.label} recordUsageOnce skipped (already recorded)`, { connId, userId });
        return;
      }
      usageRecorded = true;
      options.stream.onComplete(userId, totalUsage, streamMetadata);
    };

    // 首条消息认证超时（仅无 URL token 时启用）
    let authTimer: NodeJS.Timeout | null = null;
    if (!authenticated) {
      authTimer = setTimeout(() => {
        if (!authenticated && clientWs.readyState === WebSocket.OPEN) {
          logger.warn(`${options.label} auth timeout`, { connId });
          clientWs.send(JSON.stringify({ type: 'error', code: 'AUTH_TIMEOUT', error: '认证超时' }));
          clientWs.close(4001, 'Auth timeout');
        }
      }, AUTH_TIMEOUT);
    }

    /** 将缓冲的消息全部转发到上游 */
    const flushPending = () => {
      for (const msg of pendingMessages) {
        if (upstream?.readyState === WebSocket.OPEN) upstream.send(msg);
      }
      pendingMessages = [];
    };

    /** 连接上游服务 */
    const connectUpstream = () => {
      // 用户连接数限制检查
      if (userId && isUserOverLimit(userId)) {
        logger.warn(`${options.label} user connection limit exceeded`, { connId, userId, limit: MAX_USER_CONNECTIONS });
        clientWs.send(JSON.stringify({ type: 'error', error: '连接数超限，请稍后重试' }));
        clientWs.close(4003, 'Too many connections');
        return;
      }

      upstream = new WebSocket(targetUrl);

      const upstreamTimer = setTimeout(() => {
        if (upstream && upstream.readyState !== WebSocket.OPEN) {
          logger.error(`${options.label} upstream connect timeout`, { connId, target: targetUrl, userId });
          upstream.terminate();
          clientWs.close();
        }
      }, UPSTREAM_CONNECT_TIMEOUT);

      upstream.on('open', () => {
        clearTimeout(upstreamTimer);
        upstreamReady = true;
        logger.info(`${options.label} upstream connected`, { connId, userId });
        flushPending();
      });

      // 上游 → 客户端
      upstream.on('message', (data) => {
        const message = Buffer.isBuffer(data) ? data.toString('utf-8') : String(data);
        // 上游计费上报 hook（如火山 AST 的 UsageResponse），先解析后透传
        if (options.stream?.extractUpstreamUsage) {
          try {
            const msg = JSON.parse(message);
            options.stream.extractUpstreamUsage(msg, streamMetadata);
          } catch { /* 非 JSON 或二进制，忽略 */ }
        }
        if (clientWs.readyState === WebSocket.OPEN) clientWs.send(message);
      });

      upstream.on('close', () => {
        clearTimeout(upstreamTimer);
        clientWs.close();
      });

      upstream.on('error', (err) => {
        clearTimeout(upstreamTimer);
        logger.error(`${options.label} upstream error`, { connId, userId, error: err.message });
        recordUsageOnce();
        clientWs.close();
      });
    };

    // 客户端 → 上游
    clientWs.on('message', (data) => {
      if (quotaBlocked) return;

      // 认证阶段：首条消息必须为 auth
      if (!authenticated) {
        try {
          const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
          const msg = JSON.parse(buf.toString('utf-8'));
          if (msg.type === 'auth' && msg.token) {
            const decoded = AuthService.verifyToken(msg.token, 'access');
            if (decoded) {
              authenticated = true;
              userId = decoded.userId;
              if (authTimer) { clearTimeout(authTimer); authTimer = null; }
              trackUserConnection(userId, clientWs);
              logger.info(`${options.label} authenticated via message`, { connId, userId });
              connectUpstream();
            } else {
              logger.warn(`${options.label} invalid auth token via message`, { connId });
              clientWs.send(JSON.stringify({ type: 'error', code: 'INVALID_TOKEN', error: '无效的认证令牌' }));
              clientWs.close(4001, 'Invalid token');
            }
          } else {
            clientWs.send(JSON.stringify({ type: 'error', code: 'AUTH_REQUIRED', error: '请先发送认证消息' }));
            clientWs.close(4001, 'Auth required');
          }
        } catch {
          clientWs.close(4001, 'Invalid message');
        }
        return;
      }

      // 流式模式：用量统计 + config 消息配额检查
      if (options.stream) {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
        try {
          const msg = JSON.parse(buf.toString('utf-8'));

          // 先让 extractUsage 抓取元信息（如 mode、config 里的其他字段），
          // 再决定是否走配额检查分支。否则 config 消息被下面 return 截断后 metadata 会丢失。
          const earlyUsage = options.stream.extractUsage(msg, streamMetadata);
          totalUsage += (Number.isFinite(earlyUsage) ? earlyUsage : 0);

          // 首条 config 消息触发配额检查
          if (msg.type === 'config' && userId && !quotaCheckPending) {
            quotaCheckPending = true;
            const uid: string = userId; // 捕获到局部变量，保证异步回调里的类型收窄稳定
            // 先检查 feature（套餐级别）；Free 用户直接拒，不进入后续配额流程
            const requiredFeature = options.stream.requiredFeature;
            const featurePromise = requiredFeature
              ? checkFeatureAccess(uid, requiredFeature).then(access => {
                  if (!access.allowed) {
                    quotaCheckPending = false;
                    quotaBlocked = true;
                    logger.info(`${options.label} feature upgrade required`, { connId, userId, feature: requiredFeature });
                    clientWs.send(JSON.stringify({
                      type: 'error',
                      error: 'UPGRADE_REQUIRED',
                      upgradeRequired: true,
                    }));
                    clientWs.close();
                    if (upstream) upstream.close();
                    return false;
                  }
                  return true;
                })
              : Promise.resolve(true);

            featurePromise.then(featureOk => {
              if (!featureOk) return;
              checkQuotaAvailable(uid).then(result => {
                quotaCheckPending = false;
                if (!result.available) {
                  quotaBlocked = true;
                  logger.info(`${options.label} quota exceeded`, { connId, userId: uid });
                  clientWs.send(JSON.stringify({ type: 'error', error: result.message, quotaExceeded: true }));
                  clientWs.close();
                  if (upstream) upstream.close();
                  return;
                }
                // 配额通过：转发 config + 缓冲消息
                if (upstreamReady && upstream?.readyState === WebSocket.OPEN) {
                  upstream.send(data);
                  flushPending();
                } else {
                  pendingMessages.unshift(data);
                }
              }).catch((err) => {
                quotaCheckPending = false;
                quotaBlocked = true;
                logger.error(`${options.label} quota check failed, rejecting`, { connId, userId: uid, error: err.message });
                clientWs.send(JSON.stringify({ type: 'error', error: '系统繁忙，请稍后重试' }));
                clientWs.close();
                if (upstream) upstream.close();
              });
            }).catch((err) => {
              // checkFeatureAccess 内部 DB 异常（如数据库不可用）走此分支
              quotaCheckPending = false;
              quotaBlocked = true;
              logger.error(`${options.label} feature check failed, rejecting`, { connId, userId: uid, error: err.message });
              clientWs.send(JSON.stringify({ type: 'error', error: '系统繁忙，请稍后重试' }));
              clientWs.close();
              if (upstream) upstream.close();
            });
            return;
          }
          // 非 config 或已经检查过配额的消息：extractUsage 已在上面调过，不重复
        } catch {
          // 非 JSON 数据（二进制），忽略用量统计
        }
      }

      // 配额检查或上游连接进行中，缓冲消息（带上限保护）
      if (quotaCheckPending || !upstreamReady) {
        if (pendingMessages.length >= MAX_PENDING_MESSAGES) {
          logger.warn(`${options.label} pending buffer full, dropping message`, { connId, userId });
          return;
        }
        pendingMessages.push(data);
        return;
      }

      if (upstream?.readyState === WebSocket.OPEN) {
        upstream.send(data);
      }
    });

    // 幂等清理函数（防止 close + error 双重触发导致计数器异常）
    const cleanup = () => {
      if (closed) return;
      closed = true;
      activeConnections = Math.max(0, activeConnections - 1);
      activeClientSockets.delete(clientWs);
      if (userId) untrackUserConnection(userId, clientWs);
      if (authTimer) clearTimeout(authTimer);
      clearInterval(heartbeatTimer);
      recordUsageOnce();
      if (upstream) upstream.close();
    };

    clientWs.on('close', cleanup);
    clientWs.on('error', (err) => {
      logger.error(`${options.label} client error`, { connId, userId, error: err.message });
      cleanup();
    });

    // 如果已通过 URL token 认证，立即连接上游
    if (authenticated) {
      connectUpstream();
    }
  });
}

// ==================== 本地路由连接处理 ====================

/** 处理本地路由连接 */
function handleLocalConnection(
  route: WebSocketRoute,
  request: any,
  socket: any,
  head: Buffer
) {
  sharedWss.handleUpgrade(request, socket, head, (ws) => {
    activeConnections++;
    activeClientSockets.add(ws);
    let closed = false;

    // 心跳检测
    let isAlive = true;
    ws.on('pong', () => { isAlive = true; });
    const heartbeatTimer = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        clearInterval(heartbeatTimer);
        return;
      }
      if (!isAlive) {
        logger.info('Local WS client no pong, closing', { path: route.path });
        ws.terminate();
        return;
      }
      isAlive = false;
      ws.ping();
    }, CLIENT_PING_INTERVAL);

    const cleanup = () => {
      if (closed) return;
      closed = true;
      activeConnections = Math.max(0, activeConnections - 1);
      activeClientSockets.delete(ws);
      clearInterval(heartbeatTimer);
    };

    ws.on('close', cleanup);
    ws.on('error', cleanup);

    logger.info('Local WebSocket connected', { path: route.path });
    route.handler(ws, request);
  });
}
