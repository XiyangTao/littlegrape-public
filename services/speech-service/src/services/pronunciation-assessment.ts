import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { AudioAnalyzer } from '@/utils/audio-analyzer';
import {
  mapErrorType,
  getGranularity,
  generateRequestId,
} from '@/utils/pronunciation-helpers';

// 发音评估请求接口
export interface PronunciationAssessmentRequest {
  /** 音频文件的二进制数据 (WAV格式) */
  audioBuffer: Buffer;

  /** 参考文本（用户应该读的内容） */
  referenceText: string;

  /** 练习类型 */
  practiceType?: 'phoneme' | 'word' | 'sentence' | 'dialogue';

  /** 语言，默认 'en-US' */
  language?: string;

  /** 是否启用韵律评估（语调、重音等），句子模式建议开启 */
  enableProsody?: boolean;

  /** 评估粒度：phoneme（音素级）、word（单词级）、fullText（全文级） */
  granularity?: 'phoneme' | 'word' | 'fullText';

  /** 是否启用错误检测（漏读、多读、重复） */
  enableMiscue?: boolean;
}

// 音素评估结果
export interface PhonemeResult {
  /** 音素符号 */
  phoneme: string;

  /** 准确度分数 0-100 */
  accuracyScore: number;

  /** NBest 音素（如果有） */
  nBestPhonemes?: Array<{
    phoneme: string;
    score: number;
  }>;
}

// 音节评估结果
export interface SyllableResult {
  /** 音节文本 */
  syllable: string;

  /** 准确度分数 0-100 */
  accuracyScore: number;

  /** 音素列表 */
  phonemes?: PhonemeResult[] | undefined;
}

// 单词评估结果
export interface WordAssessmentResult {
  /** 单词文本 */
  word: string;

  /** 准确度分数 0-100 */
  accuracyScore: number;

  /** 错误类型 */
  errorType: 'None' | 'Mispronunciation' | 'Omission' | 'Insertion' | 'UnexpectedBreak' | 'MissingBreak' | 'Monotone';

  /** 音节列表 */
  syllables?: SyllableResult[] | undefined;

  /** 音素列表（如果请求了音素级粒度） */
  phonemes?: PhonemeResult[] | undefined;
}

// 发音评估结果
export interface PronunciationAssessmentResult {
  /** 综合发音分数 0-100 */
  pronunciationScore: number;

  /** 准确度分数 0-100 */
  accuracyScore: number;

  /** 流利度分数 0-100 */
  fluencyScore: number;

  /** 完整度分数 0-100 */
  completenessScore: number;

  /** 韵律分数 0-100（语调、重音等，需要启用 enableProsody） */
  prosodyScore?: number;

  /** 识别的文本 */
  recognizedText: string;

  /** 逐词评估结果 */
  words: WordAssessmentResult[];

  /** 请求ID */
  requestId: string;

  /** 音频时长（毫秒） */
  duration: number;
}

// 发音评估引擎
export class PronunciationAssessmentEngine {
  private readonly azureKey: string;
  private readonly azureRegion: string;

  constructor() {
    this.azureKey = config.azure.speechKey;
    this.azureRegion = config.azure.speechRegion;

    logger.info('Pronunciation Assessment Engine initialized', {
      region: this.azureRegion
    });
  }

  /**
   * 执行发音评估
   */
  async assess(request: PronunciationAssessmentRequest): Promise<PronunciationAssessmentResult> {
    const requestId = generateRequestId('pa');

    try {
      logger.info('Starting pronunciation assessment', {
        requestId,
        referenceText: request.referenceText,
        practiceType: request.practiceType,
        language: request.language,
        audioSize: request.audioBuffer.length,
        enableProsody: request.enableProsody,
        granularity: request.granularity
      });

      // 验证音频格式
      const processedAudioBuffer = await this.processAudioBuffer(request.audioBuffer, requestId);

      // 执行发音评估
      const result = await this.performAssessment(processedAudioBuffer, request, requestId);

      logger.info('Pronunciation assessment completed', {
        requestId,
        pronunciationScore: result.pronunciationScore,
        accuracyScore: result.accuracyScore,
        fluencyScore: result.fluencyScore,
        completenessScore: result.completenessScore,
        prosodyScore: result.prosodyScore,
        wordsCount: result.words.length
      });

      return result;
    } catch (error) {
      logger.error('Pronunciation assessment error', { requestId, error });
      throw new Error(`Pronunciation assessment failed: ${error}`);
    }
  }

  /**
   * 执行发音评估的核心逻辑
   */
  private performAssessment(
    audioBuffer: Buffer,
    request: PronunciationAssessmentRequest,
    requestId: string
  ): Promise<PronunciationAssessmentResult> {
    return new Promise((resolve, reject) => {
      let recognizer: sdk.SpeechRecognizer | null = null;

      try {
        // 创建 Speech Config
        const speechConfig = sdk.SpeechConfig.fromSubscription(this.azureKey, this.azureRegion);
        speechConfig.speechRecognitionLanguage = request.language || 'en-US';

        // 创建发音评估配置
        const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
          request.referenceText,
          sdk.PronunciationAssessmentGradingSystem.HundredMark,
          getGranularity(request.granularity),
          true // 启用错误检测
        );

        // 设置音素字母表为 IPA（国际音标），默认是 SAPI 格式
        pronunciationConfig.phonemeAlphabet = 'IPA';

        // 启用韵律评估（语调、重音）
        if (request.enableProsody !== false) {
          // 句子和对话模式默认启用韵律评估
          if (request.practiceType === 'sentence' || request.practiceType === 'dialogue' || request.enableProsody) {
            pronunciationConfig.enableProsodyAssessment = true;
          }
        }

        // 启用错误检测（漏读、多读等）
        if (request.enableMiscue !== false) {
          pronunciationConfig.enableMiscue = true;
        }

        // 创建音频配置
        const audioConfig = this.createAudioConfig(audioBuffer);

        // 创建识别器
        recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

        // 应用发音评估配置
        pronunciationConfig.applyTo(recognizer);

        // 设置超时（30秒）
        const timeoutId = setTimeout(() => {
          if (recognizer) {
            logger.warn('Pronunciation assessment timeout', { requestId });
            recognizer.close();
            reject(new Error('Pronunciation assessment timeout (30s)'));
          }
        }, 30000);

        // 执行识别
        recognizer.recognizeOnceAsync(
          (result) => {
            clearTimeout(timeoutId);

            if (recognizer) {
              recognizer.close();
              recognizer = null;
            }

            try {
              if (result.reason === sdk.ResultReason.RecognizedSpeech) {
                const assessmentResult = this.parseAssessmentResult(result, requestId);
                resolve(assessmentResult);
              } else if (result.reason === sdk.ResultReason.NoMatch) {
                logger.warn('No speech detected for pronunciation assessment', { requestId });
                reject(new Error('No speech detected. Please speak clearly and try again.'));
              } else if (result.reason === sdk.ResultReason.Canceled) {
                const cancellation = sdk.CancellationDetails.fromResult(result);
                logger.error('Pronunciation assessment canceled', {
                  requestId,
                  reason: cancellation.reason,
                  errorDetails: cancellation.errorDetails
                });
                reject(new Error(`Assessment canceled: ${cancellation.errorDetails}`));
              } else {
                reject(new Error(`Unexpected result reason: ${result.reason}`));
              }
            } catch (parseError) {
              logger.error('Error parsing pronunciation assessment result', { requestId, parseError });
              reject(parseError);
            }
          },
          (error) => {
            clearTimeout(timeoutId);

            if (recognizer) {
              recognizer.close();
              recognizer = null;
            }

            logger.error('Pronunciation assessment recognition error', { requestId, error });
            reject(new Error(`Recognition error: ${error}`));
          }
        );
      } catch (error) {
        if (recognizer) {
          recognizer.close();
        }
        logger.error('Pronunciation assessment setup error', { requestId, error });
        reject(new Error(`Setup error: ${error}`));
      }
    });
  }

  /**
   * 解析发音评估结果
   */
  private parseAssessmentResult(
    result: sdk.SpeechRecognitionResult,
    requestId: string
  ): PronunciationAssessmentResult {
    // 获取发音评估结果
    const pronunciationResult = sdk.PronunciationAssessmentResult.fromResult(result);

    // 获取详细的 JSON 结果
    const jsonResult = result.properties?.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult);
    let detailedWords: WordAssessmentResult[] = [];

    if (jsonResult) {
      try {
        const parsed = JSON.parse(jsonResult);
        detailedWords = this.parseDetailedWords(parsed);

        logger.debug('Parsed pronunciation assessment JSON', {
          requestId,
          nBestCount: parsed.NBest?.length,
          wordsCount: detailedWords.length
        });
      } catch (parseError) {
        logger.warn('Failed to parse detailed pronunciation result', { requestId, parseError });
      }
    }

    // 如果没有从 JSON 解析出结果，使用 SDK 的 detailResult
    if (detailedWords.length === 0 && pronunciationResult.detailResult) {
      detailedWords = this.parseWordsFromDetailResult(pronunciationResult.detailResult);
    }

    return {
      pronunciationScore: pronunciationResult.pronunciationScore || 0,
      accuracyScore: pronunciationResult.accuracyScore || 0,
      fluencyScore: pronunciationResult.fluencyScore || 0,
      completenessScore: pronunciationResult.completenessScore || 0,
      prosodyScore: pronunciationResult.prosodyScore,
      recognizedText: result.text || '',
      words: detailedWords,
      requestId,
      duration: result.duration / 10000 // 转换为毫秒
    };
  }

  /**
   * 从 JSON 结果解析详细的单词评估
   */
  private parseDetailedWords(jsonResult: any): WordAssessmentResult[] {
    const words: WordAssessmentResult[] = [];

    // NBest[0].Words 包含详细的单词评估
    const nBestWords = jsonResult.NBest?.[0]?.Words || [];

    for (const wordData of nBestWords) {
      const word: WordAssessmentResult = {
        word: wordData.Word || '',
        accuracyScore: wordData.PronunciationAssessment?.AccuracyScore || 0,
        errorType: mapErrorType(wordData.PronunciationAssessment?.ErrorType),
        syllables: this.parseSyllables(wordData.Syllables),
        phonemes: this.parsePhonemes(wordData.Phonemes)
      };

      words.push(word);
    }

    return words;
  }

  /**
   * 从 SDK detailResult 解析单词
   */
  private parseWordsFromDetailResult(detailResult: any): WordAssessmentResult[] {
    const words: WordAssessmentResult[] = [];

    if (detailResult.Words) {
      for (const wordData of detailResult.Words) {
        const word: WordAssessmentResult = {
          word: wordData.Word || '',
          accuracyScore: wordData.PronunciationAssessment?.AccuracyScore || 0,
          errorType: mapErrorType(wordData.PronunciationAssessment?.ErrorType),
          phonemes: wordData.Phonemes?.map((p: any) => ({
            phoneme: p.Phoneme || '',
            accuracyScore: p.PronunciationAssessment?.AccuracyScore || 0
          }))
        };

        words.push(word);
      }
    }

    return words;
  }

  /**
   * 解析音节
   */
  private parseSyllables(syllablesData: any[]): SyllableResult[] | undefined {
    if (!syllablesData || syllablesData.length === 0) {
      return undefined;
    }

    return syllablesData.map(s => ({
      syllable: s.Syllable || '',
      accuracyScore: s.PronunciationAssessment?.AccuracyScore || 0,
      phonemes: this.parsePhonemes(s.Phonemes)
    }));
  }

  /**
   * 解析音素
   */
  private parsePhonemes(phonemesData: any[]): PhonemeResult[] | undefined {
    if (!phonemesData || phonemesData.length === 0) {
      return undefined;
    }

    return phonemesData.map(p => ({
      phoneme: p.Phoneme || '',
      accuracyScore: p.PronunciationAssessment?.AccuracyScore || 0,
      nBestPhonemes: p.NBestPhonemes?.map((nb: any) => ({
        phoneme: nb.Phoneme || '',
        score: nb.Score || 0
      }))
    }));
  }

  // 工具函数已移至 @/utils/pronunciation-helpers.ts

  /**
   * 处理音频 Buffer（验证格式）
   */
  private async processAudioBuffer(audioBuffer: Buffer, requestId: string): Promise<Buffer> {
    logger.info('Validating audio format for pronunciation assessment', { requestId });

    // 检查是否为 WAV 格式
    if (!AudioAnalyzer.isWAVFormat(audioBuffer)) {
      const errorMsg = 'Only WAV format is supported. Please convert your audio to WAV format.';
      logger.error('Unsupported audio format', { requestId, bufferSize: audioBuffer.length });
      throw new Error(errorMsg);
    }

    // 分析 WAV 格式
    try {
      const metadata = AudioAnalyzer.analyzeWAV(audioBuffer);
      const compatibility = AudioAnalyzer.checkAzureCompatibility(metadata);

      if (!compatibility.compatible) {
        logger.warn('Audio format not optimal for pronunciation assessment', {
          requestId,
          issues: compatibility.issues,
          metadata
        });
      } else {
        logger.info('Audio format is compatible', { requestId, metadata });
      }
    } catch (error) {
      logger.warn('Could not analyze audio metadata', {
        requestId,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return audioBuffer;
  }

  /**
   * 创建音频配置
   */
  private createAudioConfig(audioBuffer: Buffer): sdk.AudioConfig {
    try {
      // 创建推送音频流 (16kHz, 16-bit, 单声道)
      const audioFormat = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
      const audioStream = sdk.AudioInputStream.createPushStream(audioFormat);

      const uint8Array = new Uint8Array(audioBuffer);
      audioStream.write(uint8Array.buffer);
      audioStream.close();

      return sdk.AudioConfig.fromStreamInput(audioStream);
    } catch (error) {
      logger.error('Error creating audio config', { error });
      throw new Error(`Failed to create audio configuration: ${error}`);
    }
  }

  /**
   * 检查引擎是否可用
   */
  async isAvailable(): Promise<boolean> {
    return !!(config.azure.speechKey && config.azure.speechRegion);
  }
}

// 导出单例
export const pronunciationAssessmentEngine = new PronunciationAssessmentEngine();
