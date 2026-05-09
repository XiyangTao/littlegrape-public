import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { WebSocket } from 'ws';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { AzureSupportedLanguage } from './asr-engines';

/**
 * 流式 ASR 消息类型
 */
export interface StreamingASRConfig {
  language?: AzureSupportedLanguage;
  candidateLanguages?: AzureSupportedLanguage[];
  enableWordLevelTimestamps?: boolean;
  enableProfanityFilter?: boolean;
}

export interface StreamingASRMessage {
  type: 'config' | 'audio' | 'stop';
  // config 消息的配置
  config?: StreamingASRConfig;
  // audio 消息的音频数据 (base64 编码的 PCM 数据)
  audio?: string;
}

export interface StreamingASRResponse {
  type: 'recognizing' | 'recognized' | 'error' | 'stopped' | 'started';
  text?: string;
  confidence?: number;
  isFinal?: boolean;
  error?: string;
  requestId?: string;
}

/**
 * 流式 ASR 会话管理器
 * 每个 WebSocket 连接对应一个会话
 */
export class StreamingASRSession {
  private ws: WebSocket;
  private requestId: string;
  private recognizer: sdk.SpeechRecognizer | null = null;
  private pushStream: sdk.PushAudioInputStream | null = null;
  private isStarted: boolean = false;
  // 默认使用自动语言检测，支持中英文
  private config: StreamingASRConfig = {
    language: 'auto',
    candidateLanguages: ['zh-CN', 'en-US']
  };

  constructor(ws: WebSocket) {
    this.ws = ws;
    this.requestId = this.generateRequestId();
    this.setupWebSocketHandlers();
  }

  private generateRequestId(): string {
    return `stream_asr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      logger.info('Streaming ASR WebSocket closed', { requestId: this.requestId });
      this.cleanup();
    });

    this.ws.on('error', (error) => {
      logger.error('Streaming ASR WebSocket error', { requestId: this.requestId, error });
      this.cleanup();
    });
  }

  private parseMessage(data: Buffer | string): StreamingASRMessage {
    if (typeof data === 'string') {
      return JSON.parse(data);
    }
    return JSON.parse(data.toString('utf-8'));
  }

  private async handleMessage(message: StreamingASRMessage): Promise<void> {
    switch (message.type) {
      case 'config':
        await this.handleConfig(message.config || {});
        break;
      case 'audio':
        await this.handleAudio(message.audio || '');
        break;
      case 'stop':
        await this.handleStop();
        break;
      default:
        this.sendError(`Unknown message type: ${(message as any).type}`);
    }
  }

  private async handleConfig(cfg: StreamingASRConfig): Promise<void> {
    this.config = { ...this.config, ...cfg };

    logger.info('Streaming ASR config received', {
      requestId: this.requestId,
      config: this.config
    });

    // 初始化识别器
    await this.initializeRecognizer();
  }

  private async initializeRecognizer(): Promise<void> {
    try {
      // 创建 Speech Config
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        config.azure.speechKey,
        config.azure.speechRegion
      );

      speechConfig.outputFormat = sdk.OutputFormat.Detailed;

      // 配置语言设置
      const language = this.config.language || 'auto';
      const isAutoDetect = language === 'auto' || language === 'auto-detect';

      if (isAutoDetect) {
        // 自动语言检测模式
        const candidateLanguages = this.config.candidateLanguages || ['zh-CN', 'en-US'];
        speechConfig.setProperty(
          sdk.PropertyId.SpeechServiceConnection_AutoDetectSourceLanguages,
          candidateLanguages.join(',')
        );
        logger.info('Streaming ASR using auto-detect mode', {
          requestId: this.requestId,
          candidateLanguages
        });
      } else {
        // 单语言模式
        speechConfig.speechRecognitionLanguage = language;
        logger.info('Streaming ASR using single language mode', {
          requestId: this.requestId,
          language
        });
      }

      // 启用词级时间戳
      if (this.config.enableWordLevelTimestamps) {
        speechConfig.requestWordLevelTimestamps();
      }

      // 启用脏话过滤
      if (this.config.enableProfanityFilter) {
        speechConfig.setProfanity(sdk.ProfanityOption.Masked);
      }

      // 创建推送音频流 (16kHz, 16-bit, 单声道 PCM)
      const audioFormat = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
      this.pushStream = sdk.AudioInputStream.createPushStream(audioFormat);
      const audioConfig = sdk.AudioConfig.fromStreamInput(this.pushStream);

      // 创建识别器
      this.recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

      // 设置事件处理器
      this.setupRecognizerEvents();

      // 开始连续识别
      this.recognizer.startContinuousRecognitionAsync(
        () => {
          this.isStarted = true;
          logger.info('Streaming ASR recognition started', { requestId: this.requestId });
          this.sendResponse({ type: 'started', requestId: this.requestId });
        },
        (error) => {
          logger.error('Failed to start streaming ASR', { requestId: this.requestId, error });
          this.sendError(`Failed to start recognition: ${error}`);
        }
      );
    } catch (error) {
      logger.error('Failed to initialize streaming ASR', { requestId: this.requestId, error });
      this.sendError(`Failed to initialize: ${error}`);
    }
  }

  private setupRecognizerEvents(): void {
    if (!this.recognizer) return;

    // 实时识别结果（部分结果）
    this.recognizer.recognizing = (_, e) => {
      if (e.result.reason === sdk.ResultReason.RecognizingSpeech && e.result.text) {
        logger.debug('Streaming ASR recognizing', {
          requestId: this.requestId,
          text: e.result.text
        });

        this.sendResponse({
          type: 'recognizing',
          text: e.result.text,
          isFinal: false,
          requestId: this.requestId
        });
      }
    };

    // 最终识别结果
    this.recognizer.recognized = (_, e) => {
      if (e.result.reason === sdk.ResultReason.RecognizedSpeech && e.result.text) {
        const confidence = this.calculateConfidence(e.result);

        logger.info('Streaming ASR recognized', {
          requestId: this.requestId,
          text: e.result.text,
          confidence
        });

        this.sendResponse({
          type: 'recognized',
          text: e.result.text,
          confidence,
          isFinal: true,
          requestId: this.requestId
        });
      }
    };

    // 会话停止
    this.recognizer.sessionStopped = () => {
      logger.info('Streaming ASR session stopped', { requestId: this.requestId });
      this.sendResponse({ type: 'stopped', requestId: this.requestId });
    };

    // 取消事件
    this.recognizer.canceled = (_, e) => {
      if (e.reason === sdk.CancellationReason.Error) {
        logger.error('Streaming ASR canceled with error', {
          requestId: this.requestId,
          reason: e.reason,
          errorDetails: e.errorDetails
        });
        this.sendError(e.errorDetails || 'Recognition canceled');
      }
    };
  }

  private calculateConfidence(result: sdk.SpeechRecognitionResult): number {
    try {
      const jsonResult = result.properties?.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult);
      if (jsonResult) {
        const parsed = JSON.parse(jsonResult);
        return parsed.NBest?.[0]?.Confidence || 0.5;
      }
      return 0.5;
    } catch {
      return 0.5;
    }
  }

  private async handleAudio(audioBase64: string): Promise<void> {
    if (!this.pushStream || !this.isStarted) {
      logger.warn('Received audio before recognition started', { requestId: this.requestId });
      return;
    }

    try {
      // 解码 base64 音频数据
      const audioBuffer = Buffer.from(audioBase64, 'base64');

      // 推送音频数据到流
      const uint8Array = new Uint8Array(audioBuffer);
      this.pushStream.write(uint8Array.buffer);

      logger.debug('Streaming ASR audio chunk received', {
        requestId: this.requestId,
        chunkSize: audioBuffer.length
      });
    } catch (error) {
      logger.error('Failed to process audio chunk', { requestId: this.requestId, error });
    }
  }

  private async handleStop(): Promise<void> {
    logger.info('Streaming ASR stop requested', { requestId: this.requestId });

    if (this.pushStream) {
      this.pushStream.close();
    }

    if (this.recognizer) {
      this.recognizer.stopContinuousRecognitionAsync(
        () => {
          logger.info('Streaming ASR stopped successfully', { requestId: this.requestId });
        },
        (error) => {
          logger.error('Failed to stop streaming ASR', { requestId: this.requestId, error });
        }
      );
    }
  }

  private sendResponse(response: StreamingASRResponse): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify(response);
      logger.info('Sending WebSocket response', {
        requestId: this.requestId,
        type: response.type,
        messageLength: message.length,
        preview: message.substring(0, 200)
      });
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
    if (this.pushStream) {
      try {
        this.pushStream.close();
      } catch (e) {
        // 忽略关闭错误
      }
      this.pushStream = null;
    }

    if (this.recognizer) {
      try {
        this.recognizer.close();
      } catch (e) {
        // 忽略关闭错误
      }
      this.recognizer = null;
    }

    this.isStarted = false;
  }
}

/**
 * 创建流式 ASR 会话的工厂函数
 */
export function createStreamingASRSession(ws: WebSocket): StreamingASRSession {
  return new StreamingASRSession(ws);
}
