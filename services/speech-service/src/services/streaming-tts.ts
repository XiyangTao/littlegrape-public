import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { WebSocket } from 'ws';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { ttsEngineManager } from './tts-engines';

/**
 * 流式 TTS 消息类型
 */
export interface StreamingTTSConfig {
  voice: string;        // 声音 ID（如 en-US-female-1）
  speed?: number;       // 语速 (0.5-2.0，默认 1.0)
  format?: 'mp3' | 'wav' | 'opus' | 'pcm';  // 输出格式 (pcm = 16kHz 16bit mono raw PCM)
}

export interface StreamingTTSMessage {
  type: 'config' | 'synthesize' | 'synthesize-sentences' | 'stop';
  // config 消息的配置
  config?: StreamingTTSConfig;
  // synthesize 消息的文本
  text?: string;
  // synthesize-sentences 消息的句子数组（每句前会插入 bookmark）
  sentences?: string[];
}

export interface StreamingTTSResponse {
  type: 'started' | 'audio' | 'completed' | 'error' | 'stopped' | 'bookmark';
  // audio 消息的音频数据 (base64 编码)
  audio?: string;
  // 错误信息
  error?: string;
  requestId?: string;
  // bookmark 消息
  bookmarkName?: string;
  audioOffsetMs?: number;
}

/**
 * 流式 TTS 会话管理器
 * 每个 WebSocket 连接对应一个会话
 */
export class StreamingTTSSession {
  private ws: WebSocket;
  private requestId: string;
  private synthesizer: sdk.SpeechSynthesizer | null = null;
  private speechConfig: sdk.SpeechConfig | null = null;
  private isStarted: boolean = false;
  private isSynthesizing: boolean = false;
  private config: StreamingTTSConfig = {
    voice: 'en-US-JennyNeural',
    speed: 1.0,
    format: 'mp3'
  };

  constructor(ws: WebSocket) {
    this.ws = ws;
    this.requestId = this.generateRequestId();
    this.setupWebSocketHandlers();
    logger.info('Streaming TTS session created', { requestId: this.requestId });
  }

  private generateRequestId(): string {
    return `stream_tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupWebSocketHandlers(): void {
    this.ws.on('message', async (data: Buffer | string) => {
      try {
        const message = this.parseMessage(data);
        await this.handleMessage(message);
      } catch (error) {
        this.sendError(`Failed to process message: ${error}`);
      }
    });

    this.ws.on('close', () => {
      logger.info('Streaming TTS WebSocket closed', { requestId: this.requestId });
      this.cleanup();
    });

    this.ws.on('error', (error) => {
      logger.error('Streaming TTS WebSocket error', { requestId: this.requestId, error });
      this.cleanup();
    });
  }

  private parseMessage(data: Buffer | string): StreamingTTSMessage {
    if (typeof data === 'string') {
      return JSON.parse(data);
    }
    return JSON.parse(data.toString('utf-8'));
  }

  private async handleMessage(message: StreamingTTSMessage): Promise<void> {
    switch (message.type) {
      case 'config':
        await this.handleConfig(message.config || { voice: this.config.voice });
        break;
      case 'synthesize':
        await this.handleSynthesize(message.text || '');
        break;
      case 'synthesize-sentences':
        await this.handleSynthesizeSentences(message.sentences || []);
        break;
      case 'stop':
        await this.handleStop();
        break;
      default:
        this.sendError(`Unknown message type: ${(message as any).type}`);
    }
  }

  private async handleConfig(cfg: StreamingTTSConfig): Promise<void> {
    // 查找对应的引擎 Voice ID
    const engine = ttsEngineManager.getEngine() as any;
    const voiceConfig = engine.conversationVoices?.find((v: any) => v.id === cfg.voice);
    const engineVoiceId = voiceConfig?.voiceEngineId || cfg.voice;

    this.config = {
      ...this.config,
      ...cfg,
      voice: engineVoiceId  // 使用引擎的 Voice ID
    };

    logger.info('Streaming TTS config received', {
      requestId: this.requestId,
      originalVoice: cfg.voice,
      engineVoice: engineVoiceId,
      config: this.config
    });

    // 初始化合成器
    await this.initializeSynthesizer();
  }

  private async initializeSynthesizer(): Promise<void> {
    try {
      // 创建 Speech Config
      this.speechConfig = sdk.SpeechConfig.fromSubscription(
        config.azure.speechKey,
        config.azure.speechRegion
      );

      // 设置输出格式
      const formatMap: Record<string, sdk.SpeechSynthesisOutputFormat> = {
        'mp3': sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3,
        'wav': sdk.SpeechSynthesisOutputFormat.Riff16Khz16BitMonoPcm,
        'opus': sdk.SpeechSynthesisOutputFormat.Ogg16Khz16BitMonoOpus,
        'pcm': sdk.SpeechSynthesisOutputFormat.Raw16Khz16BitMonoPcm  // 纯 PCM，无头
      };
      this.speechConfig.speechSynthesisOutputFormat =
        formatMap[this.config.format || 'mp3'] || formatMap['mp3'];

      // 创建合成器（不绑定音频输出，手动处理音频数据）
      this.synthesizer = new sdk.SpeechSynthesizer(this.speechConfig, null as any);

      // 设置流式事件处理器
      this.setupSynthesizerEvents();

      this.isStarted = true;
      logger.info('Streaming TTS synthesizer initialized', { requestId: this.requestId });
      this.sendResponse({ type: 'started', requestId: this.requestId });

    } catch (error) {
      logger.error('Failed to initialize streaming TTS', { requestId: this.requestId, error });
      this.sendError(`Failed to initialize: ${error}`);
    }
  }

  private setupSynthesizerEvents(): void {
    if (!this.synthesizer) return;

    // 流式音频数据事件 - 关键！边合成边发送
    this.synthesizer.synthesizing = (_, e) => {
      if (e.result.audioData && e.result.audioData.byteLength > 0) {
        const audioBase64 = Buffer.from(e.result.audioData).toString('base64');

        logger.debug('Streaming TTS audio chunk', {
          requestId: this.requestId,
          chunkSize: e.result.audioData.byteLength
        });

        this.sendResponse({
          type: 'audio',
          audio: audioBase64,
          requestId: this.requestId
        });
      }
    };

    // Bookmark 事件 — 仅在 SSML 含 <bookmark> 标签时触发（老 createSSML 不含，不受影响）
    this.synthesizer.bookmarkReached = (_, e: any) => {
      // Azure audioOffset 单位：100 纳秒 ticks；1ms = 10000 ticks
      const audioOffsetMs = Math.round((e.audioOffset ?? 0) / 10000);
      logger.debug('Streaming TTS bookmark reached', {
        requestId: this.requestId,
        bookmarkName: e.text,
        audioOffsetMs,
      });
      this.sendResponse({
        type: 'bookmark',
        bookmarkName: e.text,
        audioOffsetMs,
        requestId: this.requestId,
      });
    };

    // 合成完成事件
    this.synthesizer.synthesisCompleted = (_, e) => {
      logger.info('Streaming TTS synthesis completed', {
        requestId: this.requestId,
        totalBytes: e.result.audioData?.byteLength || 0
      });

      this.isSynthesizing = false;
      this.sendResponse({
        type: 'completed',
        requestId: this.requestId
      });
    };

    // 取消事件
    this.synthesizer.SynthesisCanceled = (_: any, e: any) => {
      this.isSynthesizing = false;

      if (e.result.reason === sdk.ResultReason.Canceled) {
        const cancellation = sdk.CancellationDetails.fromResult(e.result);

        if (cancellation.reason === sdk.CancellationReason.Error) {
          logger.error('Streaming TTS canceled with error', {
            requestId: this.requestId,
            errorCode: cancellation.ErrorCode,
            errorDetails: cancellation.errorDetails
          });
          this.sendError(cancellation.errorDetails || 'Synthesis canceled');
        }
      }
    };
  }

  private async handleSynthesize(text: string): Promise<void> {
    if (!this.synthesizer || !this.isStarted) {
      this.sendError('Synthesizer not initialized. Send config first.');
      return;
    }

    if (this.isSynthesizing) {
      logger.warn('Already synthesizing, ignoring request', { requestId: this.requestId });
      return;
    }

    if (!text.trim()) {
      logger.warn('Empty text, ignoring', { requestId: this.requestId });
      return;
    }

    this.isSynthesizing = true;

    logger.info('Starting streaming TTS synthesis', {
      requestId: this.requestId,
      textLength: text.length,
      voice: this.config.voice
    });

    try {
      // 创建 SSML
      const ssml = this.createSSML(text);

      // 开始合成（异步，通过事件回调返回音频块）
      this.synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            logger.info('Streaming TTS speakSsmlAsync completed', {
              requestId: this.requestId
            });
          } else if (result.reason === sdk.ResultReason.Canceled) {
            const cancellation = sdk.CancellationDetails.fromResult(result);
            logger.error('Streaming TTS speakSsmlAsync canceled', {
              requestId: this.requestId,
              reason: cancellation.reason,
              errorDetails: cancellation.errorDetails
            });
          }
          this.isSynthesizing = false;
        },
        (error) => {
          logger.error('Streaming TTS speakSsmlAsync error', {
            requestId: this.requestId,
            error
          });
          this.isSynthesizing = false;
          this.sendError(`Synthesis failed: ${error}`);
        }
      );
    } catch (error) {
      this.isSynthesizing = false;
      logger.error('Failed to start streaming TTS synthesis', { requestId: this.requestId, error });
      this.sendError(`Failed to synthesize: ${error}`);
    }
  }

  private async handleSynthesizeSentences(sentences: string[]): Promise<void> {
    if (!this.synthesizer || !this.isStarted) {
      this.sendError('Synthesizer not initialized. Send config first.');
      return;
    }
    if (this.isSynthesizing) {
      logger.warn('Already synthesizing, ignoring request', { requestId: this.requestId });
      return;
    }
    const cleaned = sentences.map(s => s.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      logger.warn('Empty sentences, ignoring', { requestId: this.requestId });
      return;
    }

    this.isSynthesizing = true;
    logger.info('Starting streaming TTS synthesis with bookmarks', {
      requestId: this.requestId,
      sentenceCount: cleaned.length,
      voice: this.config.voice,
    });

    try {
      const ssml = this.createSSMLWithBookmarks(cleaned);
      this.synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            logger.info('Streaming TTS sentences completed', { requestId: this.requestId });
          } else if (result.reason === sdk.ResultReason.Canceled) {
            const cancellation = sdk.CancellationDetails.fromResult(result);
            logger.error('Streaming TTS sentences canceled', {
              requestId: this.requestId,
              reason: cancellation.reason,
              errorDetails: cancellation.errorDetails,
            });
          }
          this.isSynthesizing = false;
        },
        (error) => {
          logger.error('Streaming TTS sentences error', { requestId: this.requestId, error });
          this.isSynthesizing = false;
          this.sendError(`Synthesis failed: ${error}`);
        }
      );
    } catch (error) {
      this.isSynthesizing = false;
      logger.error('Failed to start sentences synthesis', { requestId: this.requestId, error });
      this.sendError(`Failed to synthesize: ${error}`);
    }
  }

  private createSSMLWithBookmarks(sentences: string[]): string {
    const speed = this.config.speed || 1.0;
    const rate = speed < 1
      ? `-${Math.round((1 - speed) * 100)}%`
      : `+${Math.round((speed - 1) * 100)}%`;

    const escape = (s: string) => s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    // 每句前插入 bookmark：<bookmark name="s0"/>句1 <bookmark name="s1"/>句2 ...
    const body = sentences
      .map((s, i) => `<bookmark name="s${i}"/>${escape(s)}`)
      .join(' ');

    return `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <voice name="${this.config.voice}">
          <prosody rate="${rate}">
            ${body}
          </prosody>
        </voice>
      </speak>
    `.trim();
  }

  private createSSML(text: string): string {
    const speed = this.config.speed || 1.0;
    const rate = speed < 1
      ? `-${Math.round((1 - speed) * 100)}%`
      : `+${Math.round((speed - 1) * 100)}%`;

    // 转义 XML 特殊字符
    const escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    return `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <voice name="${this.config.voice}">
          <prosody rate="${rate}">
            ${escapedText}
          </prosody>
        </voice>
      </speak>
    `.trim();
  }

  private async handleStop(): Promise<void> {
    logger.info('Streaming TTS stop requested', { requestId: this.requestId });
    this.cleanup();
    this.sendResponse({ type: 'stopped', requestId: this.requestId });
  }

  private sendResponse(response: StreamingTTSResponse): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify(response);
      this.ws.send(message);
    }
  }

  private sendError(error: string): void {
    this.sendResponse({
      type: 'error',
      error,
      requestId: this.requestId
    });
  }

  private cleanup(): void {
    this.isSynthesizing = false;
    this.isStarted = false;

    if (this.synthesizer) {
      try {
        this.synthesizer.close();
      } catch (e) {
        // 忽略关闭错误
      }
      this.synthesizer = null;
    }

    this.speechConfig = null;
  }
}

/**
 * 创建流式 TTS 会话的工厂函数
 */
export function createStreamingTTSSession(ws: WebSocket): StreamingTTSSession {
  return new StreamingTTSSession(ws);
}
