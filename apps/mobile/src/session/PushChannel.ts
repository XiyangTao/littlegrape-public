/**
 * PushChannel — 用户推送 WebSocket 长连接（Session scope）
 *
 * 由 SessionContainer 持有：constructor 创建并 start，destroy 时 stop。
 *
 * Token 流转完全委托给 TokenManager：
 *   - connect() 入口用 ensureValid() —— token 缺失时自动等待 refresh
 *   - 收到 INVALID_TOKEN → invalidate(stale) → subscribe 触发自动重连
 *   - subscribe(null) → 用户失活，停止重连（AuthStore 会同时清 session）
 *
 * 不再有 authRetried / token 缺失的特殊分支 —— TokenManager 内部 singleflight
 * 自然防风暴，subscribe 模型让 token 变更与重连保持一致。
 */

import { AppState, AppStateStatus, NativeEventSubscription } from 'react-native';
import { API_GATEWAY_URL } from '@env';
import { tokenManager } from '@/auth/TokenManager';

const BASE_URL = API_GATEWAY_URL || 'http://localhost:3000';
const WS_BASE = BASE_URL.replace(/^http/, 'ws');

const MIN_RECONNECT_DELAY = 2000;
const MAX_RECONNECT_DELAY = 60000;
const PING_INTERVAL = 25000;

/** 服务端 close code：4001 = token 认证失败 */
const WS_AUTH_FAIL_CODE = 4001;

export interface PushChannelOptions {
  /** WebSocket 路径，如 '/ws/push' */
  wsPath: string;
  /** 收到业务消息（已通过认证 + 已 JSON.parse） */
  onMessage: (data: unknown) => void;
  /** 连接成功 / 回前台时调用（通常用来拉取未读） */
  onReconnect?: () => void;
}

export class PushChannel {
  private readonly options: PushChannelOptions;
  private ws: WebSocket | null = null;
  private reconnectDelay = MIN_RECONNECT_DELAY;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private appStateSub: NativeEventSubscription | null = null;
  private tokenUnsubscribe: (() => void) | null = null;
  private stopped = false;
  /** 当前连接握手用的 token —— 收到 INVALID_TOKEN 时传给 invalidate 区分 stale */
  private connectedToken: string | null = null;

  constructor(options: PushChannelOptions) {
    this.options = options;
  }

  start(): void {
    if (this.stopped) return;

    try {
      this.options.onReconnect?.();
    } catch (e) {
      console.error('[PushChannel] onReconnect 启动失败:', e);
    }

    // 订阅 token 变更：refresh 后自动重连，clear 后停止
    this.tokenUnsubscribe = tokenManager.subscribe((token) => {
      if (this.stopped) return;
      if (token === null) {
        // 用户失活 —— 关连接停重连，session 销毁路径会接着调 stop
        this.cleanup();
        return;
      }
      // token 变了：旧连接已用旧 token 鉴权，必须重连
      if (token !== this.connectedToken) {
        this.connect();
      }
    });

    this.appStateSub = AppState.addEventListener('change', this.handleAppStateChange);

    this.connect();
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;

    if (this.tokenUnsubscribe) {
      this.tokenUnsubscribe();
      this.tokenUnsubscribe = null;
    }
    if (this.appStateSub) {
      this.appStateSub.remove();
      this.appStateSub = null;
    }
    this.cleanup();
  }

  // ==================== 内部 ====================

  private handleAppStateChange = (nextState: AppStateStatus) => {
    if (this.stopped) return;
    if (nextState === 'active') {
      try {
        this.options.onReconnect?.();
      } catch (e) {
        console.error('[PushChannel] onReconnect resume 失败:', e);
      }
      this.reconnectDelay = MIN_RECONNECT_DELAY;
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.connect();
      }
    } else if (nextState.match(/inactive|background/)) {
      this.cleanup();
    }
  };

  private connect = async () => {
    if (this.stopped) return;

    let token: string;
    try {
      // 缺失时自动 refresh —— singleflight 在 TokenManager
      token = await tokenManager.ensureValid();
    } catch {
      // refresh 失败 → TokenManager 已 clear → subscribe 会收到 null 后停止
      return;
    }
    if (this.stopped) return;

    // 清理旧定时器与连接
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      try { this.ws.close(); } catch { /* ignore */ }
      this.ws = null;
    }

    const ws = new WebSocket(`${WS_BASE}${this.options.wsPath}`);
    this.ws = ws;
    this.connectedToken = token;

    let authOk = false;

    ws.onopen = () => {
      if (this.stopped) return;
      ws.send(JSON.stringify({ type: 'auth', token }));
    };

    ws.onmessage = (event: any) => {
      try {
        const data = JSON.parse(event.data);

        // 认证失败 → 让 TokenManager 决定下一步
        if (data.type === 'error' && data.code === 'INVALID_TOKEN') {
          ws.close();
          // invalidate 会触发 refresh；成功后 subscribe 收到新 token 自动重连
          tokenManager.invalidate(this.connectedToken ?? token).catch(() => {
            // 失败时 TokenManager 已 clear，subscribe 收到 null 停止
          });
          return;
        }

        if (data.type === 'error') return;
        if (data.type === 'pong') return;

        if (data.type === 'auth_ok') {
          authOk = true;
          this.reconnectDelay = MIN_RECONNECT_DELAY;

          if (this.pingTimer) clearInterval(this.pingTimer);
          this.pingTimer = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, PING_INTERVAL);
          return;
        }

        if (!authOk) return;

        try {
          this.options.onMessage(data);
        } catch (e) {
          console.error('[PushChannel] onMessage 抛错:', e);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = (event) => {
      if (this.pingTimer) {
        clearInterval(this.pingTimer);
        this.pingTimer = null;
      }
      if (this.stopped) return;
      // 认证失败不重连（已由 invalidate → subscribe 路径接管）
      if (event.code === WS_AUTH_FAIL_CODE) return;
      this.scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose 会接着 fire；幂等触发重连
      if (!this.stopped && (!this.ws || this.ws.readyState !== WebSocket.OPEN)) {
        this.scheduleReconnect();
      }
    };
  };

  private scheduleReconnect() {
    if (this.stopped) return;
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.stopped) this.connect();
    }, this.reconnectDelay);

    this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY);
  }

  private cleanup() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      try { this.ws.close(); } catch { /* ignore */ }
      this.ws = null;
    }
    this.connectedToken = null;
  }
}
