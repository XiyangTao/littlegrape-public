import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';
import { config } from '@/config';

// TTS 引擎类型
export type TTSEngineName = 'azure' | 'doubao';

// 通用接口定义
export interface TTSRequest {
  text: string;
  voice: string;
  speed: number;
  format: 'mp3' | 'opus' | 'aac' | 'wav';
  quality?: 'standard' | 'premium';
  lang?: string; // SSML xml:lang 覆盖（如 'en-GB'），不传则自动推断
}

export interface Voice {
  id: string;
  name: string;
  gender: 'male' | 'female';
  language: string;
  variant: 'american' | 'british' | 'multilingual';
  accent: string;
  avatar: string;
  sampleAudio: string;
  description: string;
  voiceEngineId: string; // Azure TTS 引擎使用的实际 Voice ID
  doubaoEngineId?: string; // 豆包 TTS 引擎使用的 Voice ID
  defaultEngine?: TTSEngineName; // 该角色默认使用的引擎
}

export interface BookmarkEvent {
  name: string;
  audioOffsetMs: number;
}

export interface SynthesisWithBookmarksResult {
  audio: Buffer;
  bookmarks: BookmarkEvent[];
  durationMs?: number; // 精确音频时长（毫秒）
}

export interface WordBoundaryEvent {
  text: string;
  audioOffsetMs: number;
  durationMs: number;
  boundaryType: string;
}

export interface SynthesisWithWordBoundaryResult {
  audio: Buffer;
  wordBoundaries: WordBoundaryEvent[];
  durationMs?: number; // 精确音频时长（毫秒）
}

export interface TTSEngine {
  name: string;
  synthesize(request: TTSRequest): Promise<Buffer>;
  synthesizeSSML(ssml: string, format: string): Promise<SynthesisWithBookmarksResult>;
  synthesizeWithWordBoundary(request: TTSRequest): Promise<SynthesisWithWordBoundaryResult>;
  /** 逐句合成 + 精确句级时间戳（不依赖 SSML） */
  synthesizeSentencesWithBookmarks?(sentences: string[], voiceType: string, speed: number, format: string): Promise<SynthesisWithBookmarksResult>;
  getVoices(): Promise<Voice[]>;
  isAvailable(): Promise<boolean>;
}

// Azure认知服务TTS引擎
export class AzureTTSEngine implements TTSEngine {
  name = 'azure';
  private speechConfig: sdk.SpeechConfig | null = null;

  // 从共享角色配置生成声音列表（单一数据源：packages/shared/characters.json）
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  private conversationVoices: Voice[] = (() => {
    const data = require('@littlegrape/shared') as { characters: any[] };
    return data.characters.map((c: any) => ({
      id: c.id,
      name: c.name,
      gender: c.gender,
      language: c.voice.language,
      variant: c.voice.variant,
      accent: c.voice.accent,
      avatar: c.avatar,
      sampleAudio: '',
      description: c.description,
      voiceEngineId: c.voice.engineId,
      doubaoEngineId: c.voice.doubaoEngineId,
      defaultEngine: c.voice.defaultEngine,
    }));
  })();

  constructor() {
    if (config.azure.speechKey && config.azure.speechRegion) {
      this.speechConfig = sdk.SpeechConfig.fromSubscription(
        config.azure.speechKey,
        config.azure.speechRegion
      );
    }
  }

  async synthesize(request: TTSRequest): Promise<Buffer> {
    if (!this.speechConfig) {
      throw new Error('Azure Speech SDK not configured');
    }

    try {
      // 查找对应的引擎Voice ID
      const voiceConfig = this.conversationVoices.find(v => v.id === request.voice);
      const engineVoiceId = voiceConfig?.voiceEngineId || request.voice;

      // 设置输出格式
      const formatMap: Record<string, sdk.SpeechSynthesisOutputFormat> = {
        'mp3': sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3,
        'wav': sdk.SpeechSynthesisOutputFormat.Riff16Khz16BitMonoPcm,
        'opus': sdk.SpeechSynthesisOutputFormat.Ogg16Khz16BitMonoOpus
      };

      this.speechConfig.speechSynthesisOutputFormat = formatMap[request.format] || formatMap['mp3'];

      const synthesizer = new sdk.SpeechSynthesizer(this.speechConfig);

      // 创建SSML
      const ssml = this.createSSML(request.text, engineVoiceId, request.speed);

      return new Promise((resolve, reject) => {
        synthesizer.speakSsmlAsync(
          ssml,
          (result: any) => {
            if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
              const buffer = Buffer.from(result.audioData);
              logger.info('Azure TTS synthesis completed', {
                textLength: request.text.length,
                voice: request.voice,
                engineVoiceId,
                audioSize: buffer.length
              });
              resolve(buffer);
            } else {
              logger.error('Azure TTS synthesis failed:', result.errorDetails);
              reject(new Error(`Azure TTS synthesis failed: ${result.errorDetails}`));
            }
            synthesizer.close();
          },
          (error: any) => {
            logger.error('Azure TTS synthesis error:', error instanceof Error ? error.message : String(error));
            synthesizer.close();
            reject(error);
          }
        );
      });
    } catch (error) {
      logger.error('Azure TTS synthesis failed:', error instanceof Error ? error.message : String(error));
      throw new Error(`Azure TTS synthesis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async synthesizeWithWordBoundary(request: TTSRequest): Promise<SynthesisWithWordBoundaryResult> {
    if (!this.speechConfig) {
      throw new Error('Azure Speech SDK not configured');
    }

    try {
      const voiceConfig = this.conversationVoices.find(v => v.id === request.voice);
      const engineVoiceId = voiceConfig?.voiceEngineId || request.voice;

      const formatMap: Record<string, sdk.SpeechSynthesisOutputFormat> = {
        'mp3': sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3,
        'wav': sdk.SpeechSynthesisOutputFormat.Riff16Khz16BitMonoPcm,
        'opus': sdk.SpeechSynthesisOutputFormat.Ogg16Khz16BitMonoOpus
      };

      this.speechConfig.speechSynthesisOutputFormat = formatMap[request.format] || formatMap['mp3'];

      const synthesizer = new sdk.SpeechSynthesizer(this.speechConfig);
      const ssml = this.createSSML(request.text, engineVoiceId, request.speed, request.lang);

      const wordBoundaries: WordBoundaryEvent[] = [];

      synthesizer.wordBoundary = (_s, e) => {
        wordBoundaries.push({
          text: e.text,
          audioOffsetMs: Math.round(e.audioOffset / 10000),
          durationMs: Math.round(e.duration / 10000),
          boundaryType: String(e.boundaryType),
        });
      };

      return new Promise((resolve, reject) => {
        synthesizer.speakSsmlAsync(
          ssml,
          (result: any) => {
            if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
              const buffer = Buffer.from(result.audioData);
              logger.info('Azure TTS with word boundary completed', {
                textLength: request.text.length,
                voice: request.voice,
                engineVoiceId,
                audioSize: buffer.length,
                wordBoundaryCount: wordBoundaries.length,
              });
              resolve({ audio: buffer, wordBoundaries });
            } else {
              logger.error('Azure TTS with word boundary failed:', result.errorDetails);
              reject(new Error(`Azure TTS synthesis failed: ${result.errorDetails}`));
            }
            synthesizer.close();
          },
          (error: any) => {
            logger.error('Azure TTS with word boundary error:', error instanceof Error ? error.message : String(error));
            synthesizer.close();
            reject(error);
          }
        );
      });
    } catch (error) {
      logger.error('Azure TTS with word boundary failed:', error instanceof Error ? error.message : String(error));
      throw new Error(`Azure TTS with word boundary failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async synthesizeSSML(ssml: string, format: string): Promise<SynthesisWithBookmarksResult> {
    if (!this.speechConfig) {
      throw new Error('Azure Speech SDK not configured');
    }

    try {
      const formatMap: Record<string, sdk.SpeechSynthesisOutputFormat> = {
        'mp3': sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3,
        'wav': sdk.SpeechSynthesisOutputFormat.Riff16Khz16BitMonoPcm,
        'opus': sdk.SpeechSynthesisOutputFormat.Ogg16Khz16BitMonoOpus
      };

      this.speechConfig.speechSynthesisOutputFormat = formatMap[format] || formatMap['mp3'];

      const synthesizer = new sdk.SpeechSynthesizer(this.speechConfig);
      const bookmarks: BookmarkEvent[] = [];

      synthesizer.bookmarkReached = (_s, e) => {
        bookmarks.push({
          name: e.text,
          audioOffsetMs: Math.round(e.audioOffset / 10000),
        });
      };

      return new Promise((resolve, reject) => {
        synthesizer.speakSsmlAsync(
          ssml,
          (result: any) => {
            if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
              const buffer = Buffer.from(result.audioData);
              logger.info('Azure TTS SSML synthesis completed', {
                audioSize: buffer.length,
                bookmarkCount: bookmarks.length,
              });
              resolve({ audio: buffer, bookmarks });
            } else {
              logger.error('Azure TTS SSML synthesis failed:', result.errorDetails);
              reject(new Error(`Azure TTS SSML synthesis failed: ${result.errorDetails}`));
            }
            synthesizer.close();
          },
          (error: any) => {
            logger.error('Azure TTS SSML synthesis error:', error instanceof Error ? error.message : String(error));
            synthesizer.close();
            reject(error);
          }
        );
      });
    } catch (error) {
      logger.error('Azure TTS SSML synthesis failed:', error instanceof Error ? error.message : String(error));
      throw new Error(`Azure TTS SSML synthesis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private createSSML(text: string, voice: string, speed: number, langOverride?: string): string {
    const rate = speed < 1 ? `${Math.round((1 - speed) * 100)}%` : `+${Math.round((speed - 1) * 100)}%`;

    // 多语言声音使用 zh-CN 作为主语言
    const isMultilingual = voice.startsWith('zh-CN') && voice.includes('Multilingual');
    const lang = langOverride || (isMultilingual ? 'zh-CN' : (voice.startsWith('en-GB') ? 'en-GB' : 'en-US'));

    return `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}">
        <voice name="${voice}">
          <prosody rate="${rate}">
            ${text}
          </prosody>
        </voice>
      </speak>
    `.trim();
  }

  async getVoices(): Promise<Voice[]> {
    return this.conversationVoices;
  }

  // 根据变体筛选声音
  getVoicesByVariant(variant: 'american' | 'british' | 'multilingual'): Voice[] {
    return this.conversationVoices.filter(v => v.variant === variant);
  }

  // 根据ID获取声音
  getVoiceById(id: string): Voice | undefined {
    return this.conversationVoices.find(v => v.id === id);
  }

  async isAvailable(): Promise<boolean> {
    return !!(config.azure.speechKey && config.azure.speechRegion);
  }
}

// 豆包语音合成 TTS 引擎（V1 HTTP 接口）
const DOUBAO_TTS_V1_URL = 'https://openspeech.bytedance.com/api/v1/tts';

export class DoubaoTTSEngine implements TTSEngine {
  name = 'doubao';

  private get appId() { return config.doubao.appId; }
  private get accessToken() { return config.doubao.accessToken; }
  private get cluster() { return config.doubao.cluster; }

  // 构建 V1 请求头
  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`,
      'Resource-Id': this.cluster,
    };
  }

  // 构建 V1 请求体
  private buildPayload(text: string, voiceType: string, speed: number, format: string) {
    return {
      app: {
        appid: this.appId,
        token: 'access_token',
        cluster: this.cluster,
      },
      user: { uid: 'littlegrape' },
      audio: {
        voice_type: voiceType,
        encoding: format === 'opus' ? 'ogg_opus' : (format === 'aac' ? 'mp3' : format),
        speed_ratio: Math.max(0.2, Math.min(3.0, speed)),
        volume_ratio: 1.0,
        pitch_ratio: 1.0,
      },
      request: {
        reqid: uuidv4(),
        text,
        text_type: 'plain',
        operation: 'query',
      },
    };
  }

  // 解析 V1 响应
  private parseResponse(data: any): Buffer {
    if (data.code !== 3000) {
      throw new Error(`Doubao TTS failed [${data.code}]: ${data.message || 'unknown error'}`);
    }
    if (!data.data) {
      throw new Error('Doubao TTS returned no audio data');
    }
    return Buffer.from(data.data, 'base64');
  }

  // 豆包 V1 单次请求限制约 1000 UTF-8 字节，中文约 300 字符
  private static readonly MAX_CHUNK_CHARS = 300;

  /** 按句子边界切分长文本，每段不超过 maxChars 字符 */
  private splitText(text: string, maxChars = DoubaoTTSEngine.MAX_CHUNK_CHARS): string[] {
    if (Buffer.byteLength(text, 'utf-8') <= 1000) return [text];

    const chunks: string[] = [];
    // 按中英文句号、问号、感叹号、分号切分
    const sentences = text.split(/(?<=[。！？；.!?;])/);
    let current = '';

    for (const sent of sentences) {
      if (current.length + sent.length > maxChars && current.length > 0) {
        chunks.push(current);
        current = sent;
      } else {
        current += sent;
      }
    }
    if (current) chunks.push(current);

    // 如果有超长句子（没有标点分割），按 maxChars 强制截断
    const result: string[] = [];
    for (const chunk of chunks) {
      if (chunk.length <= maxChars) {
        result.push(chunk);
      } else {
        for (let i = 0; i < chunk.length; i += maxChars) {
          result.push(chunk.substring(i, i + maxChars));
        }
      }
    }
    return result;
  }

  /** 单段合成（不做分段） */
  private async synthesizeChunk(text: string, voiceType: string, speed: number, format: string): Promise<{ audio: Buffer; response: any }> {
    const payload = this.buildPayload(text, voiceType, speed, format);
    const response = await axios.post(DOUBAO_TTS_V1_URL, payload, {
      headers: this.buildHeaders(),
    });
    const audio = this.parseResponse(response.data);
    return { audio, response };
  }

  /** 单段合成 + frontend.words 词边界（精确时间戳） */
  private async synthesizeChunkWithWordBoundary(text: string, voiceType: string, speed: number, format: string): Promise<{ audio: Buffer; wordBoundaries: WordBoundaryEvent[]; durationMs: number }> {
    const payload = this.buildPayload(text, voiceType, speed, format);
    (payload.request as any).with_frontend = 1;
    (payload.request as any).frontend_type = 'unitTson';

    const response = await axios.post(DOUBAO_TTS_V1_URL, payload, {
      headers: this.buildHeaders(),
    });

    const audio = this.parseResponse(response.data);
    const durationMs = parseInt(response.data.addition?.duration || '0', 10);
    const wordBoundaries: WordBoundaryEvent[] = [];

    // 优先用 frontend.words（格式更清晰、直接提供词级 start_time/end_time）
    try {
      const frontendRaw = response.data.addition?.frontend;
      const frontend = typeof frontendRaw === 'string' ? JSON.parse(frontendRaw) : frontendRaw;
      if (frontend?.words && Array.isArray(frontend.words)) {
        for (const w of frontend.words) {
          if (w.unit_type !== 'text') continue; // 跳过 mark（标点/停顿）
          const startMs = Math.round(w.start_time * 1000);
          const endMs = Math.round(w.end_time * 1000);
          wordBoundaries.push({
            text: w.word,
            audioOffsetMs: startMs,
            durationMs: endMs - startMs,
            boundaryType: 'WordBoundary',
          });
        }
      }
    } catch (e) {
      logger.warn('Doubao TTS frontend.words parse failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    return { audio, wordBoundaries, durationMs };
  }

  async synthesize(request: TTSRequest): Promise<Buffer> {
    const chunks = this.splitText(request.text);

    if (chunks.length === 1) {
      const { audio } = await this.synthesizeChunk(chunks[0], request.voice, request.speed, request.format);
      logger.info('Doubao TTS synthesis completed', { textLength: request.text.length, voiceType: request.voice, audioSize: audio.length });
      return audio;
    }

    // 多段合成拼接
    const audioBuffers: Buffer[] = [];
    for (const chunk of chunks) {
      const { audio } = await this.synthesizeChunk(chunk, request.voice, request.speed, request.format);
      audioBuffers.push(audio);
    }
    const audio = Buffer.concat(audioBuffers);
    logger.info('Doubao TTS synthesis completed (chunked)', { textLength: request.text.length, chunks: chunks.length, voiceType: request.voice, audioSize: audio.length });
    return audio;
  }

  async synthesizeWithWordBoundary(request: TTSRequest): Promise<SynthesisWithWordBoundaryResult> {
    const chunks = this.splitText(request.text);
    const allAudioBuffers: Buffer[] = [];
    const allWordBoundaries: WordBoundaryEvent[] = [];
    let audioOffsetAccMs = 0;

    for (let ci = 0; ci < chunks.length; ci++) {
      const { audio, wordBoundaries, durationMs } = await this.synthesizeChunkWithWordBoundary(
        chunks[ci], request.voice, request.speed, request.format,
      );
      allAudioBuffers.push(audio);

      for (const wb of wordBoundaries) {
        allWordBoundaries.push({
          ...wb,
          audioOffsetMs: wb.audioOffsetMs + audioOffsetAccMs,
        });
      }
      // 用 API 返回的精确时长累加
      audioOffsetAccMs += durationMs;
    }

    const audio = Buffer.concat(allAudioBuffers);

    logger.info('Doubao TTS with word boundary completed', {
      textLength: request.text.length,
      chunks: chunks.length,
      voiceType: request.voice,
      audioSize: audio.length,
      wordBoundaryCount: allWordBoundaries.length,
      durationMs: audioOffsetAccMs,
    });

    return { audio, wordBoundaries: allWordBoundaries, durationMs: audioOffsetAccMs };
  }

  async synthesizeSSML(ssml: string, format: string): Promise<SynthesisWithBookmarksResult> {
    // Doubao TTS 不支持 SSML bookmark，通过逐句合成+拼接模拟
    const bookmarkRegex = /<bookmark\s+mark="([^"]+)"\s*\/>/g;
    const segments: { bookmarkName: string; text: string }[] = [];

    const prosodyMatch = ssml.match(/<prosody[^>]*>([\s\S]*?)<\/prosody>/);
    const innerContent = prosodyMatch ? prosodyMatch[1] : ssml;

    // 提取语速（SSML rate → speed 系数）
    const rateMatch = ssml.match(/rate="([^"]+)"/);
    let speed = 1.0;
    if (rateMatch) {
      const rateStr = rateMatch[1];
      if (rateStr.endsWith('%') && !rateStr.startsWith('+') && !rateStr.startsWith('-')) {
        speed = Math.max(0.2, 1 - parseInt(rateStr) / 100);
      } else if (rateStr.startsWith('+')) {
        speed = Math.min(3.0, 1 + parseInt(rateStr) / 100);
      } else if (rateStr.startsWith('-')) {
        speed = Math.max(0.2, 1 - Math.abs(parseInt(rateStr)) / 100);
      }
    }

    // 提取 speaker（从 voice name 属性）
    const voiceMatch = ssml.match(/<voice\s+name="([^"]+)"/);
    const speaker = voiceMatch ? voiceMatch[1] : '';

    // 按 bookmark 分割内容
    let lastIndex = 0;
    let match;
    while ((match = bookmarkRegex.exec(innerContent)) !== null) {
      const textBefore = innerContent.substring(lastIndex, match.index).replace(/<[^>]+>/g, '').trim();
      if (segments.length > 0 && textBefore) {
        segments[segments.length - 1].text = textBefore;
      }
      segments.push({ bookmarkName: match[1], text: '' });
      lastIndex = match.index + match[0].length;
    }
    const remainingText = innerContent.substring(lastIndex).replace(/<[^>]+>/g, '').trim();
    if (segments.length > 0 && remainingText) {
      segments[segments.length - 1].text = remainingText;
    }

    // 逐句合成并记录偏移（通过音频时长估算）
    const audioChunks: Buffer[] = [];
    const bookmarks: BookmarkEvent[] = [];
    let currentOffsetMs = 0;

    for (const segment of segments) {
      bookmarks.push({ name: segment.bookmarkName, audioOffsetMs: currentOffsetMs });
      if (!segment.text) continue;

      const payload = this.buildPayload(segment.text, speaker, speed, format);
      const response = await axios.post(DOUBAO_TTS_V1_URL, payload, {
        headers: this.buildHeaders(),
      });

      const chunkAudio = this.parseResponse(response.data);
      audioChunks.push(chunkAudio);

      // 优先用 API 返回的精确时长，降级用字节数估算
      const durationStr = response.data.addition?.duration;
      const durationMs = durationStr ? parseInt(durationStr, 10) : Math.round((chunkAudio.length / 4000) * 1000);
      currentOffsetMs += durationMs;
    }

    const audio = Buffer.concat(audioChunks);
    logger.info('Doubao TTS SSML synthesis completed', {
      audioSize: audio.length,
      bookmarkCount: bookmarks.length,
      segmentCount: segments.length,
    });

    return { audio, bookmarks };
  }

  /** 逐句合成 + 精确句级时间戳（不依赖 SSML，用 addition.duration 精确累加） */
  async synthesizeSentencesWithBookmarks(sentences: string[], voiceType: string, speed: number, format: string): Promise<SynthesisWithBookmarksResult> {
    const audioChunks: Buffer[] = [];
    const bookmarks: BookmarkEvent[] = [];
    let currentOffsetMs = 0;

    for (let i = 0; i < sentences.length; i++) {
      bookmarks.push({ name: `s${i}`, audioOffsetMs: currentOffsetMs });

      const text = sentences[i].trim();
      if (!text) continue;

      // 长句子需要分段
      const chunks = this.splitText(text);
      for (const chunk of chunks) {
        const { audio, response } = await this.synthesizeChunk(chunk, voiceType, speed, format);
        audioChunks.push(audio);
        const chunkDurationMs = parseInt(response.data.addition?.duration || '0', 10);
        currentOffsetMs += chunkDurationMs;
      }
    }

    const audio = Buffer.concat(audioChunks);
    logger.info('Doubao TTS sentences with bookmarks completed', {
      audioSize: audio.length,
      sentenceCount: sentences.length,
      bookmarkCount: bookmarks.length,
      durationMs: currentOffsetMs,
    });

    return { audio, bookmarks, durationMs: currentOffsetMs };
  }

  async getVoices(): Promise<Voice[]> {
    const data = require('@littlegrape/shared') as { characters: any[] };
    return data.characters.map((c: any) => ({
      id: c.id,
      name: c.name,
      gender: c.gender,
      language: c.voice.language,
      variant: c.voice.variant,
      accent: c.voice.accent,
      avatar: c.avatar,
      sampleAudio: '',
      description: c.description,
      voiceEngineId: c.voice.engineId,
      doubaoEngineId: c.voice.doubaoEngineId,
      defaultEngine: c.voice.defaultEngine,
    }));
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.appId && this.accessToken);
  }
}

// TTS引擎管理器（支持双引擎：azure / doubao）
export class TTSEngineManager {
  private azureEngine: AzureTTSEngine;
  private doubaoEngine: DoubaoTTSEngine;
  private defaultEngineName: TTSEngineName;

  constructor() {
    this.azureEngine = new AzureTTSEngine();
    this.doubaoEngine = new DoubaoTTSEngine();
    this.defaultEngineName = 'azure';
  }

  private getEngineByName(name: TTSEngineName): TTSEngine {
    return name === 'doubao' ? this.doubaoEngine : this.azureEngine;
  }

  private get defaultEngine(): TTSEngine {
    return this.getEngineByName(this.defaultEngineName);
  }

  setDefaultEngine(name: TTSEngineName) {
    this.defaultEngineName = name;
    logger.info(`TTS default engine set to: ${name}`);
  }

  /** 根据角色 ID 解析应使用的引擎和对应的 engineVoiceId */
  resolveVoice(voiceId: string): { engineName: TTSEngineName; engineVoiceId: string; voiceConfig?: Voice | undefined } {
    const voiceConfig = this.azureEngine.getVoiceById(voiceId);

    if (voiceConfig?.defaultEngine === 'doubao' && voiceConfig.doubaoEngineId) {
      return { engineName: 'doubao', engineVoiceId: voiceConfig.doubaoEngineId, voiceConfig };
    }
    return { engineName: 'azure', engineVoiceId: voiceConfig?.voiceEngineId || voiceId, voiceConfig };
  }

  async synthesize(request: TTSRequest, engineName?: TTSEngineName): Promise<Buffer> {
    let engine: TTSEngine;
    let actualRequest = request;

    if (engineName) {
      engine = this.getEngineByName(engineName);
    } else {
      // 自动选引擎：根据角色配置的 defaultEngine
      const resolved = this.resolveVoice(request.voice);
      engine = this.getEngineByName(resolved.engineName);
      actualRequest = { ...request, voice: resolved.engineVoiceId };
    }

    const isAvailable = await engine.isAvailable();
    if (!isAvailable) {
      throw new Error(`TTS engine ${engine.name} is not available`);
    }
    return engine.synthesize(actualRequest);
  }

  async synthesizeSSML(ssml: string, format: string = 'mp3', engineName?: TTSEngineName): Promise<SynthesisWithBookmarksResult> {
    const engine = engineName ? this.getEngineByName(engineName) : this.defaultEngine;
    const isAvailable = await engine.isAvailable();
    if (!isAvailable) {
      throw new Error(`TTS engine ${engine.name} is not available`);
    }
    return engine.synthesizeSSML(ssml, format);
  }

  async synthesizeWithWordBoundary(request: TTSRequest, engineName?: TTSEngineName): Promise<SynthesisWithWordBoundaryResult> {
    let engine: TTSEngine;
    let actualRequest = request;

    if (engineName) {
      engine = this.getEngineByName(engineName);
    } else {
      const resolved = this.resolveVoice(request.voice);
      engine = this.getEngineByName(resolved.engineName);
      actualRequest = { ...request, voice: resolved.engineVoiceId };
    }

    const isAvailable = await engine.isAvailable();
    if (!isAvailable) {
      throw new Error(`TTS engine ${engine.name} is not available`);
    }
    return engine.synthesizeWithWordBoundary(actualRequest);
  }

  /** 逐句合成 + 精确 bookmark（自动选引擎，豆包走直接逐句合成，Azure 走 SSML） */
  async synthesizeSentencesWithBookmarks(
    sentences: string[], voice: string, speed: number, format: string, langOverride?: string,
  ): Promise<SynthesisWithBookmarksResult> {
    const resolved = this.resolveVoice(voice);
    const engine = this.getEngineByName(resolved.engineName);

    // 豆包引擎：直接逐句合成，精确 duration 累加
    if (resolved.engineName === 'doubao' && engine.synthesizeSentencesWithBookmarks) {
      return engine.synthesizeSentencesWithBookmarks(sentences, resolved.engineVoiceId, speed, format);
    }

    // Azure 引擎：构建 SSML bookmark
    const engineVoiceId = resolved.engineVoiceId;
    const isMultilingual = engineVoiceId.startsWith('zh-CN') && engineVoiceId.includes('Multilingual');
    const lang = langOverride || (isMultilingual ? 'zh-CN' : (engineVoiceId.startsWith('en-GB') ? 'en-GB' : 'en-US'));
    const rate = speed < 1 ? `${Math.round((1 - speed) * 100)}%` : `+${Math.round((speed - 1) * 100)}%`;
    const sentenceSSML = sentences.map((s, i) => `<bookmark mark="s${i}"/>${s}`).join('');
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}"><voice name="${engineVoiceId}"><prosody rate="${rate}">${sentenceSSML}</prosody></voice></speak>`;
    return this.azureEngine.synthesizeSSML(ssml, format);
  }

  async getVoices(variant?: 'american' | 'british' | 'multilingual'): Promise<Voice[]> {
    const allVoices = await this.defaultEngine.getVoices();
    if (variant) {
      return allVoices.filter(v => v.variant === variant);
    }
    return allVoices;
  }

  async isAvailable(engineName?: TTSEngineName): Promise<boolean> {
    const engine = engineName ? this.getEngineByName(engineName) : this.defaultEngine;
    return engine.isAvailable();
  }

  getEngine(engineName?: TTSEngineName): TTSEngine {
    return engineName ? this.getEngineByName(engineName) : this.defaultEngine;
  }
}

// 单例实例
export const ttsEngineManager = new TTSEngineManager();
