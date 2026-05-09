import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { WebSocket } from 'ws';
import { config } from '@/config';
import { logger } from '@/utils/logger';

/**
 * 流式翻译消息类型
 */
export interface StreamingTranslationConfig {
  /** 源语言: 'zh-CN' | 'en-US' | 'auto' */
  sourceLanguage?: string;
  /** 目标语言: 'zh-CN' | 'en-US' */
  targetLanguage: string;
  /** 是否启用语音合成 */
  enableSynthesis?: boolean;
  /** 合成语音名称 */
  voiceName?: string;
}

export interface StreamingTranslationMessage {
  type: 'config' | 'audio' | 'stop';
  config?: StreamingTranslationConfig;
  audio?: string;
}

export interface StreamingTranslationResponse {
  type: 'started' | 'translating' | 'translated' | 'synthesis' | 'error' | 'stopped';
  /** 源文本（识别的原始语音） */
  sourceText?: string;
  /** 翻译后的文本 */
  translatedText?: string;
  /** 是否为最终结果 */
  isFinal?: boolean;
  /** 检测到的语言 */
  detectedLanguage?: string;
  /** 合成的音频数据 (base64) */
  audioData?: string;
  /** 错误信息 */
  error?: string;
  /** 请求ID */
  requestId?: string;
}

/**
 * 语言代码映射
 * Azure 翻译目标语言使用不同的代码格式
 */
const SPEECH_TO_TRANSLATION_LANGUAGE: Record<string, string> = {
  'zh-CN': 'zh-Hans',
  'en-US': 'en',
  'ja-JP': 'ja',
  'ko-KR': 'ko',
  'fr-FR': 'fr',
  'de-DE': 'de',
  'es-ES': 'es',
};

// 保留以备将来使用（如语音合成需要反向映射）
// const TRANSLATION_TO_SPEECH_LANGUAGE: Record<string, string> = {
//   'zh-Hans': 'zh-CN',
//   'en': 'en-US',
//   'ja': 'ja-JP',
//   'ko': 'ko-KR',
//   'fr': 'fr-FR',
//   'de': 'de-DE',
//   'es': 'es-ES',
// };

/**
 * 默认语音名称
 */
const DEFAULT_VOICE_NAMES: Record<string, string> = {
  'zh-CN': 'zh-CN-XiaoxiaoNeural',
  'zh-Hans': 'zh-CN-XiaoxiaoNeural',
  'en-US': 'en-US-JennyNeural',
  'en': 'en-US-JennyNeural',
  'ja-JP': 'ja-JP-NanamiNeural',
  'ja': 'ja-JP-NanamiNeural',
};

/**
 * 流式翻译会话管理器
 */
export class StreamingTranslationSession {
  private ws: WebSocket;
  private requestId: string;
  private translator: sdk.TranslationRecognizer | null = null;
  private pushStream: sdk.PushAudioInputStream | null = null;
  private isStarted: boolean = false;
  private config: StreamingTranslationConfig = {
    sourceLanguage: 'auto',
    targetLanguage: 'en',
  };

  // 累积的翻译结果（只在用户停止时才发送最终结果）
  private accumulatedSourceText: string = '';
  private accumulatedTranslatedText: string = '';
  private lastDetectedLanguage: string | undefined;

  constructor(ws: WebSocket) {
    this.ws = ws;
    this.requestId = this.generateRequestId();
    this.setupWebSocketHandlers();
  }

  private generateRequestId(): string {
    return `stream_translation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      logger.info('Streaming Translation WebSocket closed', { requestId: this.requestId });
      this.cleanup();
    });

    this.ws.on('error', (error) => {
      logger.error('Streaming Translation WebSocket error', { requestId: this.requestId, error });
      this.cleanup();
    });
  }

  private parseMessage(data: Buffer | string): StreamingTranslationMessage {
    if (typeof data === 'string') {
      return JSON.parse(data);
    }
    return JSON.parse(data.toString('utf-8'));
  }

  private async handleMessage(message: StreamingTranslationMessage): Promise<void> {
    switch (message.type) {
      case 'config':
        await this.handleConfig(message.config || { targetLanguage: 'en' });
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

  private async handleConfig(cfg: StreamingTranslationConfig): Promise<void> {
    this.config = { ...this.config, ...cfg };

    logger.info('Streaming Translation config received', {
      requestId: this.requestId,
      config: this.config
    });

    await this.initializeTranslator();
  }

  private async initializeTranslator(): Promise<void> {
    try {
      // 创建 SpeechTranslationConfig
      const translationConfig = sdk.SpeechTranslationConfig.fromSubscription(
        config.azure.speechKey,
        config.azure.speechRegion
      );

      // 配置源语言
      // 注意：TranslationRecognizer 不支持自动语言检测，必须指定源语言
      const sourceLanguage = this.config.sourceLanguage || 'auto';
      if (sourceLanguage === 'auto') {
        // 自动模式下默认使用中文作为源语言
        // 如果目标语言是中文，则使用英文作为源语言
        const defaultSource = this.config.targetLanguage === 'zh-CN' ? 'en-US' : 'zh-CN';
        translationConfig.speechRecognitionLanguage = defaultSource;
        logger.info('Streaming Translation auto mode, using default source', {
          requestId: this.requestId,
          defaultSource,
          targetLanguage: this.config.targetLanguage
        });
      } else {
        translationConfig.speechRecognitionLanguage = sourceLanguage;
        logger.info('Streaming Translation using single language mode', {
          requestId: this.requestId,
          sourceLanguage
        });
      }

      // 配置目标翻译语言
      const targetLanguage = SPEECH_TO_TRANSLATION_LANGUAGE[this.config.targetLanguage] || this.config.targetLanguage;
      translationConfig.addTargetLanguage(targetLanguage);

      // 禁用脏话过滤，显示原始翻译内容
      // setProfanity 影响语音识别结果
      translationConfig.setProfanity(sdk.ProfanityOption.Raw);

      // 尝试通过 service property 设置翻译服务的 profanity 选项
      // Azure Translator API 使用 profanityAction 参数
      translationConfig.setServiceProperty('profanityAction', 'NoAction', sdk.ServicePropertyChannel.UriQueryParameter);

      logger.info('Streaming Translation target language set', {
        requestId: this.requestId,
        targetLanguage
      });

      // 配置语音合成（可选）
      if (this.config.enableSynthesis) {
        const voiceName = this.config.voiceName ||
          DEFAULT_VOICE_NAMES[targetLanguage] ||
          DEFAULT_VOICE_NAMES[this.config.targetLanguage] ||
          'en-US-JennyNeural';
        translationConfig.voiceName = voiceName;

        logger.info('Streaming Translation synthesis enabled', {
          requestId: this.requestId,
          voiceName
        });
      }

      // 创建推送音频流 (16kHz, 16-bit, 单声道 PCM)
      const audioFormat = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
      this.pushStream = sdk.AudioInputStream.createPushStream(audioFormat);
      const audioConfig = sdk.AudioConfig.fromStreamInput(this.pushStream);

      // 创建 TranslationRecognizer
      this.translator = new sdk.TranslationRecognizer(translationConfig, audioConfig);

      // 设置事件处理器
      this.setupTranslatorEvents();

      // 开始连续识别
      this.translator.startContinuousRecognitionAsync(
        () => {
          this.isStarted = true;
          logger.info('Streaming Translation started', { requestId: this.requestId });
          this.sendResponse({ type: 'started', requestId: this.requestId });
        },
        (error) => {
          logger.error('Failed to start streaming translation', { requestId: this.requestId, error });
          this.sendError(`Failed to start translation: ${error}`);
        }
      );
    } catch (error) {
      logger.error('Failed to initialize streaming translation', { requestId: this.requestId, error });
      this.sendError(`Failed to initialize: ${error}`);
    }
  }

  private setupTranslatorEvents(): void {
    if (!this.translator) return;

    // 实时识别和翻译结果（部分结果）
    this.translator.recognizing = (_, e) => {
      if (e.result.reason === sdk.ResultReason.TranslatingSpeech) {
        const sourceText = e.result.text;
        const targetLanguage = SPEECH_TO_TRANSLATION_LANGUAGE[this.config.targetLanguage] || this.config.targetLanguage;
        const translatedText = e.result.translations.get(targetLanguage) || '';

        logger.debug('Streaming Translation recognizing', {
          requestId: this.requestId,
          sourceText,
          translatedText
        });

        this.sendResponse({
          type: 'translating',
          sourceText,
          translatedText,
          isFinal: false,
          requestId: this.requestId
        });
      }
    };

    // 最终识别和翻译结果 - 累积而不是立即发送
    this.translator.recognized = (_, e) => {
      if (e.result.reason === sdk.ResultReason.TranslatedSpeech) {
        const sourceText = e.result.text;
        const targetLanguage = SPEECH_TO_TRANSLATION_LANGUAGE[this.config.targetLanguage] || this.config.targetLanguage;
        const translatedText = e.result.translations.get(targetLanguage) || '';

        // 累积文本（用空格连接）
        if (sourceText) {
          this.accumulatedSourceText = this.accumulatedSourceText
            ? `${this.accumulatedSourceText} ${sourceText}`
            : sourceText;
        }
        if (translatedText) {
          this.accumulatedTranslatedText = this.accumulatedTranslatedText
            ? `${this.accumulatedTranslatedText} ${translatedText}`
            : translatedText;
        }

        // 尝试获取检测到的语言
        try {
          const jsonResult = e.result.properties?.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult);
          if (jsonResult) {
            const parsed = JSON.parse(jsonResult);
            this.lastDetectedLanguage = parsed.PrimaryLanguage?.Language;
          }
        } catch {
          // ignore
        }

        logger.info('Streaming Translation recognized (accumulated)', {
          requestId: this.requestId,
          segmentSource: sourceText,
          segmentTranslated: translatedText,
          totalSource: this.accumulatedSourceText,
          totalTranslated: this.accumulatedTranslatedText
        });

        // 不立即发送 translated，只发送实时预览（显示累积的文本）
        this.sendResponse({
          type: 'translating',
          sourceText: this.accumulatedSourceText,
          translatedText: this.accumulatedTranslatedText,
          isFinal: false,
          requestId: this.requestId
        });
      } else if (e.result.reason === sdk.ResultReason.NoMatch) {
        logger.debug('Streaming Translation no match', { requestId: this.requestId });
      }
    };

    // 翻译语音合成（可选）
    if (this.config.enableSynthesis) {
      this.translator.synthesizing = (_, e) => {
        if (e.result.audio && e.result.audio.byteLength > 0) {
          const audioData = Buffer.from(e.result.audio).toString('base64');

          logger.debug('Streaming Translation synthesis', {
            requestId: this.requestId,
            audioLength: e.result.audio.byteLength
          });

          this.sendResponse({
            type: 'synthesis',
            audioData,
            requestId: this.requestId
          });
        }
      };
    }

    // 会话停止（不在这里发送 stopped，由 handleStop 统一处理）
    this.translator.sessionStopped = () => {
      logger.info('Streaming Translation session stopped', { requestId: this.requestId });
    };

    // 取消事件
    this.translator.canceled = (_, e) => {
      if (e.reason === sdk.CancellationReason.Error) {
        logger.error('Streaming Translation canceled with error', {
          requestId: this.requestId,
          reason: e.reason,
          errorDetails: e.errorDetails
        });
        this.sendError(e.errorDetails || 'Translation canceled');
      }
    };
  }

  private async handleAudio(audioBase64: string): Promise<void> {
    if (!this.pushStream || !this.isStarted) {
      logger.warn('Received audio before translation started', { requestId: this.requestId });
      return;
    }

    try {
      // 解码 base64 音频数据
      const audioBuffer = Buffer.from(audioBase64, 'base64');

      // 推送音频数据到流
      const uint8Array = new Uint8Array(audioBuffer);
      this.pushStream.write(uint8Array.buffer);

      logger.debug('Streaming Translation audio chunk received', {
        requestId: this.requestId,
        chunkSize: audioBuffer.length
      });
    } catch (error) {
      logger.error('Failed to process audio chunk', { requestId: this.requestId, error });
    }
  }

  private async handleStop(): Promise<void> {
    logger.info('Streaming Translation stop requested', {
      requestId: this.requestId,
      accumulatedSourceText: this.accumulatedSourceText,
      accumulatedTranslatedText: this.accumulatedTranslatedText
    });

    if (this.pushStream) {
      this.pushStream.close();
    }

    if (this.translator) {
      this.translator.stopContinuousRecognitionAsync(
        () => {
          logger.info('Streaming Translation stopped successfully', { requestId: this.requestId });

          // 发送累积的最终翻译结果
          if (this.accumulatedSourceText && this.accumulatedTranslatedText) {
            this.sendResponse({
              type: 'translated',
              sourceText: this.accumulatedSourceText,
              translatedText: this.accumulatedTranslatedText,
              isFinal: true,
              ...(this.lastDetectedLanguage && { detectedLanguage: this.lastDetectedLanguage }),
              requestId: this.requestId
            });
          }

          // 发送停止响应
          this.sendResponse({ type: 'stopped', requestId: this.requestId });
        },
        (error) => {
          logger.error('Failed to stop streaming translation', { requestId: this.requestId, error });
        }
      );
    }
  }

  private sendResponse(response: StreamingTranslationResponse): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify(response);
      logger.info('Sending Translation WebSocket response', {
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

    if (this.translator) {
      try {
        this.translator.close();
      } catch (e) {
        // 忽略关闭错误
      }
      this.translator = null;
    }

    this.isStarted = false;
    this.accumulatedSourceText = '';
    this.accumulatedTranslatedText = '';
    this.lastDetectedLanguage = undefined;
  }
}

/**
 * 创建流式翻译会话的工厂函数
 */
export function createStreamingTranslationSession(ws: WebSocket): StreamingTranslationSession {
  return new StreamingTranslationSession(ws);
}
