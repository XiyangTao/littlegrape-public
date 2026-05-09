import axios, { AxiosInstance } from 'axios';
import { config } from '@/config';
import { logger } from '@/utils/logger';

/**
 * Speech Service 客户端
 * 封装对 speech-service 的所有调用
 */
class SpeechServiceClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.services.speechService.url,
      timeout: 120000, // 长文本 TTS 合成需要较长时间
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Speech service request:', {
          method: config.method,
          url: config.url,
          params: config.params
        });
        return config;
      },
      (error) => {
        logger.error('Speech service request error:', error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Speech service response:', {
          status: response.status,
          url: response.config.url
        });
        return response;
      },
      (error) => {
        logger.error('Speech service response error:', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * 获取所有可用的TTS声音
   * @param variant - 可选，筛选美式或英式口音 ('american' | 'british')
   */
  async getVoices(variant?: 'american' | 'british') {
    const response = await this.client.get('/api/v1/tts/voices', {
      params: { variant }
    });
    return response.data;
  }

  /**
   * 合成语音
   * @param request - TTS合成请求参数
   */
  async synthesizeSpeech(request: {
    text: string;
    voice: string;
    speed?: number;
    format?: 'mp3' | 'opus' | 'aac' | 'wav';
    quality?: 'standard' | 'premium';
  }) {
    const response = await this.client.post('/api/v1/tts/synthesize', request, {
      responseType: 'arraybuffer'
    });
    return response;
  }

  /**
   * 合成 + WordBoundary 时间戳（用于讲解音频句子定位）
   */
  async synthesizeWithWordBoundary(request: {
    text: string;
    voice: string;
    speed?: number;
    format?: string;
    lang?: string;
  }): Promise<{
    audio: Buffer;
    wordBoundaries: Array<{
      text: string;
      audioOffsetMs: number;
      durationMs: number;
      boundaryType: string;
    }>;
    durationMs?: number;
  }> {
    const response = await this.client.post('/api/v1/tts/synthesize-with-word-boundary', request, {
      timeout: 120000,
    });
    return {
      audio: Buffer.from(response.data.data.audio, 'base64'),
      wordBoundaries: response.data.data.wordBoundaries,
      durationMs: response.data.data.durationMs,
    };
  }

  /**
   * 按句子合成 + Bookmark 时间戳（用于精确句子定位）
   */
  async synthesizeWithBookmarks(request: {
    sentences: string[];
    voice: string;
    speed?: number;
    format?: string;
    lang?: string;
  }): Promise<{
    audio: Buffer;
    bookmarks: Array<{ name: string; audioOffsetMs: number }>;
    durationMs?: number;
  }> {
    const response = await this.client.post('/api/v1/tts/synthesize-with-bookmarks', request, {
      timeout: 120000,
    });
    return {
      audio: Buffer.from(response.data.data.audio, 'base64'),
      bookmarks: response.data.data.bookmarks,
      durationMs: response.data.data.durationMs,
    };
  }

  /**
   * 语音识别 (ASR)
   * @param audioBuffer - 音频数据
   * @param language - 语言代码
   */
  async recognizeSpeech(audioBuffer: Buffer, language: string = 'en-US') {
    const formData = new FormData();
    formData.append('audio', new Blob([audioBuffer]));
    formData.append('language', language);

    const response = await this.client.post('/api/v1/asr/recognize', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  /**
   * 文本翻译
   * @param text - 要翻译的文本
   * @param sourceLanguage - 源语言代码 (zh-CN | en-US)
   * @param targetLanguage - 目标语言代码 (zh-CN | en-US)
   */
  async translateText(text: string, sourceLanguage: string, targetLanguage: string) {
    const response = await this.client.post('/api/v1/translation/translate', {
      text,
      sourceLanguage,
      targetLanguage,
    });
    return response.data;
  }
}

// 导出单例实例
export const speechServiceClient = new SpeechServiceClient();
