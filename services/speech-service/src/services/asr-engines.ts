import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { AudioAnalyzer } from '@/utils/audio-analyzer';

// Azure Speech Service 支持的语言类型（针对英语学习应用）
export type AzureSupportedLanguage =
  // 中文变体
  | 'zh-CN'     // 中文（简体，中国）
  // 英语变体
  | 'en-US'     // 英语（美式）
  | 'en-GB'     // 英语（英式）

  // 其他常见语言
  | 'ja-JP'     // 日语
  | 'ko-KR'     // 韩语
  | 'fr-FR'     // 法语（法国）
  | 'de-DE'     // 德语（德国）
  | 'es-ES'     // 西班牙语（西班牙）
  | 'it-IT'     // 意大利语
  // 自动检测
  | 'auto'      // 自动语言检测
  | 'auto-detect';

// ASR接口定义
export interface ASRRequest {
  /** 音频文件的二进制数据 (WAV格式) */
  audioBuffer: Buffer;

  /** 语音识别语言，默认 'en-US' */
  language?: AzureSupportedLanguage;

  /** 是否返回每个词的时间戳信息，用于字幕同步或语音分析 */
  enableWordLevelTimestamps?: boolean;

  /** 是否启用脏话过滤，屏蔽不当词汇 */
  enableProfanityFilter?: boolean;

  /** 是否启用自动语言检测，让Azure自动识别语音语言 */
  enableAutoLanguageDetection?: boolean;

  /** 自动语言检测的候选语言列表，与 enableAutoLanguageDetection 配合使用 */
  candidateLanguages?: AzureSupportedLanguage[];

}

// ASR识别模式枚举
export enum ASRMode {
  SHORT_AUDIO = 'short',     // 短句识别 (<= 15秒)
  LONG_AUDIO = 'long',       // 长句识别 (> 15秒)
  STREAMING = 'streaming'    // 实时流式识别
}

export interface ASRResult {
  text: string;
  confidence: number;
  duration: number;
  words?: WordResult[];
  requestId?: string;
  reason?: string;
}

export interface WordResult {
  word: string;
  confidence: number;
  offset: number;      // 开始时间 (毫秒)
  duration: number;    // 持续时间 (毫秒)
}

export interface ASREngine {
  name: string;
  // 自动选择识别模式（根据音频长度）
  recognizeSpeech(request: ASRRequest): Promise<ASRResult>;
  // 短句识别（<= 15秒）
  recognizeShortAudio(request: ASRRequest): Promise<ASRResult>;
  // 长句识别（> 15秒）
  recognizeLongAudio(request: ASRRequest): Promise<ASRResult>;
  // 检查引擎可用性
  isAvailable(): Promise<boolean>;
}

// Azure ASR引擎 - 重构版本：为每个请求创建独立的SpeechConfig，确保线程安全
export class AzureASREngine implements ASREngine {
  name = 'azure';
  private readonly azureKey: string;
  private readonly azureRegion: string;

  constructor() {
    this.azureKey = config.azure.speechKey;
    this.azureRegion = config.azure.speechRegion;

    // 启用详细日志记录以改进服务性能（Azure 1.46推荐）
    sdk.Recognizer.enableTelemetry(true);

    logger.info('Azure ASR引擎初始化完成', {
      region: this.azureRegion,
      approach: 'per-request-config'
    });
  }

  // 为每个请求创建独立的SpeechConfig，确保并发安全
  private createSpeechConfig(request: ASRRequest): sdk.SpeechConfig {
    const speechConfig = sdk.SpeechConfig.fromSubscription(this.azureKey, this.azureRegion);

    // 启用详细结果输出
    speechConfig.outputFormat = sdk.OutputFormat.Detailed;

    // 配置语言设置
    this.configureLanguageSettings(speechConfig, request);

    // 配置高级选项
    this.configureAdvancedOptions(speechConfig, request);

    return speechConfig;
  }

  // 主入口：自动选择识别模式（根据音频长度）
  // 一次性识别没有连续识别准确，所以调用连续识别
  async recognizeSpeech(request: ASRRequest): Promise<ASRResult> {
    try {
      return await this.recognizeLongAudio(request);
    } catch (error) {
      throw new Error(`ASR recognition error: ${error}`);
    }
  }

  // 短句识别（<= 15秒）- 使用一次性识别
  async recognizeShortAudio(request: ASRRequest): Promise<ASRResult> {
    const requestId = this.generateRequestId();

    try {
      logger.info('Starting Azure short audio recognition', {
        requestId,
        language: request.language,
        audioSize: request.audioBuffer.length,
      });

      // 音频格式处理
      const processedAudioBuffer = await this.processAudioBuffer(request.audioBuffer, requestId);

      // 使用 recognizeOnceAsync 进行短句识别
      return await this.performShortRecognition(processedAudioBuffer, request, requestId);
    } catch (error) {
      logger.error('Short audio recognition error', { requestId, error });
      throw new Error(`Short ASR error: ${error}`);
    }
  }

  // 长句识别（> 15秒）- 使用连续识别
  async recognizeLongAudio(request: ASRRequest): Promise<ASRResult> {
    const requestId = this.generateRequestId();

    try {
      logger.info('Starting Azure long audio recognition', {
        requestId,
        language: request.language,
        audioSize: request.audioBuffer.length,
      });

      // 音频格式处理
      const processedAudioBuffer = await this.processAudioBuffer(request.audioBuffer, requestId);

      // 使用连续识别处理长音频，然后合并结果
      const results = await this.performLongRecognition(processedAudioBuffer, request, requestId);

      // 合并多个识别结果为单个结果
      return this.mergeRecognitionResults(results, requestId);
    } catch (error) {
      logger.error('Long audio recognition error', { requestId, error });
      throw new Error(`Long ASR error: ${error}`);
    }
  }



  // 私有方法 - 使用Azure SDK 1.46.0最佳实践
  private generateRequestId(): string {
    return `asr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 音频格式验证（简化版本）
  private async processAudioBuffer(audioBuffer: Buffer, requestId: string): Promise<Buffer> {
    logger.info('Validating audio format', { requestId });

    // 检查是否为WAV格式
    if (!AudioAnalyzer.isWAVFormat(audioBuffer)) {
      const errorMsg = 'Only WAV format is supported. Please convert your audio to WAV format.';
      logger.error('Unsupported audio format', { requestId, bufferSize: audioBuffer.length });
      throw new Error(errorMsg);
    }

    // 分析WAV格式是否符合Azure要求
    try {
      const metadata = AudioAnalyzer.analyzeWAV(audioBuffer);
      const compatibility = AudioAnalyzer.checkAzureCompatibility(metadata);

      if (!compatibility.compatible) {
        logger.warn('Audio format not optimal for Azure ASR', {
          requestId,
          issues: compatibility.issues,
          metadata
        });
        // 不阻止处理，只是警告
      } else {
        logger.info('Audio format is Azure ASR compatible', { requestId, metadata });
      }
    } catch (error) {
      logger.warn('Could not analyze audio metadata, proceeding anyway', {
        requestId,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return audioBuffer;
  }

  // 短句识别的具体实现
  private performShortRecognition(
    audioBuffer: Buffer,
    request: ASRRequest,
    requestId: string
  ): Promise<ASRResult> {
    return new Promise((resolve, reject) => {
      let recognizer: sdk.SpeechRecognizer | null = null;

      try {
        // 为此请求创建独立的SpeechConfig
        const speechConfig = this.createSpeechConfig(request);

        // 创建音频配置
        const audioConfig = this.createAudioConfig(audioBuffer);
        recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

        // 设置30秒超时（适合1分钟内录音）
        const timeoutId = setTimeout(() => {
          if (recognizer) {
            logger.warn('Recognition timeout reached', { requestId });
            recognizer.close();
            reject(new Error('Recognition timeout (30s)'));
          }
        }, 30000); // 30秒超时

        // 执行一次性识别
        recognizer.recognizeOnceAsync(
          (result) => {
            clearTimeout(timeoutId);
            if (recognizer) {
              recognizer.close();
              recognizer = null;
            }

            try {
              const asrResult = this.processRecognitionResult(result, requestId);
              logger.info('Short audio recognition completed', {
                requestId,
                text: asrResult.text,
                confidence: asrResult.confidence
              });
              resolve(asrResult);
            } catch (processError) {
              logger.error('Error processing short recognition result', {
                requestId,
                error: processError
              });
              reject(processError);
            }
          },
          (error) => {
            clearTimeout(timeoutId);
            if (recognizer) {
              recognizer.close();
              recognizer = null;
            }
            logger.error('Short recognition error', { requestId, error });
            reject(new Error(`Short recognition failed: ${error}`));
          }
        );
      } catch (error) {
        if (recognizer) {
          recognizer.close();
        }
        logger.error('Short recognition setup error', { requestId, error });
        reject(new Error(`Short recognition setup error: ${error}`));
      }
    });
  }

  // 长句识别的具体实现（使用连续识别）
  private performLongRecognition(
    audioBuffer: Buffer,
    request: ASRRequest,
    requestId: string
  ): Promise<ASRResult[]> {
    return new Promise((resolve, reject) => {
      let recognizer: sdk.SpeechRecognizer | null = null;

      try {
        logger.info('Starting long audio continuous recognition', {
          requestId,
          language: request.language,
          audioSize: audioBuffer.length
        });

        // 为此请求创建独立的SpeechConfig
        const speechConfig = this.createSpeechConfig(request);

        const audioConfig = this.createAudioConfig(audioBuffer);
        recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

        const results: ASRResult[] = [];

        // 最终识别结果
        recognizer.recognized = (_, e) => {
          if (e.result.reason === sdk.ResultReason.RecognizedSpeech && e.result.text) {
            try {
              const asrResult = this.processRecognitionResult(e.result, requestId);
              results.push(asrResult);
              logger.info('Long audio segment recognized', {
                requestId,
                text: asrResult.text,
                confidence: asrResult.confidence
              });
            } catch (error) {
              logger.error('Error processing long recognition result', {
                requestId,
                error
              });
            }
          }
        };

        // 识别完成
        recognizer.sessionStopped = () => {
          if (recognizer) {
            recognizer.close();
            recognizer = null;
          }

          logger.info('Long audio recognition completed', {
            requestId,
            totalSegments: results.length
          });
          resolve(results);
        };

        // 错误处理
        recognizer.canceled = (_, e) => {
          if (recognizer) {
            recognizer.close();
            recognizer = null;
          }

          if (e.reason === sdk.CancellationReason.Error) {

            logger.error('Long audio recognition canceled', {
              requestId,
              reason: e.reason,
              errorDetails: e.errorDetails
            });

            reject(new Error(`Long recognition canceled: ${e.errorDetails}`));
          } else {
            resolve(results);
          }
        };

        // 开始连续识别
        recognizer.startContinuousRecognitionAsync(
          () => {
            logger.info('Long audio continuous recognition started', { requestId });

            // 设置30秒超时（app录音限制1分钟内）
            setTimeout(() => {
              if (recognizer) {
                recognizer.stopContinuousRecognitionAsync();
              }
            }, 30000); // 30秒超时
          },
          (error) => {
            if (recognizer) {
              recognizer.close();
              recognizer = null;
            }

            logger.error('Long recognition start error', {
              requestId,
              error
            });

            reject(new Error(`Long recognition error: ${error}`));
          }
        );
      } catch (error) {
        if (recognizer) {
          recognizer.close();
        }

        logger.error('Long recognition setup error', { requestId, error });
        reject(new Error(`Long recognition setup error: ${error}`));
      }
    });
  }

  // 合并多个识别结果
  private mergeRecognitionResults(results: ASRResult[], requestId: string): ASRResult {
    if (results.length === 0) {
      logger.warn('No recognition results to merge', { requestId });
      return {
        text: '',
        confidence: 0,
        duration: 0,
        words: [],
        requestId,
        reason: 'NoMatch'
      };
    }

    if (results.length === 1) {
      return results[0];
    }

    // 合并多个结果
    const mergedText = results.map(r => r.text).filter(text => text.trim()).join(' ');
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const allWords = results.flatMap(r => r.words || []);

    logger.info('Merged recognition results', {
      requestId,
      segmentCount: results.length,
      mergedText,
      avgConfidence
    });

    return {
      text: mergedText,
      confidence: avgConfidence,
      duration: totalDuration,
      words: allWords,
      requestId,
      reason: 'RecognizedSpeech'
    };
  }

  // 配置语言设置（接受独立的speechConfig参数）
  private configureLanguageSettings(speechConfig: sdk.SpeechConfig, request: ASRRequest): void {
    logger.info('Configuring language settings', {
      language: request.language,
      enableAutoLanguageDetection: request.enableAutoLanguageDetection
    });

    const candidateLanguages = request.candidateLanguages || ['zh-CN', 'en-US'];
    const languageString = candidateLanguages.join(',');

    logger.info('Setting auto-detect candidate languages', {
      candidateLanguages: languageString,
      originalRequest: candidateLanguages
    });

    // 设置候选语言列表，启用自动检测
    speechConfig.setProperty(
      sdk.PropertyId.SpeechServiceConnection_AutoDetectSourceLanguages,
      languageString
    );

    // 两种模式: 自动语言检测 或 单语言
    // 1. 自动语言检测模式
    if (request.enableAutoLanguageDetection || request.language === 'auto' || request.language === 'auto-detect') {
      logger.info('Auto-detect mode configured without explicit LanguageIdMode');
      return;
    }

    // 2. 标准单语言模式（默认）
    const language = request.language || 'en-US';
    speechConfig.speechRecognitionLanguage = language;

    logger.info('Single language mode configured', {
      language: speechConfig.speechRecognitionLanguage
    });
  }

  private configureAdvancedOptions(speechConfig: sdk.SpeechConfig, request: ASRRequest): void {
    // 启用脏话过滤
    if (request.enableProfanityFilter) {
      speechConfig.setProfanity(sdk.ProfanityOption.Masked);
    }
    // 启用词级时间戳
    if (request.enableWordLevelTimestamps) {
      speechConfig.requestWordLevelTimestamps();
    }
  }

  private createAudioConfig(audioBuffer: Buffer): sdk.AudioConfig {
    try {
      // 创建推送音频流，指定WAV格式 (16kHz, 16-bit, 单声道)
      const audioFormat = sdk.AudioStreamFormat.getWaveFormatPCM(
        16000, // 采样率 16kHz
        16,    // 位深度 16-bit
        1      // 单声道
      );
      const audioStream = sdk.AudioInputStream.createPushStream(audioFormat);
      // 简单安全的Buffer转换
      const uint8Array = new Uint8Array(audioBuffer);
      audioStream.write(uint8Array.buffer);
      audioStream.close();
      return sdk.AudioConfig.fromStreamInput(audioStream);
    } catch (error) {
      logger.error('Error creating audio config', { error });
      throw new Error(`Failed to create audio configuration: ${error}`);
    }
  }

  private processRecognitionResult(result: sdk.SpeechRecognitionResult, requestId: string): ASRResult {
    const resultReason = this.getReasonString(result.reason);

    if (result.reason === sdk.ResultReason.RecognizedSpeech) {
      const words = this.parseWordDetails(result);
      return {
        text: result.text,
        confidence: this.calculateOverallConfidence(result),
        duration: result.duration / 10000, // 转换为毫秒
        words,
        requestId,
        reason: resultReason
      };
    } else if (result.reason === sdk.ResultReason.NoMatch) {
      logger.warn('Azure ASR no speech detected', { requestId });
      return {
        text: '',
        confidence: 0,
        duration: 0,
        words: [],
        requestId,
        reason: resultReason
      };
    } else {
      const errorMessage = `Speech recognition failed: ${result.errorDetails || resultReason}`;
      logger.error('Azure ASR recognition failed', {
        requestId,
        reason: resultReason,
        errorDetails: result.errorDetails
      });
      throw new Error(errorMessage);
    }
  }

  private getReasonString(reason: sdk.ResultReason): string {
    switch (reason) {
      case sdk.ResultReason.RecognizedSpeech:
        return 'RecognizedSpeech';
      case sdk.ResultReason.NoMatch:
        return 'NoMatch';
      case sdk.ResultReason.Canceled:
        return 'Canceled';
      default:
        return `Unknown(${reason})`;
    }
  }

  private calculateOverallConfidence(result: sdk.SpeechRecognitionResult): number {
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

  private parseWordDetails(result: sdk.SpeechRecognitionResult): WordResult[] {
    try {
      const jsonResult = result.properties?.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult);
      if (jsonResult) {
        const parsed = JSON.parse(jsonResult);
        const words = parsed.NBest?.[0]?.Words || [];

        return words.map((word: any) => ({
          word: word.Word,
          confidence: word.Confidence || 0.5,
          offset: word.Offset / 10000, // 转换为毫秒
          duration: word.Duration / 10000
        }));
      }
      return [];
    } catch {
      return [];
    }
  }


  async isAvailable(): Promise<boolean> {
    return !!(config.azure.speechKey && config.azure.speechRegion);
  }
}

// ASR引擎管理器
export class ASREngineManager {
  private engines: Map<string, ASREngine> = new Map();

  constructor() {
    // 注册可用的ASR引擎
    this.registerEngine(new AzureASREngine());
  }

  private registerEngine(engine: ASREngine) {
    this.engines.set(engine.name, engine);
    logger.info(`ASR engine registered: ${engine.name}`);
  }

  // 一次性识别（自动选择短句/长句）
  async recognizeSpeech(engineName: string, request: ASRRequest): Promise<ASRResult> {
    logger.info('ASR Engine Manager - Auto recognition request', {
      engineName,
      audioSize: request.audioBuffer.length,
      language: request.language
    });

    const engine = await this.getEngine(engineName);
    return await engine.recognizeSpeech(request);
  }

  // 短句识别
  async recognizeShortAudio(engineName: string, request: ASRRequest): Promise<ASRResult> {
    logger.info('ASR Engine Manager - Short audio recognition request', {
      engineName,
      audioSize: request.audioBuffer.length,
      language: request.language
    });

    const engine = await this.getEngine(engineName);
    return await engine.recognizeShortAudio(request);
  }

  // 长句识别
  async recognizeLongAudio(engineName: string, request: ASRRequest): Promise<ASRResult> {
    logger.info('ASR Engine Manager - Long audio recognition request', {
      engineName,
      audioSize: request.audioBuffer.length,
      language: request.language
    });

    const engine = await this.getEngine(engineName);
    return await engine.recognizeLongAudio(request);
  }


  // 获取引擎实例（公共方法）
  private async getEngine(engineName: string): Promise<ASREngine> {
    const engine = this.engines.get(engineName);
    if (!engine) {
      logger.error('ASR engine not found', {
        engineName,
        availableEngines: Array.from(this.engines.keys())
      });
      throw new Error(`ASR engine not found: ${engineName}`);
    }

    logger.info('Checking engine availability', { engineName });
    const isAvailable = await engine.isAvailable();
    if (!isAvailable) {
      logger.error('ASR engine not available', { engineName });
      throw new Error(`ASR engine not available: ${engineName}`);
    }

    logger.info('Engine available', { engineName });
    return engine;
  }

  async getAvailableEngines(): Promise<string[]> {
    const available: string[] = [];

    for (const [name, engine] of this.engines.entries()) {
      if (await engine.isAvailable()) {
        available.push(name);
      }
    }

    return available;
  }

  getAllEngines(): string[] {
    return Array.from(this.engines.keys());
  }
}

// 导出单例
export const asrEngineManager = new ASREngineManager();