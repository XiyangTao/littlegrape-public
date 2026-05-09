import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { WebSocket } from 'ws';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import {
  mapErrorType,
  getGranularity,
  generateRequestId,
} from '@/utils/pronunciation-helpers';

/**
 * 流式发音评估配置
 */
export interface StreamingPronunciationConfig {
  /** 参考文本（用户应该读的内容） */
  referenceText: string;

  /** 语言，默认 'en-US' */
  language?: string;

  /** 评估粒度：phoneme（音素级）、word（单词级）、fullText（全文级） */
  granularity?: 'phoneme' | 'word' | 'fullText';

  /** 是否启用韵律评估（语调、重音） */
  enableProsody?: boolean;

  /** 是否启用错误检测（漏读、多读） */
  enableMiscue?: boolean;
}

/**
 * 流式发音评估消息类型
 */
export interface StreamingPronunciationMessage {
  type: 'connect' | 'config' | 'audio' | 'stop' | 'ping';
  config?: StreamingPronunciationConfig;
  audio?: string; // base64 编码的 PCM 数据
}

/**
 * 音素评估结果
 */
export interface PhonemeResult {
  phoneme: string;
  accuracyScore: number;
}

/**
 * 单词评估结果
 */
export interface WordAssessmentResult {
  word: string;
  accuracyScore: number;
  errorType: 'None' | 'Mispronunciation' | 'Omission' | 'Insertion' | 'UnexpectedBreak' | 'MissingBreak' | 'Monotone';
  phonemes?: PhonemeResult[];
  /** 单词在音频中的偏移量（100纳秒单位） */
  offset?: number;
  /** 单词的持续时间（100纳秒单位） */
  duration?: number;
}

/**
 * 流式发音评估响应
 */
export interface StreamingPronunciationResponse {
  type: 'connected' | 'ready' | 'started' | 'assessing' | 'assessed' | 'error' | 'stopped' | 'finalResult' | 'pong';

  /** 请求 ID */
  requestId?: string;

  /** 识别的文本（中间结果） */
  recognizedText?: string;

  /** 发音评估结果（最终结果） */
  assessment?: {
    pronunciationScore: number;
    accuracyScore: number;
    fluencyScore: number;
    completenessScore: number;
    prosodyScore?: number | undefined;
    words: WordAssessmentResult[];
  };

  /** 累计评估结果（所有段落汇总） */
  cumulativeAssessment?: {
    pronunciationScore: number;
    accuracyScore: number;
    fluencyScore: number;
    completenessScore: number;
    prosodyScore?: number | undefined;
    words: WordAssessmentResult[];
    recognizedText: string;
  };

  /** 是否是最终结果 */
  isFinal?: boolean;

  /** 错误信息 */
  error?: string;

  /** 音频时长（毫秒） */
  duration?: number;
}

/**
 * 流式发音评估会话
 *
 * 基于 Azure 官方示例实现：
 * https://github.com/Azure-Samples/cognitive-services-speech-sdk/blob/master/scenarios/javascript/node/language-learning/pronunciationAssessmentContinue.js
 *
 * 流程：
 * 1. config: 配置新的评估任务，初始化识别器，开始连续识别
 * 2. audio: 发送音频数据到 pushStream
 * 3. stop: 关闭 pushStream，等待 Azure 处理完成
 * 4. sessionStopped 事件触发时，计算最终分数并发送结果
 */
export class StreamingPronunciationSession {
  private ws: WebSocket;
  private sessionId: string;
  private requestId: string = '';
  private recognizer: sdk.SpeechRecognizer | null = null;
  private pushStream: sdk.PushAudioInputStream | null = null;
  private isStarted: boolean = false;
  private isStopping: boolean = false;
  private config: StreamingPronunciationConfig | null = null;

  // 累计结果（用于连续模式，参考官方示例）
  private allWords: WordAssessmentResult[] = [];
  private allRecognizedText: string[] = [];
  private prosodyScores: number[] = [];
  private audioChunkCount = 0;

  constructor(ws: WebSocket) {
    this.ws = ws;
    this.sessionId = generateRequestId('spa');
    this.setupWebSocketHandlers();

    logger.info('Streaming Pronunciation Assessment session created', {
      sessionId: this.sessionId
    });

    // 连接建立后立即发送 connected 消息
    this.sendResponse({ type: 'connected' });
  }

  // generateSessionId 和 generateRequestId 已移至 @/utils/pronunciation-helpers.ts

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
      logger.info('Streaming Pronunciation WebSocket closed', { sessionId: this.sessionId });
      this.cleanup();
    });

    this.ws.on('error', (error) => {
      logger.error('Streaming Pronunciation WebSocket error', { sessionId: this.sessionId, error });
      this.cleanup();
    });
  }

  private parseMessage(data: Buffer | string): StreamingPronunciationMessage {
    if (typeof data === 'string') {
      return JSON.parse(data);
    }
    return JSON.parse(data.toString('utf-8'));
  }

  private async handleMessage(message: StreamingPronunciationMessage): Promise<void> {
    switch (message.type) {
      case 'connect':
        this.sendResponse({ type: 'connected' });
        break;
      case 'config':
        await this.handleConfig(message.config!);
        break;
      case 'audio':
        this.handleAudio(message.audio || '');
        break;
      case 'stop':
        this.handleStop();
        break;
      case 'ping':
        this.sendResponse({ type: 'pong' });
        break;
      default:
        this.sendError(`Unknown message type: ${(message as any).type}`);
    }
  }

  private async handleConfig(cfg: StreamingPronunciationConfig): Promise<void> {
    if (!cfg.referenceText) {
      this.sendError('referenceText is required');
      return;
    }

    // 清理之前的识别器（支持连接复用）
    this.cleanupRecognizer();

    // 重置累计结果
    this.resetAccumulatedResults();

    // 生成新的请求 ID
    this.requestId = generateRequestId('stream_pa');
    this.config = cfg;
    this.isStopping = false;

    logger.info('Streaming Pronunciation config received', {
      sessionId: this.sessionId,
      requestId: this.requestId,
      referenceText: cfg.referenceText,
      language: cfg.language
    });

    // 初始化识别器
    await this.initializeRecognizer();
  }

  private resetAccumulatedResults(): void {
    this.allWords = [];
    this.allRecognizedText = [];
    this.prosodyScores = [];
    this.audioChunkCount = 0;
  }

  private cleanupRecognizer(): void {
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

  private async initializeRecognizer(): Promise<void> {
    if (!this.config) {
      this.sendError('Config not set');
      return;
    }

    try {
      // 创建 Speech Config
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        config.azure.speechKey,
        config.azure.speechRegion
      );

      speechConfig.speechRecognitionLanguage = this.config.language || 'en-US';
      speechConfig.outputFormat = sdk.OutputFormat.Detailed;

      // 参考官方示例：设置分段静音超时
      speechConfig.setProperty(
        sdk.PropertyId.Speech_SegmentationSilenceTimeoutMs,
        '1500'
      );

      // 创建发音评估配置
      const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
        this.config.referenceText,
        sdk.PronunciationAssessmentGradingSystem.HundredMark,
        getGranularity(this.config.granularity),
        false // 连续模式下 enableMiscue 设为 false（官方文档说明）
      );

      // 启用韵律评估
      if (this.config.enableProsody !== false) {
        pronunciationConfig.enableProsodyAssessment = true;
      }

      // 创建推送音频流 (16kHz, 16-bit, 单声道 PCM)
      const audioFormat = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
      this.pushStream = sdk.AudioInputStream.createPushStream(audioFormat);
      const audioConfig = sdk.AudioConfig.fromStreamInput(this.pushStream);

      // 创建识别器
      this.recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

      // 应用发音评估配置
      pronunciationConfig.applyTo(this.recognizer);

      // 设置事件处理器（参考官方示例）
      this.setupRecognizerEvents();

      // 开始连续识别
      this.recognizer.startContinuousRecognitionAsync(
        () => {
          this.isStarted = true;
          logger.info('Streaming Pronunciation recognition started', {
            requestId: this.requestId
          });
          this.sendResponse({ type: 'ready', requestId: this.requestId });
        },
        (error) => {
          logger.error('Failed to start streaming pronunciation', {
            requestId: this.requestId,
            error
          });
          this.sendError(`Failed to start recognition: ${error}`);
        }
      );
    } catch (error) {
      logger.error('Failed to initialize streaming pronunciation', {
        requestId: this.requestId,
        error
      });
      this.sendError(`Failed to initialize: ${error}`);
    }
  }

  private setupRecognizerEvents(): void {
    if (!this.recognizer) return;

    // recognizing: 中间结果（参考官方示例）
    this.recognizer.recognizing = (_, e) => {
      if (e.result.reason === sdk.ResultReason.RecognizingSpeech && e.result.text) {
        this.sendResponse({
          type: 'assessing',
          recognizedText: e.result.text,
          isFinal: false,
          requestId: this.requestId
        });
      }
    };

    // recognized: 最终结果，累积评估数据（参考官方示例）
    this.recognizer.recognized = (_, e) => {
      logger.info('Recognized event', {
        requestId: this.requestId,
        reason: e.result.reason,
        reasonName: sdk.ResultReason[e.result.reason],
        text: e.result.text || '(empty)'
      });

      // RecognizedSpeech 但 text 为空：说明检测到语音但无法识别完整单词
      if (e.result.reason === sdk.ResultReason.RecognizedSpeech && !e.result.text) {
        logger.warn('Speech detected but no text recognized (incomplete pronunciation)', {
          requestId: this.requestId
        });
        return;
      }

      if (e.result.reason === sdk.ResultReason.RecognizedSpeech && e.result.text) {
        try {
          const pronunciationResult = sdk.PronunciationAssessmentResult.fromResult(e.result);

          logger.info('Pronunciation assessment for phrase', {
            requestId: this.requestId,
            text: e.result.text,
            accuracyScore: pronunciationResult.accuracyScore,
            pronunciationScore: pronunciationResult.pronunciationScore,
            fluencyScore: pronunciationResult.fluencyScore,
            completenessScore: pronunciationResult.completenessScore,
            prosodyScore: pronunciationResult.prosodyScore
          });

          // 记录累积前的单词数量，用于后续返回本次识别的单词
          const previousWordsCount = this.allWords.length;

          // 解析 JSON 结果获取单词级别数据（参考官方示例）
          const jsonResult = e.result.properties?.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult);
          if (jsonResult) {
            const jo = JSON.parse(jsonResult);
            const nb = jo.NBest?.[0];

            if (nb) {
              // 累积 prosody 分数
              if (nb.PronunciationAssessment?.ProsodyScore !== undefined) {
                this.prosodyScores.push(nb.PronunciationAssessment.ProsodyScore);
              }

              // 累积单词（包含时间信息用于流利度计算）
              const nBestWords = nb.Words || [];
              for (const wordData of nBestWords) {
                this.allWords.push({
                  word: wordData.Word || '',
                  accuracyScore: wordData.PronunciationAssessment?.AccuracyScore || 0,
                  errorType: mapErrorType(wordData.PronunciationAssessment?.ErrorType),
                  phonemes: wordData.Phonemes?.map((p: any) => ({
                    phoneme: p.Phoneme || '',
                    accuracyScore: p.PronunciationAssessment?.AccuracyScore || 0
                  })),
                  offset: wordData.Offset,
                  duration: wordData.Duration
                });
              }

              // 累积识别文本
              this.allRecognizedText.push(e.result.text);
            }
          }

          // 获取本次识别的新单词
          const newWords = this.allWords.slice(previousWordsCount);

          // 发送段落评估结果
          this.sendResponse({
            type: 'assessed',
            recognizedText: e.result.text,
            assessment: {
              pronunciationScore: pronunciationResult.pronunciationScore || 0,
              accuracyScore: pronunciationResult.accuracyScore || 0,
              fluencyScore: pronunciationResult.fluencyScore || 0,
              completenessScore: pronunciationResult.completenessScore || 0,
              prosodyScore: pronunciationResult.prosodyScore,
              words: newWords // 发送本次识别的新单词
            },
            isFinal: true,
            requestId: this.requestId
          });

        } catch (error) {
          logger.error('Error parsing assessment result', { requestId: this.requestId, error });
        }
      } else if (e.result.reason === sdk.ResultReason.NoMatch) {
        logger.warn('No speech recognized (NoMatch)', { requestId: this.requestId });
      }
    };

    // canceled: 处理错误（参考官方示例）
    this.recognizer.canceled = (_, e) => {
      if (e.reason === sdk.CancellationReason.Error) {
        logger.error('Streaming Pronunciation canceled with error', {
          requestId: this.requestId,
          errorDetails: e.errorDetails
        });
        this.sendError(e.errorDetails || 'Recognition canceled');
      }
      // 无论是错误还是正常结束，都停止识别
      this.stopRecognition();
    };

    // sessionStopped: 会话结束，计算并发送最终结果（参考官方示例）
    this.recognizer.sessionStopped = () => {
      logger.info('Session stopped, calculating final scores', {
        requestId: this.requestId,
        wordsCount: this.allWords.length
      });

      // 停止识别
      this.stopRecognition();

      // 计算并发送最终结果
      this.calculateAndSendFinalResult();

      // 发送 stopped 消息
      this.sendResponse({ type: 'stopped', requestId: this.requestId });
    };
  }

  private stopRecognition(): void {
    if (this.recognizer && this.isStarted) {
      this.recognizer.stopContinuousRecognitionAsync(
        () => {
          logger.debug('Recognition stopped successfully', { requestId: this.requestId });
        },
        (error) => {
          logger.warn('Error stopping recognition', { requestId: this.requestId, error });
        }
      );
    }
  }

  /**
   * 计算并发送最终结果（参考官方示例的 calculateOverallPronunciationScore）
   *
   * 错误类型：
   * - NO_SPEECH_DETECTED: 完全没检测到语音
   * - INCOMPLETE_SPEECH: 检测到语音但完整度太低（< 30%）
   */
  private calculateAndSendFinalResult(): void {
    // 完全没识别到任何单词
    if (this.allWords.length === 0) {
      logger.warn('No words recognized', { requestId: this.requestId });
      this.sendResponse({
        type: 'error',
        error: 'NO_SPEECH_DETECTED',
        requestId: this.requestId
      });
      return;
    }

    // 计算平均准确度分数
    const accuracyScores = this.allWords
      .filter(w => w.errorType !== 'Insertion')
      .map(w => w.accuracyScore);
    const accuracyScore = accuracyScores.length > 0
      ? accuracyScores.reduce((a, b) => a + b, 0) / accuracyScores.length
      : 0;

    // 计算韵律分数（平均）
    const prosodyScore = this.prosodyScores.length > 0
      ? this.prosodyScores.reduce((a, b) => a + b, 0) / this.prosodyScores.length
      : undefined;

    // 计算完整度分数（基于参考文本的单词数）
    // 完整度 = 识别到的有效单词数 / 参考文本单词数
    const referenceWordCount = this.config?.referenceText.trim().split(/\s+/).length || 0;
    const validWordCount = this.allWords.filter(w =>
      w.errorType === 'None' || w.errorType === 'Mispronunciation'
    ).length;
    const completenessScore = referenceWordCount > 0
      ? Math.min(100, (validWordCount / referenceWordCount) * 100)
      : 0;

    // 计算流利度分数（基于单词持续时间占总语音时长的比例）
    // 流利度 = 单词发音总时长 / 总语音时长 * 100
    const wordsWithTiming = this.allWords.filter(w => w.offset !== undefined && w.duration !== undefined);
    let fluencyScore = 100; // 默认值
    if (wordsWithTiming.length > 0) {
      const firstWord = wordsWithTiming[0];
      const lastWord = wordsWithTiming[wordsWithTiming.length - 1];
      const firstOffset = firstWord.offset || 0;
      const lastOffset = lastWord.offset || 0;
      const lastDuration = lastWord.duration || 0;

      // 总语音时长（从第一个单词开始到最后一个单词结束）
      const totalDuration = (lastOffset + lastDuration) - firstOffset;

      // 单词发音总时长
      const wordDurations = wordsWithTiming.reduce((sum, w) => sum + (w.duration || 0), 0);

      if (totalDuration > 0) {
        fluencyScore = Math.min(100, (wordDurations / totalDuration) * 100);
      }
    }

    // 综合发音评分：质量分 × 完整度乘数
    // 质量分 = accuracy/fluency/prosody 加权（衡量"读的部分有多好"）
    // 完整度乘数 = (completeness/100)^0.7（衡量"读了多少"，幂函数缓和衰减）
    let qualityScore: number;
    if (prosodyScore !== undefined) {
      qualityScore = accuracyScore * 0.5 + fluencyScore * 0.3 + prosodyScore * 0.2;
    } else {
      qualityScore = accuracyScore * 0.6 + fluencyScore * 0.4;
    }
    const completenessMultiplier = Math.pow(completenessScore / 100, 0.7);
    const pronunciationScore = qualityScore * completenessMultiplier;

    const cumulativeAssessment = {
      pronunciationScore: Number(pronunciationScore.toFixed(1)),
      accuracyScore: Number(accuracyScore.toFixed(1)),
      fluencyScore: Number(fluencyScore.toFixed(1)),
      completenessScore: Number(completenessScore.toFixed(1)),
      prosodyScore: prosodyScore !== undefined ? Number(prosodyScore.toFixed(1)) : undefined,
      words: this.allWords,
      recognizedText: this.allRecognizedText.join(' ')
    };

    logger.info('Sending final cumulative result', {
      requestId: this.requestId,
      pronunciationScore: cumulativeAssessment.pronunciationScore,
      accuracyScore: cumulativeAssessment.accuracyScore,
      completenessScore: cumulativeAssessment.completenessScore,
      wordsCount: this.allWords.length
    });

    this.sendResponse({
      type: 'finalResult',
      cumulativeAssessment,
      requestId: this.requestId
    });
  }

  // 工具函数已移至 @/utils/pronunciation-helpers.ts

  private handleAudio(audioBase64: string): void {
    if (!this.pushStream || !this.isStarted) {
      logger.warn('Received audio before recognition started', { requestId: this.requestId });
      return;
    }

    if (this.isStopping) {
      return; // 已经在停止中，不再接收音频
    }

    try {
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      const uint8Array = new Uint8Array(audioBuffer);
      this.pushStream.write(uint8Array.buffer);

      this.audioChunkCount++;
      if (this.audioChunkCount <= 3 || this.audioChunkCount % 20 === 0) {
        logger.debug('Audio chunk received', {
          requestId: this.requestId,
          chunkNumber: this.audioChunkCount,
          chunkSize: audioBuffer.length
        });
      }
    } catch (error) {
      logger.error('Failed to process audio chunk', { requestId: this.requestId, error });
    }
  }

  /**
   * 处理停止请求
   *
   * 参考官方示例：关闭 pushStream 后，Azure SDK 会继续处理剩余音频，
   * 然后触发 sessionStopped 事件，在那里发送最终结果
   */
  private handleStop(): void {
    if (this.isStopping) {
      return;
    }
    this.isStopping = true;

    logger.info('Streaming Pronunciation stop requested', {
      requestId: this.requestId,
      totalAudioChunks: this.audioChunkCount
    });

    // 关闭 pushStream，告诉 Azure SDK 没有更多音频数据了
    // Azure SDK 会处理完剩余音频，然后触发 sessionStopped 事件
    if (this.pushStream) {
      try {
        this.pushStream.close();
        logger.debug('Push stream closed', { requestId: this.requestId });
      } catch (e) {
        logger.warn('Error closing push stream', { requestId: this.requestId, error: e });
      }
      this.pushStream = null;
    }

    // 不在这里发送结果，等待 sessionStopped 事件
  }

  private sendResponse(response: StreamingPronunciationResponse): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(response));
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
    this.cleanupRecognizer();
  }
}

/**
 * 创建流式发音评估会话
 */
export function createStreamingPronunciationSession(ws: WebSocket): StreamingPronunciationSession {
  return new StreamingPronunciationSession(ws);
}
