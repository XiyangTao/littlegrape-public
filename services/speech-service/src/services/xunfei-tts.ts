import { WebSocket } from 'ws';
import * as crypto from 'crypto';
import { config } from '@/config';
import { logger } from '@/utils/logger';

/**
 * 讯飞语音合成（流式版）WebSocket 接口
 *
 * API 文档: https://www.xfyun.cn/doc/tts/online_tts/API.html
 *
 * 特点:
 * - 流式返回音频数据
 * - 支持多种发音人
 * - 支持语速、音调、音量调节
 */

// ============ 类型定义 ============

export interface XunfeiTTSConfig {
  /** 要合成的文本 */
  text: string;
  /** 发音人 */
  voice?: string;
  /** 语速: 0-100, 默认50 */
  speed?: number;
  /** 音调: 0-100, 默认50 */
  pitch?: number;
  /** 音量: 0-100, 默认50 */
  volume?: number;
  /** 音频格式: raw(pcm), lame(mp3), speex-wb */
  audioFormat?: 'raw' | 'lame' | 'speex-wb';
  /** 采样率: 16000, 8000 */
  sampleRate?: 16000 | 8000;
}

export interface XunfeiTTSMessage {
  type: 'synthesize' | 'stop';
  config?: XunfeiTTSConfig;
}

export interface XunfeiTTSResponse {
  type: 'started' | 'audio' | 'completed' | 'error';
  requestId?: string;
  /** Base64 编码的音频数据 */
  audio?: string;
  /** 是否最后一帧 */
  isFinal?: boolean;
  error?: string;
}

// 讯飞 TTS 发音人列表
export const XUNFEI_TTS_VOICES = {
  // 中文发音人
  'zh-CN': [
    { id: 'xiaoyan', name: '小燕', gender: 'female', description: '中文女声-亲和' },
    { id: 'aisjiuxu', name: '许久', gender: 'male', description: '中文男声-成熟' },
    { id: 'aisxping', name: '小萍', gender: 'female', description: '中文女声-甜美' },
    { id: 'aisjinger', name: '小婧', gender: 'female', description: '中文女声-温柔' },
    { id: 'aisbabyxu', name: '许小宝', gender: 'male', description: '童声' }
  ],
  // 英文发音人
  'en-US': [
    { id: 'catherine', name: 'Catherine', gender: 'female', description: '英文女声' },
    { id: 'john', name: 'John', gender: 'male', description: '英文男声' }
  ]
};

// ============ 讯飞鉴权工具 ============

class XunfeiAuth {
  private appId: string;
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.appId = config.xunfei.appId;
    this.apiKey = config.xunfei.apiKey;
    this.apiSecret = config.xunfei.apiSecret;
  }

  generateAuthUrl(host: string, path: string): string {
    const date = new Date().toUTCString();

    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;

    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(signatureOrigin)
      .digest('base64');

    const authorizationOrigin = `api_key="${this.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    const authorization = Buffer.from(authorizationOrigin).toString('base64');

    const url = new URL(`wss://${host}${path}`);
    url.searchParams.set('authorization', authorization);
    url.searchParams.set('date', date);
    url.searchParams.set('host', host);

    return url.toString();
  }

  get appIdValue(): string {
    return this.appId;
  }
}

// ============ 讯飞 TTS 会话 ============

export class XunfeiTTSSession {
  private clientWs: WebSocket;
  private xunfeiWs: WebSocket | null = null;
  private sessionId: string;
  private requestId: string = '';
  private auth: XunfeiAuth;

  // 讯飞 TTS API 地址
  private static readonly API_HOST = 'tts-api.xfyun.cn';
  private static readonly API_PATH = '/v2/tts';

  constructor(ws: WebSocket) {
    this.clientWs = ws;
    this.sessionId = this.generateId('tts_session');
    this.auth = new XunfeiAuth();
    this.setupClientHandlers();

    logger.info('Xunfei TTS session created', { sessionId: this.sessionId });
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupClientHandlers(): void {
    this.clientWs.on('message', async (data: Buffer | string) => {
      try {
        const message: XunfeiTTSMessage = JSON.parse(
          typeof data === 'string' ? data : data.toString('utf-8')
        );
        await this.handleClientMessage(message);
      } catch (error) {
        logger.error('Failed to parse client message', { sessionId: this.sessionId, error });
        this.sendError('Invalid message format');
      }
    });

    this.clientWs.on('close', () => {
      logger.info('Client WebSocket closed', { sessionId: this.sessionId });
      this.cleanup();
    });

    this.clientWs.on('error', (error) => {
      logger.error('Client WebSocket error', { sessionId: this.sessionId, error });
      this.cleanup();
    });
  }

  private async handleClientMessage(message: XunfeiTTSMessage): Promise<void> {
    switch (message.type) {
      case 'synthesize':
        await this.handleSynthesize(message.config!);
        break;
      case 'stop':
        this.handleStop();
        break;
      default:
        this.sendError(`Unknown message type: ${(message as any).type}`);
    }
  }

  private async handleSynthesize(cfg: XunfeiTTSConfig): Promise<void> {
    if (!cfg.text) {
      this.sendError('text is required');
      return;
    }

    // 清理之前的连接
    this.cleanupXunfei();

    this.requestId = this.generateId('tts_req');

    logger.info('Xunfei TTS synthesize request', {
      sessionId: this.sessionId,
      requestId: this.requestId,
      textLength: cfg.text.length,
      voice: cfg.voice
    });

    // 连接讯飞 WebSocket
    await this.connectToXunfei(cfg);
  }

  private async connectToXunfei(cfg: XunfeiTTSConfig): Promise<void> {
    try {
      const authUrl = this.auth.generateAuthUrl(
        XunfeiTTSSession.API_HOST,
        XunfeiTTSSession.API_PATH
      );

      logger.debug('Connecting to Xunfei TTS', { requestId: this.requestId });

      this.xunfeiWs = new WebSocket(authUrl);

      this.xunfeiWs.on('open', () => {
        logger.info('Xunfei TTS WebSocket connected', { requestId: this.requestId });
        // 发送合成请求
        this.sendSynthesizeRequest(cfg);
        this.sendToClient({ type: 'started', requestId: this.requestId });
      });

      this.xunfeiWs.on('message', (data: Buffer | string) => {
        this.handleXunfeiMessage(data);
      });

      this.xunfeiWs.on('close', (code, reason) => {
        logger.info('Xunfei TTS WebSocket closed', {
          requestId: this.requestId,
          code,
          reason: reason.toString()
        });
      });

      this.xunfeiWs.on('error', (error) => {
        logger.error('Xunfei TTS WebSocket error', { requestId: this.requestId, error });
        this.sendError(`Connection error: ${error.message}`);
      });

    } catch (error) {
      logger.error('Failed to connect to Xunfei TTS', { requestId: this.requestId, error });
      this.sendError(`Failed to connect: ${error}`);
    }
  }

  /**
   * 发送合成请求
   */
  private sendSynthesizeRequest(cfg: XunfeiTTSConfig): void {
    if (!this.xunfeiWs) return;

    // 音频格式映射
    const aueMap: Record<string, string> = {
      'raw': 'raw',
      'lame': 'lame',
      'speex-wb': 'speex-wb'
    };

    const request = {
      common: {
        app_id: this.auth.appIdValue
      },
      business: {
        // 音频编码: raw(pcm), lame(mp3), speex-wb
        aue: aueMap[cfg.audioFormat || 'lame'] || 'lame',
        // 采样率: audio/L16;rate=16000
        auf: `audio/L16;rate=${cfg.sampleRate || 16000}`,
        // 发音人
        vcn: cfg.voice || 'xiaoyan',
        // 语速: 0-100
        speed: cfg.speed ?? 50,
        // 音量: 0-100
        volume: cfg.volume ?? 50,
        // 音调: 0-100
        pitch: cfg.pitch ?? 50,
        // 是否返回子句合成进度
        bgs: 0,
        // 文本编码
        tte: 'UTF8'
      },
      data: {
        // 文本状态: 2-一次性传输
        status: 2,
        // Base64 编码的文本
        text: Buffer.from(cfg.text, 'utf-8').toString('base64')
      }
    };

    this.xunfeiWs.send(JSON.stringify(request));

    logger.debug('Sent synthesize request to Xunfei TTS', {
      requestId: this.requestId,
      voice: cfg.voice,
      textLength: cfg.text.length
    });
  }

  /**
   * 处理停止请求
   */
  private handleStop(): void {
    logger.info('Xunfei TTS stop requested', { requestId: this.requestId });
    this.cleanupXunfei();
  }

  /**
   * 处理讯飞返回的消息
   */
  private handleXunfeiMessage(data: Buffer | string): void {
    try {
      const response = JSON.parse(typeof data === 'string' ? data : data.toString('utf-8'));

      // 检查错误
      if (response.code !== 0) {
        logger.error('Xunfei TTS API error', {
          requestId: this.requestId,
          code: response.code,
          message: response.message
        });
        this.sendError(`Xunfei error: ${response.message} (code: ${response.code})`);
        return;
      }

      // 解析音频数据
      if (response.data) {
        const audioData = response.data.audio;
        const status = response.data.status;

        if (audioData) {
          // 发送音频数据
          this.sendToClient({
            type: 'audio',
            requestId: this.requestId,
            audio: audioData,
            isFinal: status === 2
          });
        }

        if (status === 2) {
          // 合成完成
          logger.info('Xunfei TTS synthesis completed', { requestId: this.requestId });
          this.sendToClient({
            type: 'completed',
            requestId: this.requestId
          });
          this.cleanupXunfei();
        }
      }
    } catch (error) {
      logger.error('Failed to parse Xunfei TTS response', { requestId: this.requestId, error });
    }
  }

  private sendToClient(response: XunfeiTTSResponse): void {
    if (this.clientWs.readyState === WebSocket.OPEN) {
      this.clientWs.send(JSON.stringify(response));
    }
  }

  private sendError(error: string): void {
    this.sendToClient({
      type: 'error',
      error,
      requestId: this.requestId
    });
  }

  private cleanupXunfei(): void {
    if (this.xunfeiWs) {
      try {
        this.xunfeiWs.close();
      } catch (e) {
        // 忽略
      }
      this.xunfeiWs = null;
    }
  }

  private cleanup(): void {
    this.cleanupXunfei();
  }
}

/**
 * 创建讯飞 TTS 会话
 */
export function createXunfeiTTSSession(ws: WebSocket): XunfeiTTSSession {
  return new XunfeiTTSSession(ws);
}

/**
 * 获取讯飞 TTS 发音人列表
 */
export function getXunfeiTTSVoices(language?: string) {
  if (language) {
    return XUNFEI_TTS_VOICES[language as keyof typeof XUNFEI_TTS_VOICES] || [];
  }
  return XUNFEI_TTS_VOICES;
}

/**
 * 检查讯飞 TTS 是否可用
 */
export function isXunfeiTTSAvailable(): boolean {
  return !!(config.xunfei.appId && config.xunfei.apiKey && config.xunfei.apiSecret);
}
