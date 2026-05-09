import { WebSocket } from 'ws';
import * as crypto from 'crypto';
import { config } from '@/config';
import { logger } from '@/utils/logger';

/**
 * 讯飞语音听写（流式版）WebSocket 接口
 *
 * API 文档: https://www.xfyun.cn/doc/asr/voicedictation/API.html
 *
 * 特点:
 * - 实时流式识别
 * - 支持中文、英文
 * - 支持中英混合
 * - 最长支持 60 秒音频
 */

// ============ 类型定义 ============

export interface XunfeiASRConfig {
  /**
   * 语言设置:
   * - zh_cn: 中文（同时支持简单英文识别，推荐用于中英混合场景）
   * - en_us: 纯英文
   * - auto: 自动（实际使用 zh_cn，因为它支持中英混合）
   */
  language?: 'zh_cn' | 'en_us' | 'auto' | string;
  /** 是否添加标点 */
  addPunctuation?: boolean;
  /** 是否开启动态修正（前端纠错） */
  dynamicCorrection?: boolean;
}

export interface XunfeiASRMessage {
  type: 'config' | 'audio' | 'stop';
  config?: XunfeiASRConfig;
  audio?: string; // base64 编码的 PCM 音频
}

export interface XunfeiASRResponse {
  type: 'started' | 'recognizing' | 'recognized' | 'error' | 'stopped';
  requestId?: string;
  text?: string;
  /** 是否最终结果 */
  isFinal?: boolean;
  error?: string;
}

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

  /**
   * 生成讯飞 WebSocket 鉴权 URL
   */
  generateAuthUrl(host: string, path: string): string {
    const date = new Date().toUTCString();

    // 构建签名原文
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;

    // HMAC-SHA256 签名
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(signatureOrigin)
      .digest('base64');

    // 构建 authorization
    const authorizationOrigin = `api_key="${this.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    const authorization = Buffer.from(authorizationOrigin).toString('base64');

    // 构建完整 URL
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

// ============ 讯飞 ASR 会话 ============

export class XunfeiASRSession {
  private clientWs: WebSocket;
  private xunfeiWs: WebSocket | null = null;
  private sessionId: string;
  private requestId: string = '';
  private config: XunfeiASRConfig = {};
  private auth: XunfeiAuth;
  private isStarted: boolean = false;
  private isStopping: boolean = false;
  private frameIndex: number = 0;

  // 累积识别结果
  private accumulatedText: string = '';

  // 讯飞语音听写 API 地址
  private static readonly API_HOST = 'iat-api.xfyun.cn';
  private static readonly API_PATH = '/v2/iat';

  constructor(ws: WebSocket) {
    this.clientWs = ws;
    this.sessionId = this.generateId('asr_session');
    this.auth = new XunfeiAuth();
    this.setupClientHandlers();

    logger.info('Xunfei ASR session created', { sessionId: this.sessionId });
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupClientHandlers(): void {
    this.clientWs.on('message', async (data: Buffer | string) => {
      try {
        const message: XunfeiASRMessage = JSON.parse(
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

  private async handleClientMessage(message: XunfeiASRMessage): Promise<void> {
    switch (message.type) {
      case 'config':
        await this.handleConfig(message.config || {});
        break;
      case 'audio':
        this.handleAudio(message.audio || '');
        break;
      case 'stop':
        this.handleStop();
        break;
      default:
        this.sendError(`Unknown message type: ${(message as any).type}`);
    }
  }

  private async handleConfig(cfg: XunfeiASRConfig): Promise<void> {
    // 清理之前的连接
    this.cleanupXunfei();

    this.requestId = this.generateId('asr_req');
    this.config = cfg;
    this.frameIndex = 0;
    this.isStopping = false;
    this.accumulatedText = '';

    logger.info('Xunfei ASR config received', {
      sessionId: this.sessionId,
      requestId: this.requestId,
      language: cfg.language
    });

    // 连接讯飞 WebSocket
    await this.connectToXunfei();
  }

  private async connectToXunfei(): Promise<void> {
    try {
      const authUrl = this.auth.generateAuthUrl(
        XunfeiASRSession.API_HOST,
        XunfeiASRSession.API_PATH
      );

      logger.debug('Connecting to Xunfei ASR', { requestId: this.requestId });

      this.xunfeiWs = new WebSocket(authUrl);

      this.xunfeiWs.on('open', () => {
        logger.info('Xunfei ASR WebSocket connected', { requestId: this.requestId });
        this.isStarted = true;
        // 发送首帧
        this.sendFirstFrame();
        this.sendToClient({ type: 'started', requestId: this.requestId });
      });

      this.xunfeiWs.on('message', (data: Buffer | string) => {
        this.handleXunfeiMessage(data);
      });

      this.xunfeiWs.on('close', (code, reason) => {
        logger.info('Xunfei ASR WebSocket closed', {
          requestId: this.requestId,
          code,
          reason: reason.toString()
        });
        if (!this.isStopping) {
          this.sendToClient({ type: 'stopped', requestId: this.requestId });
        }
      });

      this.xunfeiWs.on('error', (error) => {
        logger.error('Xunfei ASR WebSocket error', { requestId: this.requestId, error });
        this.sendError(`Connection error: ${error.message}`);
      });

    } catch (error) {
      logger.error('Failed to connect to Xunfei ASR', { requestId: this.requestId, error });
      this.sendError(`Failed to connect: ${error}`);
    }
  }

  /**
   * 发送首帧
   */
  private sendFirstFrame(): void {
    if (!this.xunfeiWs) return;

    // 语言映射：auto 和其他未知值都使用 zh_cn（支持中英混合）
    let language = this.config.language || 'zh_cn';
    if (language === 'auto' || language === 'zh-CN' || language === 'zh') {
      language = 'zh_cn';
    } else if (language === 'en-US' || language === 'en') {
      language = 'en_us';
    }

    const firstFrame = {
      common: {
        app_id: this.auth.appIdValue
      },
      business: {
        // 语言: zh_cn(中文), en_us(英文)
        language: language,
        // 领域: iat(日常用语)
        domain: 'iat',
        // 方言: mandarin(普通话)
        accent: 'mandarin',
        // 是否添加标点
        ptt: this.config.addPunctuation !== false ? 1 : 0,
        // 动态修正（仅中文有效）
        dwa: this.config.dynamicCorrection ? 'wpgs' : undefined,
        // VAD 静音检测时间（毫秒）
        vad_eos: 3000
      },
      data: {
        status: 0, // 首帧
        format: 'audio/L16;rate=16000',
        encoding: 'raw'
      }
    };

    this.xunfeiWs.send(JSON.stringify(firstFrame));
    this.frameIndex = 1;

    logger.debug('Sent first frame to Xunfei ASR', {
      requestId: this.requestId,
      language
    });
  }

  /**
   * 处理音频数据
   */
  private handleAudio(audioBase64: string): void {
    if (!this.xunfeiWs || !this.isStarted) {
      return;
    }

    if (this.isStopping) {
      return;
    }

    try {
      const audioFrame = {
        data: {
          status: 1, // 中间帧
          format: 'audio/L16;rate=16000',
          encoding: 'raw',
          audio: audioBase64
        }
      };

      this.xunfeiWs.send(JSON.stringify(audioFrame));
      this.frameIndex++;

      if (this.frameIndex <= 3 || this.frameIndex % 50 === 0) {
        logger.debug('Sent audio frame to Xunfei ASR', {
          requestId: this.requestId,
          frameIndex: this.frameIndex
        });
      }
    } catch (error) {
      logger.error('Failed to send audio to Xunfei ASR', { requestId: this.requestId, error });
    }
  }

  /**
   * 处理停止请求
   */
  private handleStop(): void {
    if (this.isStopping) return;
    this.isStopping = true;

    logger.info('Xunfei ASR stop requested', {
      requestId: this.requestId,
      totalFrames: this.frameIndex
    });

    if (this.xunfeiWs && this.xunfeiWs.readyState === WebSocket.OPEN) {
      // 发送尾帧
      const lastFrame = {
        data: {
          status: 2, // 尾帧
          format: 'audio/L16;rate=16000',
          encoding: 'raw',
          audio: ''
        }
      };
      this.xunfeiWs.send(JSON.stringify(lastFrame));
      logger.debug('Sent last frame to Xunfei ASR', { requestId: this.requestId });
    }
  }

  /**
   * 处理讯飞返回的消息
   */
  private handleXunfeiMessage(data: Buffer | string): void {
    try {
      const response = JSON.parse(typeof data === 'string' ? data : data.toString('utf-8'));

      // 检查错误
      if (response.code !== 0) {
        logger.error('Xunfei ASR API error', {
          requestId: this.requestId,
          code: response.code,
          message: response.message
        });
        this.sendError(`Xunfei error: ${response.message} (code: ${response.code})`);
        return;
      }

      // 解析识别结果
      if (response.data && response.data.result) {
        const result = response.data.result;
        const status = response.data.status;

        // 解析文本
        const text = this.parseRecognitionResult(result);

        if (text) {
          // 动态修正模式下，需要处理 pgs 字段
          const pgs = result.pgs;
          if (pgs === 'rpl') {
            // 替换模式：用新结果替换旧结果
            const rg = result.rg || [0, 0];
            const textArr = this.accumulatedText.split('');
            textArr.splice(rg[0], rg[1] - rg[0], text);
            this.accumulatedText = textArr.join('');
          } else if (pgs === 'apd') {
            // 追加模式
            this.accumulatedText += text;
          } else {
            // 普通模式
            this.accumulatedText += text;
          }

          const isFinal = status === 2;

          this.sendToClient({
            type: isFinal ? 'recognized' : 'recognizing',
            requestId: this.requestId,
            text: this.accumulatedText,
            isFinal
          });

          if (isFinal) {
            logger.info('Xunfei ASR final result', {
              requestId: this.requestId,
              text: this.accumulatedText
            });
            this.sendToClient({ type: 'stopped', requestId: this.requestId });
          }
        }
      }
    } catch (error) {
      logger.error('Failed to parse Xunfei ASR response', { requestId: this.requestId, error });
    }
  }

  /**
   * 解析识别结果
   */
  private parseRecognitionResult(result: any): string {
    if (!result || !result.ws) {
      return '';
    }

    // 讯飞返回的结构: { ws: [{ cw: [{ w: "字" }] }] }
    let text = '';
    for (const ws of result.ws) {
      if (ws.cw && ws.cw.length > 0) {
        // 取第一个候选词（置信度最高）
        text += ws.cw[0].w || '';
      }
    }
    return text;
  }

  private sendToClient(response: XunfeiASRResponse): void {
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
    this.isStarted = false;
  }

  private cleanup(): void {
    this.cleanupXunfei();
  }
}

/**
 * 创建讯飞 ASR 会话
 */
export function createXunfeiASRSession(ws: WebSocket): XunfeiASRSession {
  return new XunfeiASRSession(ws);
}

/**
 * 检查讯飞 ASR 是否可用
 */
export function isXunfeiASRAvailable(): boolean {
  return !!(config.xunfei.appId && config.xunfei.apiKey && config.xunfei.apiSecret);
}
