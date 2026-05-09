import { WebSocket } from 'ws';
import * as crypto from 'crypto';
import { config } from '@/config';
import { logger } from '@/utils/logger';

/**
 * 讯飞语音评测 WebSocket 流式接口
 *
 * API 文档: https://www.xfyun.cn/doc/Ise/IseAPI.html
 *
 * 支持的评测类型:
 * - read_syllable: 单字朗读
 * - read_word: 词语朗读
 * - read_sentence: 句子朗读
 * - read_chapter: 篇章朗读
 */

// ============ 类型定义 ============

export interface XunfeiPronunciationConfig {
  /** 参考文本 */
  referenceText: string;
  /** 语言: en_us(英语), zh_cn(中文)，也支持 en-US, zh-CN 等格式 */
  language?: string;
  /** 评测类型 */
  category?: 'read_syllable' | 'read_word' | 'read_sentence' | 'read_chapter';
  /** 结果格式: xml, json, plain */
  resultFormat?: 'xml' | 'json' | 'plain';
}

export interface XunfeiPronunciationMessage {
  type: 'connect' | 'config' | 'audio' | 'stop' | 'ping';
  config?: XunfeiPronunciationConfig;
  audio?: string; // base64 编码的 PCM 音频
}

export interface PhonemeResult {
  phoneme: string;
  accuracyScore: number;
  /** 音素在参考文本中的位置 */
  dpMessage?: number;
}

export interface WordAssessmentResult {
  word: string;
  accuracyScore: number;
  /** 单词时长(帧) */
  timeLength?: number;
  /** 起始帧 */
  beginTime?: number;
  /** 结束帧 */
  endTime?: number;
  phonemes?: PhonemeResult[];
}

export interface SentenceAssessmentResult {
  content: string;
  accuracyScore: number;
  fluencyScore: number;
  integrityScore: number;
  words: WordAssessmentResult[];
}

export interface AssessmentResult {
  /** 总分 (0-100) */
  totalScore: number;
  /** 准确度分 */
  accuracyScore: number;
  /** 流利度分 */
  fluencyScore: number;
  /** 完整度分 */
  integrityScore: number;
  /** 标准度分 (仅英文) */
  phoneScore?: number | undefined;
  /** 语调分 (仅英文) */
  toneScore?: number | undefined;
  sentences?: SentenceAssessmentResult[] | undefined;
  words?: WordAssessmentResult[] | undefined;
}

/** 前端期望的单词评测结果格式 */
export interface FrontendWordResult {
  word: string;
  accuracyScore: number;
  errorType: 'None' | 'Mispronunciation' | 'Omission' | 'Insertion';
  phonemes?: Array<{ phoneme: string; accuracyScore: number }> | undefined;
}

/** 前端期望的累计评测结果格式 */
export interface FrontendAssessmentResult {
  pronunciationScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  prosodyScore?: number | undefined;
  words: FrontendWordResult[];
  recognizedText: string;
}

export interface XunfeiPronunciationResponse {
  type: 'connected' | 'ready' | 'assessing' | 'assessed' | 'finalResult' | 'error' | 'stopped' | 'pong';
  requestId?: string;
  /** 中间识别文本 */
  recognizedText?: string;
  /** 评测结果（讯飞原始格式） */
  assessment?: AssessmentResult | undefined;
  /** 累计评测结果（前端期望格式） */
  cumulativeAssessment?: FrontendAssessmentResult;
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
   * @param host API 主机
   * @param path API 路径
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

// ============ 讯飞语音评测会话 ============

export class XunfeiPronunciationSession {
  private clientWs: WebSocket; // 客户端 WebSocket
  private xunfeiWs: WebSocket | null = null; // 讯飞 WebSocket
  private sessionId: string;
  private requestId: string = '';
  private config: XunfeiPronunciationConfig | null = null;
  private auth: XunfeiAuth;
  private isStarted: boolean = false;
  private isStopping: boolean = false;
  private frameIndex: number = 0;
  private isFirstAudioFrame: boolean = true;

  // 讯飞语音评测 API 地址
  private static readonly API_HOST = 'ise-api.xfyun.cn';
  private static readonly API_PATH = '/v2/open-ise';

  constructor(ws: WebSocket) {
    this.clientWs = ws;
    this.sessionId = this.generateId('session');
    this.auth = new XunfeiAuth();
    this.setupClientHandlers();

    logger.info('Xunfei Pronunciation session created', { sessionId: this.sessionId });
    this.sendToClient({ type: 'connected' });
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupClientHandlers(): void {
    this.clientWs.on('message', async (data: Buffer | string) => {
      try {
        const message: XunfeiPronunciationMessage = JSON.parse(
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

  private async handleClientMessage(message: XunfeiPronunciationMessage): Promise<void> {
    switch (message.type) {
      case 'connect':
        this.sendToClient({ type: 'connected' });
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
        this.sendToClient({ type: 'pong' });
        break;
      default:
        this.sendError(`Unknown message type: ${(message as any).type}`);
    }
  }

  private async handleConfig(cfg: XunfeiPronunciationConfig): Promise<void> {
    if (!cfg.referenceText) {
      this.sendError('referenceText is required');
      return;
    }

    // 清理之前的连接
    this.cleanupXunfei();

    this.requestId = this.generateId('req');
    this.config = cfg;
    this.frameIndex = 0;
    this.isStopping = false;
    this.isFirstAudioFrame = true;

    logger.info('Xunfei Pronunciation config received', {
      sessionId: this.sessionId,
      requestId: this.requestId,
      referenceText: cfg.referenceText.substring(0, 50),
      language: cfg.language
    });

    // 连接讯飞 WebSocket
    await this.connectToXunfei();
  }

  private async connectToXunfei(): Promise<void> {
    try {
      const authUrl = this.auth.generateAuthUrl(
        XunfeiPronunciationSession.API_HOST,
        XunfeiPronunciationSession.API_PATH
      );

      logger.debug('Connecting to Xunfei', { requestId: this.requestId });

      this.xunfeiWs = new WebSocket(authUrl);

      this.xunfeiWs.on('open', () => {
        logger.info('Xunfei WebSocket connected', { requestId: this.requestId });
        this.isStarted = true;
        // 发送首帧（包含配置）
        this.sendFirstFrame();
        this.sendToClient({ type: 'ready', requestId: this.requestId });
      });

      this.xunfeiWs.on('message', (data: Buffer | string) => {
        this.handleXunfeiMessage(data);
      });

      this.xunfeiWs.on('close', (code, reason) => {
        logger.info('Xunfei WebSocket closed', {
          requestId: this.requestId,
          code,
          reason: reason.toString()
        });
        if (!this.isStopping) {
          this.sendToClient({ type: 'stopped', requestId: this.requestId });
        }
      });

      this.xunfeiWs.on('error', (error) => {
        logger.error('Xunfei WebSocket error', { requestId: this.requestId, error });
        this.sendError(`Xunfei connection error: ${error.message}`);
      });

    } catch (error) {
      logger.error('Failed to connect to Xunfei', { requestId: this.requestId, error });
      this.sendError(`Failed to connect: ${error}`);
    }
  }

  /**
   * 发送首帧 - 包含业务参数
   */
  private sendFirstFrame(): void {
    if (!this.xunfeiWs || !this.config) return;

    // 语言代码映射：前端使用 en-US/zh-CN，讯飞使用 en_us/zh_cn
    let language = this.config.language || 'en_us';
    if (language === 'en-US' || language === 'en') {
      language = 'en_us';
    } else if (language === 'zh-CN' || language === 'zh') {
      language = 'zh_cn';
    }

    const category = this.config.category || this.detectCategory(this.config.referenceText);

    const firstFrame = {
      common: {
        app_id: this.auth.appIdValue
      },
      business: {
        // 评测服务类型
        sub: 'ise',
        // 中文:cn_vip, 英文:en_vip
        ent: language === 'zh_cn' ? 'cn_vip' : 'en_vip',
        // 评测类型
        category: category,
        // 参考文本 (带标签格式，UTF-8 含 BOM，直接字符串)
        text: this.formatText(this.config.referenceText, category, language),
        // 文本编码: utf-8
        tte: 'utf-8',
        // 跳过ttp直接使用ssb发送音频
        cmd: 'ssb',
        // 跳过文本传输阶段，直接使用首帧的 text
        ttp_skip: true,
        // 音频格式: raw(pcm)
        aue: 'raw',
        // 音频采样率
        auf: 'audio/L16;rate=16000',
        // 返回结果编码: utf8 或 gbk
        rstcd: 'utf8',
        // 返回结果格式: entirety(完整)、plain(精简)
        rst: 'entirety'
      },
      data: {
        // 音频状态: 0-首帧, 1-中间帧, 2-尾帧
        status: 0
      }
    };

    const frameJson = JSON.stringify(firstFrame);
    this.xunfeiWs.send(frameJson);
    this.frameIndex = 1;

    // 日志输出（跳过 BOM 字符）
    logger.info('Sent first frame to Xunfei', {
      requestId: this.requestId,
      category,
      language,
      ent: firstFrame.business.ent,
      referenceText: this.config.referenceText,
      formattedText: firstFrame.business.text.substring(1, 150) // 跳过 BOM 字符 \uFEFF
    });
  }

  /**
   * 根据文本长度自动检测评测类型
   * 注意：单个单词也使用 read_sentence，因为 read_word 对格式要求更严格
   */
  private detectCategory(text: string): string {
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount <= 20) {
      // 单词和短句都使用 read_sentence
      return 'read_sentence';
    } else {
      return 'read_chapter';
    }
  }

  /**
   * 格式化文本为讯飞要求的格式
   *
   * 英文评测文本格式要求：
   * - read_word: [word]\n单词
   * - read_sentence: [content]\n句子内容
   * - read_chapter: [content]\n段落内容
   *
   * 中文评测使用纯文本格式，不需要标签
   *
   * 文本前需添加 UTF-8 BOM (\uFEFF)
   *
   * 注意：text 参数是字符串，不是 base64 编码！
   */
  private formatText(text: string, category: string, language: string): string {
    let formattedText: string;

    if (language === 'zh_cn') {
      // 中文评测：纯文本格式
      formattedText = text;
    } else {
      // 英文评测：需要标签格式
      if (category === 'read_word' || category === 'read_syllable') {
        // 单词朗读格式
        formattedText = `[word]\n${text}`;
      } else {
        // 句子/篇章朗读格式
        formattedText = `[content]\n${text}`;
      }
    }

    // 添加 UTF-8 BOM 字符 \uFEFF
    return '\uFEFF' + formattedText;
  }

  /**
   * 处理音频数据
   */
  private handleAudio(audioBase64: string): void {
    if (!this.xunfeiWs || !this.isStarted) {
      logger.warn('Received audio before ready', { requestId: this.requestId });
      return;
    }

    if (this.isStopping) {
      return;
    }

    try {
      // 发送音频帧
      // 讯飞语音评测要求：
      // - business.cmd = "auw" (音频上传)
      // - business.aus = 1 (首帧音频) 或 2 (中间音频) 或 4 (尾帧音频)
      // - data.status = 1 (音频传输中)
      // - data.data = base64编码的音频 (注意字段名是 data 不是 audio)
      const aus = this.isFirstAudioFrame ? 1 : 2;

      const audioFrame = {
        business: {
          cmd: 'auw',
          aus: aus
        },
        data: {
          status: 1, // 音频传输中
          data: audioBase64
        }
      };

      this.xunfeiWs.send(JSON.stringify(audioFrame));
      this.isFirstAudioFrame = false;
      this.frameIndex++;

      if (this.frameIndex <= 3 || this.frameIndex % 50 === 0) {
        logger.debug('Sent audio frame to Xunfei', {
          requestId: this.requestId,
          frameIndex: this.frameIndex,
          aus: aus
        });
      }
    } catch (error) {
      logger.error('Failed to send audio to Xunfei', { requestId: this.requestId, error });
    }
  }

  /**
   * 处理停止请求
   */
  private handleStop(): void {
    if (this.isStopping) return;
    this.isStopping = true;

    logger.info('Stop requested', {
      requestId: this.requestId,
      totalFrames: this.frameIndex
    });

    if (this.xunfeiWs && this.xunfeiWs.readyState === WebSocket.OPEN) {
      // 发送尾帧
      // aus = 4 表示最后一帧
      const lastFrame = {
        business: {
          cmd: 'auw',
          aus: 4  // 4: 最后一帧
        },
        data: {
          status: 2, // 尾帧
          data: ''
        }
      };
      this.xunfeiWs.send(JSON.stringify(lastFrame));
      logger.debug('Sent last frame to Xunfei', { requestId: this.requestId });
    }
  }

  /**
   * 处理讯飞返回的消息
   */
  private handleXunfeiMessage(data: Buffer | string): void {
    try {
      const response = JSON.parse(typeof data === 'string' ? data : data.toString('utf-8'));

      logger.debug('Received Xunfei response', {
        requestId: this.requestId,
        code: response.code,
        message: response.message
      });

      // 检查错误
      if (response.code !== 0) {
        logger.error('Xunfei API error', {
          requestId: this.requestId,
          code: response.code,
          message: response.message
        });
        this.sendError(`Xunfei error: ${response.message} (code: ${response.code})`);
        return;
      }

      // 解析评测结果
      if (response.data) {
        const status = response.data.status;
        const result = response.data.data;

        if (result) {
          // 解码 Base64 结果
          const decodedResult = Buffer.from(result, 'base64').toString('utf-8');

          const assessment = this.parseAssessmentResult(decodedResult);

          if (status === 2) {
            // 最终结果 - 转换为前端期望的格式
            logger.info('Xunfei final result received', {
              requestId: this.requestId,
              totalScore: assessment?.totalScore,
              accuracyScore: assessment?.accuracyScore,
              fluencyScore: assessment?.fluencyScore,
              wordsCount: assessment?.words?.length
            });

            // 转换为前端期望的 PronunciationAssessmentResult 格式
            // 讯飞分数是 0-5，转换为 0-100
            const toPercent = (score: number) => Math.round(score * 20);

            const cumulativeAssessment: FrontendAssessmentResult = {
              pronunciationScore: toPercent(assessment.totalScore),
              accuracyScore: toPercent(assessment.accuracyScore),
              fluencyScore: toPercent(assessment.fluencyScore),
              completenessScore: toPercent(assessment.integrityScore),
              prosodyScore: assessment.toneScore ? toPercent(assessment.toneScore) : undefined,
              words: (assessment.words || []).map(w => ({
                word: w.word,
                accuracyScore: w.accuracyScore, // 音素已经是 0-100
                errorType: 'None' as const,
                phonemes: w.phonemes ? w.phonemes.map(p => ({
                  phoneme: p.phoneme,
                  accuracyScore: p.accuracyScore
                })) : undefined
              })),
              recognizedText: this.config?.referenceText || ''
            };

            this.sendToClient({
              type: 'finalResult',
              requestId: this.requestId,
              cumulativeAssessment,
              isFinal: true
            });

            // 关闭连接
            this.cleanupXunfei();
            this.sendToClient({ type: 'stopped', requestId: this.requestId });
          } else {
            // 中间结果
            this.sendToClient({
              type: 'assessed',
              requestId: this.requestId,
              assessment,
              recognizedText: this.config?.referenceText || '',
              isFinal: false
            });
          }
        }
      }
    } catch (error) {
      logger.error('Failed to parse Xunfei response', { requestId: this.requestId, error });
    }
  }

  /**
   * 解析讯飞返回的评测结果 (XML 格式)
   */
  private parseAssessmentResult(xmlResult: string): AssessmentResult {
    try {
      // 讯飞返回的是 XML 格式，需要解析
      // 简化处理：使用正则提取关键分数

      const getScore = (tag: string): number => {
        const match = xmlResult.match(new RegExp(`<${tag}>([\\d.]+)</${tag}>`));
        return match ? parseFloat(match[1]) : 0;
      };

      const getAttr = (tag: string, attr: string): number => {
        const match = xmlResult.match(new RegExp(`<${tag}[^>]*${attr}="([\\d.]+)"`));
        return match ? parseFloat(match[1]) : 0;
      };

      // 提取各项分数
      const totalScore = getAttr('read_chapter', 'total_score') ||
                         getAttr('read_sentence', 'total_score') ||
                         getAttr('read_word', 'total_score') ||
                         getScore('total_score');

      const accuracyScore = getAttr('read_chapter', 'accuracy_score') ||
                           getAttr('read_sentence', 'accuracy_score') ||
                           getScore('accuracy_score');

      const fluencyScore = getAttr('read_chapter', 'fluency_score') ||
                          getAttr('read_sentence', 'fluency_score') ||
                          getScore('fluency_score');

      const integrityScore = getAttr('read_chapter', 'integrity_score') ||
                            getAttr('read_sentence', 'integrity_score') ||
                            getScore('integrity_score');

      // 英文特有分数
      const phoneScore = getScore('phone_score');
      const toneScore = getScore('tone_score');

      // 解析单词级结果
      const words = this.parseWords(xmlResult);

      return {
        totalScore: Number(totalScore.toFixed(1)),
        accuracyScore: Number(accuracyScore.toFixed(1)),
        fluencyScore: Number(fluencyScore.toFixed(1)),
        integrityScore: Number(integrityScore.toFixed(1)),
        phoneScore: phoneScore > 0 ? Number(phoneScore.toFixed(1)) : undefined,
        toneScore: toneScore > 0 ? Number(toneScore.toFixed(1)) : undefined,
        words
      };
    } catch (error) {
      logger.error('Failed to parse assessment XML', { requestId: this.requestId, error });
      return {
        totalScore: 0,
        accuracyScore: 0,
        fluencyScore: 0,
        integrityScore: 0,
        words: []
      };
    }
  }

  /**
   * 解析单词级评测结果
   *
   * XML 格式：
   * <word content="language" total_score="4.786674" dp_message="0" ...>
   */
  private parseWords(xmlResult: string): WordAssessmentResult[] {
    const words: WordAssessmentResult[] = [];

    // 匹配 word 标签，提取 content 和 total_score
    // 注意：属性顺序可能不同，使用两个独立的正则
    const wordTagRegex = /<word[^>]+>/g;
    let tagMatch;

    while ((tagMatch = wordTagRegex.exec(xmlResult)) !== null) {
      const tag = tagMatch[0];

      // 提取 content
      const contentMatch = tag.match(/content="([^"]*)"/);
      if (!contentMatch) continue;
      const word = contentMatch[1];

      // 提取 total_score（讯飞的 0-5 分）
      const scoreMatch = tag.match(/total_score="([\d.]+)"/);
      const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;

      // 讯飞分数是 0-5，转换为 0-100
      const accuracyScore = Math.round(score * 20);

      // 提取该单词的音素
      const phonemes = this.parsePhonemes(xmlResult, word);

      words.push({
        word,
        accuracyScore,
        phonemes
      });
    }

    return words;
  }

  /**
   * 解析音素级评测结果
   *
   * dp_message 含义：
   * - 0: 正确
   * - 16: 漏读
   * - 32: 增读
   * - 64: 回读
   * - 128: 替换
   *
   * gwpp: 发音质量评分（负数，越接近0越好）
   */
  private parsePhonemes(xmlResult: string, _word: string): PhonemeResult[] {
    const phonemes: PhonemeResult[] = [];

    // 匹配 phone 标签
    const phoneTagRegex = /<phone[^>]+>/g;
    let tagMatch;

    while ((tagMatch = phoneTagRegex.exec(xmlResult)) !== null) {
      const tag = tagMatch[0];

      // 提取 content（音素）
      const contentMatch = tag.match(/content="([^"]*)"/);
      if (!contentMatch) continue;

      // 提取 dp_message
      const dpMatch = tag.match(/dp_message="(\d+)"/);
      const dpMessage = dpMatch ? parseInt(dpMatch[1]) : 0;

      // 提取 gwpp（发音质量评分）
      const gwppMatch = tag.match(/gwpp="([-\d.]+)"/);
      const gwpp = gwppMatch ? parseFloat(gwppMatch[1]) : 0;

      // 计算准确度分数
      let accuracyScore: number;
      if (dpMessage !== 0) {
        // 有发音错误
        if (dpMessage === 16) accuracyScore = 0;       // 漏读
        else if (dpMessage === 32) accuracyScore = 30; // 增读
        else if (dpMessage === 64) accuracyScore = 50; // 回读
        else if (dpMessage === 128) accuracyScore = 40; // 替换
        else accuracyScore = 50;
      } else {
        // 根据 gwpp 计算分数：gwpp 范围大约 -10 到 0，0 最好
        // 转换为 0-100 分数
        accuracyScore = Math.max(0, Math.min(100, Math.round(100 + gwpp * 20)));
      }

      phonemes.push({
        phoneme: contentMatch[1],
        accuracyScore,
        dpMessage
      });
    }

    return phonemes;
  }

  private sendToClient(response: XunfeiPronunciationResponse): void {
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
 * 创建讯飞语音评测会话
 */
export function createXunfeiPronunciationSession(ws: WebSocket): XunfeiPronunciationSession {
  return new XunfeiPronunciationSession(ws);
}

/**
 * 检查讯飞服务是否可用
 */
export function isXunfeiAvailable(): boolean {
  return !!(config.xunfei.appId && config.xunfei.apiKey && config.xunfei.apiSecret);
}
