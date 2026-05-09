import { WebSocket } from 'ws';
import { v4 as uuid } from 'uuid';
import protobuf from 'protobufjs';
import path from 'path';
import { config } from '@/config';
import { logger } from '@/utils/logger';

// ==================== 类型定义 ====================

interface InterpretationConfig {
  sourceLanguage: string;
  targetLanguage: string;
  mode?: string; // 's2t' | 's2s'
  /** 火山 speaker_id，仅 s2s 模式生效；空则用火山默认音色 */
  speakerId?: string;
}

/** 火山引擎 AST 事件类型枚举值 */
const VolcanoEvent = {
  // 上行
  StartSession: 100,
  TaskRequest: 200,
  UpdateConfig: 201,
  FinishSession: 102,
  // 下行
  SessionStarted: 150,
  SessionFinished: 152,
  SessionFailed: 153,
  UsageResponse: 154,
  AudioMuted: 250,
  SourceSubtitleStart: 650,
  SourceSubtitleResponse: 651,
  SourceSubtitleEnd: 652,
  TranslationSubtitleStart: 653,
  TranslationSubtitleResponse: 654,
  TranslationSubtitleEnd: 655,
  TTSSentenceStart: 350,
  TTSResponse: 352,
  TTSSentenceEnd: 351,
} as const;

// ==================== 工具 ====================

/** 把 protobuf int64（long.js Long 对象 / number / string）统一转成 number */
function longToNumber(v: any): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseInt(v, 10) || 0;
  if (typeof v.toNumber === 'function') return v.toNumber();
  if (typeof v.low === 'number') {
    // 手动拼接（long.js Long 结构，足够日常毫秒/token 场景）
    return (v.high || 0) * 0x100000000 + (v.low >>> 0);
  }
  return 0;
}

// ==================== Protobuf 加载 ====================

let TranslateRequest: protobuf.Type;
let TranslateResponse: protobuf.Type;
let protoLoaded = false;

async function loadProtos(): Promise<void> {
  if (protoLoaded) return;

  const protosDir = path.join(__dirname, '../protos');
  const root = new protobuf.Root();
  root.resolvePath = (_origin, target) => path.join(protosDir, target);
  await root.load('products/understanding/ast/ast_service.proto');

  TranslateRequest = root.lookupType('data.speech.ast.TranslateRequest');
  TranslateResponse = root.lookupType('data.speech.ast.TranslateResponse');
  protoLoaded = true;
  logger.info('Volcano AST protobuf definitions loaded');
}

// ==================== Session 实现 ====================

class SimultaneousInterpretationSession {
  private clientWs: WebSocket;
  private volcanoWs: WebSocket | null = null;
  private sessionId: string;
  private connectionId: string;
  private isCleanedUp = false;

  constructor(clientWs: WebSocket) {
    this.clientWs = clientWs;
    this.sessionId = uuid();
    this.connectionId = uuid();
    this.setupClientHandlers();
  }

  private setupClientHandlers(): void {
    this.clientWs.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        switch (msg.type) {
          case 'config':
            await this.handleConfig(msg.config);
            break;
          case 'audio':
            this.handleAudio(msg.audio);
            break;
          case 'stop':
            await this.handleStop();
            break;
          default:
            logger.warn('Unknown message type from client', { type: msg.type });
        }
      } catch (err) {
        logger.error('Error handling client message:', err);
        this.sendToClient({ type: 'error', error: 'Internal error processing message' });
      }
    });

    this.clientWs.on('close', () => {
      logger.info('Client disconnected from interpretation session', { sessionId: this.sessionId });
      this.cleanup();
    });

    this.clientWs.on('error', (err) => {
      logger.error('Client WebSocket error:', err);
      this.cleanup();
    });
  }

  private async handleConfig(cfg: InterpretationConfig): Promise<void> {
    if (!cfg?.sourceLanguage || !cfg?.targetLanguage) {
      this.sendToClient({ type: 'error', error: 'sourceLanguage and targetLanguage are required' });
      return;
    }

    logger.info('Starting interpretation session', {
      sessionId: this.sessionId,
      sourceLanguage: cfg.sourceLanguage,
      targetLanguage: cfg.targetLanguage,
      mode: cfg.mode || 's2t',
      speakerId: cfg.speakerId || '(default)',
      rawCfg: cfg,
    });

    try {
      await loadProtos();
      await this.connectVolcano(cfg);
    } catch (err) {
      logger.error('Failed to start interpretation session:', err);
      this.sendToClient({ type: 'error', error: 'Failed to connect to interpretation service' });
    }
  }

  private connectVolcano(cfg: InterpretationConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const { wsUrl, appKey, accessKey, resourceId } = config.volcanoAst;

      if (!appKey || !accessKey) {
        reject(new Error('Volcano AST credentials not configured'));
        return;
      }

      const isDev = config.server.runtimeEnv === 'development';
      this.volcanoWs = new WebSocket(wsUrl, {
        headers: {
          'X-Api-App-Key': appKey,
          'X-Api-Access-Key': accessKey,
          'X-Api-Resource-Id': resourceId,
          'X-Api-Connect-Id': this.connectionId,
        },
        // 开发环境可能有代理/VPN导致SSL证书问题
        ...(isDev && { rejectUnauthorized: false }),
      });

      const connectTimeout = setTimeout(() => {
        reject(new Error('Volcano WebSocket connect timeout'));
        this.volcanoWs?.terminate();
      }, 10000);

      this.volcanoWs.on('open', () => {
        clearTimeout(connectTimeout);
        logger.info('Connected to Volcano AST', { sessionId: this.sessionId });

        // 发送 StartSession protobuf
        const mode = cfg.mode || 's2t';
        const startReq = TranslateRequest.create({
          requestMeta: { SessionID: this.sessionId },
          event: VolcanoEvent.StartSession,
          user: { uid: 'littlegrape', did: 'littlegrape-speech-service' },
          sourceAudio: { format: 'wav', rate: 16000, bits: 16, channel: 1 },
          // S2S 模式需要 target_audio 配置
          ...(mode === 's2s' && {
            targetAudio: { format: 'pcm', rate: 16000 },
          }),
          request: {
            mode,
            sourceLanguage: cfg.sourceLanguage,
            targetLanguage: cfg.targetLanguage,
            ...(cfg.speakerId ? { speakerId: cfg.speakerId } : {}),
          },
        });

        const encoded = TranslateRequest.encode(startReq).finish();
        // 诊断日志：确认 speaker_id 字段真的在序列化后的 payload 里
        const decoded = TranslateRequest.decode(encoded);
        logger.info('Sent StartSession to Volcano AST', {
          sessionId: this.sessionId,
          requestField: (decoded as any).request,
        });
        this.volcanoWs!.send(encoded);
      });

      this.volcanoWs.on('message', (data: Buffer) => {
        this.handleVolcanoResponse(data, resolve);
      });

      this.volcanoWs.on('error', (err) => {
        clearTimeout(connectTimeout);
        logger.error('Volcano WebSocket error:', err);
        reject(err);
      });

      this.volcanoWs.on('close', (code, reason) => {
        logger.info('Volcano WebSocket closed', {
          sessionId: this.sessionId,
          code,
          reason: reason?.toString(),
        });
        // 如果火山端关闭，通知客户端
        if (!this.isCleanedUp) {
          this.sendToClient({ type: 'stopped' });
        }
      });
    });
  }

  /** 处理火山引擎返回的 protobuf 响应 */
  private handleVolcanoResponse(data: Buffer, onSessionStarted?: (value: void) => void): void {
    try {
      const raw = TranslateResponse.decode(new Uint8Array(data));
      const resp = TranslateResponse.toObject(raw) as any;
      const event = resp.event as number;
      const text = (resp.text || '') as string;
      const startTime = resp.startTime as number;
      const endTime = resp.endTime as number;
      const spkChg = resp.spkChg as boolean;
      const mutedDurationMs = resp.mutedDurationMs as number;

      // 检查错误
      const responseMeta = resp.responseMeta;
      if (responseMeta?.StatusCode && responseMeta.StatusCode !== 20000000 && responseMeta.StatusCode !== 0) {
        logger.error('Volcano AST error', {
          code: responseMeta.StatusCode,
          message: responseMeta.Message,
          sessionId: this.sessionId,
        });
        this.sendToClient({
          type: 'error',
          error: responseMeta.Message || 'Interpretation service error',
          code: responseMeta.StatusCode,
        });
        return;
      }

      switch (event) {
        case VolcanoEvent.SessionStarted:
          logger.info('Volcano SessionStarted', { sessionId: this.sessionId });
          this.sendToClient({ type: 'started' });
          onSessionStarted?.();
          break;

        case VolcanoEvent.SourceSubtitleStart:
          this.sendToClient({ type: 'sourceSubtitleStart', startTime, speakerChanged: spkChg || false });
          break;

        case VolcanoEvent.SourceSubtitleResponse:
          this.sendToClient({ type: 'sourceSubtitle', text });
          break;

        case VolcanoEvent.SourceSubtitleEnd:
          this.sendToClient({ type: 'sourceSubtitleEnd', text, startTime, endTime });
          break;

        case VolcanoEvent.TranslationSubtitleStart:
          this.sendToClient({ type: 'translationSubtitleStart', startTime, speakerChanged: spkChg || false });
          break;

        case VolcanoEvent.TranslationSubtitleResponse:
          this.sendToClient({ type: 'translationSubtitle', text });
          break;

        case VolcanoEvent.TranslationSubtitleEnd:
          this.sendToClient({ type: 'translationSubtitleEnd', text, startTime, endTime });
          break;

        case VolcanoEvent.AudioMuted:
          this.sendToClient({ type: 'audioMuted', mutedDurationMs });
          break;

        case VolcanoEvent.SessionFinished:
          logger.info('Volcano SessionFinished', { sessionId: this.sessionId });
          this.sendToClient({ type: 'stopped' });
          break;

        case VolcanoEvent.SessionFailed:
          logger.error('Volcano SessionFailed', {
            sessionId: this.sessionId,
            message: responseMeta?.Message,
          });
          this.sendToClient({
            type: 'error',
            error: responseMeta?.Message || 'Session failed',
          });
          break;

        case VolcanoEvent.UsageResponse: {
          // 火山上报的精确计费数据（按 token 计费），转发给 gateway 替代客户端字节数估算。
          // 注意：Billing.DurationMsec 是 protobuf int64，在 JS 里是 Long 对象 {high, low, unsigned}，
          // 不能直接 Number()（会得到 NaN）。Items[*].Quantity 是 float，可以直接 Number()。
          const billing = responseMeta?.Billing;
          logger.info('Volcano UsageResponse', {
            sessionId: this.sessionId,
            billing,
          });
          if (billing) {
            const items = ((billing.Items ?? billing.items) || []).map((it: any) => ({
              unit: String(it.Unit ?? it.unit ?? ''),
              quantity: Number(it.Quantity ?? it.quantity ?? 0),
            }));
            this.sendToClient({
              type: 'usage',
              billing: {
                durationMs: longToNumber(billing.DurationMsec ?? billing.durationMsec),
                wordCount: longToNumber(billing.WordCount ?? billing.wordCount),
                items,
              },
            });
          }
          break;
        }

        // TTS 事件（S2S模式触发，转发给客户端播放）
        case VolcanoEvent.TTSSentenceStart:
          this.sendToClient({ type: 'ttsSentenceStart', startTime });
          break;

        case VolcanoEvent.TTSResponse: {
          // data 是 PCM 二进制音频，转 base64 发给客户端
          const audioData = resp.data;
          if (audioData) {
            const base64Audio = Buffer.isBuffer(audioData)
              ? audioData.toString('base64')
              : Buffer.from(audioData).toString('base64');
            this.sendToClient({ type: 'ttsAudio', audio: base64Audio });
          }
          break;
        }

        case VolcanoEvent.TTSSentenceEnd:
          this.sendToClient({ type: 'ttsSentenceEnd', startTime, endTime });
          break;

        default:
          logger.debug('Unhandled Volcano event', { event, sessionId: this.sessionId });
      }
    } catch (err) {
      logger.error('Error decoding Volcano response:', err);
    }
  }

  /** 接收客户端音频并转发给火山引擎 */
  private handleAudio(base64Audio: string): void {
    if (!this.volcanoWs || this.volcanoWs.readyState !== WebSocket.OPEN) {
      return; // 静默丢弃，火山还没连上
    }

    const pcmBuffer = Buffer.from(base64Audio, 'base64');

    const audioReq = TranslateRequest.create({
      event: VolcanoEvent.TaskRequest,
      sourceAudio: { binaryData: pcmBuffer },
    });

    const encoded = TranslateRequest.encode(audioReq).finish();
    this.volcanoWs.send(encoded);
  }

  /** 结束同传会话 */
  private async handleStop(): Promise<void> {
    logger.info('Stopping interpretation session', { sessionId: this.sessionId });

    if (this.volcanoWs && this.volcanoWs.readyState === WebSocket.OPEN) {
      const finishReq = TranslateRequest.create({
        event: VolcanoEvent.FinishSession,
      });
      const encoded = TranslateRequest.encode(finishReq).finish();
      this.volcanoWs.send(encoded);
    }
  }

  private sendToClient(msg: Record<string, any>): void {
    if (this.clientWs.readyState === WebSocket.OPEN) {
      this.clientWs.send(JSON.stringify(msg));
    }
  }

  private cleanup(): void {
    if (this.isCleanedUp) return;
    this.isCleanedUp = true;

    if (this.volcanoWs) {
      try {
        if (this.volcanoWs.readyState === WebSocket.OPEN) {
          // 尝试发送 FinishSession
          const finishReq = TranslateRequest.create({
            event: VolcanoEvent.FinishSession,
          });
          const encoded = TranslateRequest.encode(finishReq).finish();
          this.volcanoWs.send(encoded);
        }
        this.volcanoWs.terminate();
      } catch {
        // ignore
      }
      this.volcanoWs = null;
    }

    logger.info('Interpretation session cleaned up', { sessionId: this.sessionId });
  }
}

// ==================== 导出工厂函数 ====================

export function createSimultaneousInterpretationSession(ws: WebSocket): void {
  new SimultaneousInterpretationSession(ws);
}

export function isVolcanoAstAvailable(): boolean {
  return !!(config.volcanoAst.appKey && config.volcanoAst.accessKey);
}
