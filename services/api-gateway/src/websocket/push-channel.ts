/**
 * 统一推送 WebSocket 通道
 *
 * 合并原 achievement-channel + assistant-channel 为单一 /ws/push 通道。
 * 消息格式：{ channel, type, payload }
 */

import { WebSocket } from 'ws';
import { registerWebSocketRoute } from './index';
import { AuthService } from '@/services/authService';
import { logger } from '@/utils/logger';
import { URL } from 'url';

// userId → WebSocket 连接列表（数组保持插入顺序，踢旧连接时准确）
const connections = new Map<string, WebSocket[]>();

const MAX_CONNECTIONS_PER_USER = 5;
const AUTH_TIMEOUT = 5_000;

/** 关闭所有推送连接（graceful shutdown） */
export function closeAllPushConnections() {
  for (const [, socketList] of connections) {
    for (const ws of socketList) {
      ws.close(1001, 'Server shutting down');
    }
  }
  connections.clear();
}

/** 向指定用户推送消息 */
export function pushToUser(userId: string, channel: string, type: string, payload: any) {
  const socketList = connections.get(userId);
  if (!socketList || socketList.length === 0) return;

  const message = JSON.stringify({ channel, type, payload });
  for (const ws of socketList) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(message);
      } catch (err) {
        logger.error('Push channel send failed', { userId, channel, error: (err as Error).message });
      }
    }
  }
}

/** 检查用户是否有活跃的推送连接 */
export function isUserOnline(userId: string): boolean {
  const socketList = connections.get(userId);
  if (!socketList || socketList.length === 0) return false;
  return socketList.some(ws => ws.readyState === WebSocket.OPEN);
}

/** 认证成功后初始化连接（连接池、清理） */
function initAuthenticatedConnection(ws: WebSocket, userId: string) {
  if (!connections.has(userId)) {
    connections.set(userId, []);
  }
  const userSockets = connections.get(userId)!;

  // 超过单用户连接数上限时，关闭最旧的连接（数组头部 = 最旧）
  while (userSockets.length >= MAX_CONNECTIONS_PER_USER) {
    const oldest = userSockets.shift();
    if (oldest) oldest.close(4002, 'Too many connections');
  }

  userSockets.push(ws);
  logger.info('Push channel connected', { userId });

  // 心跳检测已由 handleLocalConnection (index.ts) 统一管理

  ws.on('close', () => {
    const socketList = connections.get(userId);
    if (socketList) {
      const idx = socketList.indexOf(ws);
      if (idx !== -1) socketList.splice(idx, 1);
      if (socketList.length === 0) connections.delete(userId);
    }
    logger.info('Push channel disconnected', { userId });
  });

  ws.on('error', (err) => {
    logger.error('Push channel error', { userId, error: err.message });
  });
}

/** 已认证连接的消息处理（仅处理 ping） */
function setupAuthenticatedMessageHandler(ws: WebSocket) {
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch {
      // ignore
    }
  });
}

/** 注册 /ws/push 路由 */
export function setupPushChannel() {
  registerWebSocketRoute('/ws/push', (ws, request) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const urlToken = url.searchParams.get('token');
    let authenticated = false;

    // URL token 认证（向后兼容）
    if (urlToken) {
      const decoded = AuthService.verifyToken(urlToken, 'access');
      if (decoded?.userId) {
        authenticated = true;
        initAuthenticatedConnection(ws, decoded.userId);
        ws.send(JSON.stringify({ type: 'auth_ok' }));
        setupAuthenticatedMessageHandler(ws);
        return;
      } else {
        ws.close(4001, 'Invalid token');
        return;
      }
    }

    // 等待首条 auth 消息
    const authTimer = setTimeout(() => {
      if (!authenticated) {
        ws.send(JSON.stringify({ type: 'error', code: 'AUTH_TIMEOUT', error: '认证超时' }));
        ws.close(4001, 'Auth timeout');
      }
    }, AUTH_TIMEOUT);

    ws.once('close', () => clearTimeout(authTimer));

    ws.on('message', function onMessage(data) {
      try {
        const msg = JSON.parse(data.toString());

        if (!authenticated) {
          if (msg.type === 'auth' && msg.token) {
            const decoded = AuthService.verifyToken(msg.token, 'access');
            if (decoded?.userId) {
              authenticated = true;
              clearTimeout(authTimer);
              ws.removeListener('message', onMessage);
              initAuthenticatedConnection(ws, decoded.userId);
              ws.send(JSON.stringify({ type: 'auth_ok' }));
              setupAuthenticatedMessageHandler(ws);
            } else {
              ws.send(JSON.stringify({ type: 'error', code: 'INVALID_TOKEN', error: '无效的认证令牌' }));
              ws.close(4001, 'Invalid token');
            }
          } else {
            ws.send(JSON.stringify({ type: 'error', code: 'AUTH_REQUIRED', error: '请先发送认证消息' }));
            ws.close(4001, 'Auth required');
          }
          return;
        }
      } catch {
        // ignore
      }
    });
  });
}
