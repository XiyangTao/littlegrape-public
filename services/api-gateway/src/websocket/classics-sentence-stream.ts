/**
 * 名著句级讲解流式 TTS
 *
 * 流程：
 *  1. Client 首条 init 消息：auth + { slug, chapterNumber, paraIndex, sentenceIndex }
 *  2. 查 BookSentence：
 *     - 命中 explainAudioUrl → emit `cached` + close（零扣配额）
 *     - 未命中但有 explainCn → 继续合成
 *     - 无 explainCn → 报错（脚本应已预生成）
 *  3. 调 speech-service /ws/tts/stream 合成单句（synthesize-sentences: [explainCn]）
 *  4. 中转 `audio` 消息给 client，同时累积 PCM 字节
 *  5. speech-service `completed` → PCM→MP3 → OSS 上传 → 回填 BookSentence.explainAudioUrl → emit `done` + close
 *
 * 单句合成不做 bookmark 跟踪、不做分批（讲解文本远小于段落上限）
 * 扣费：整句合成触发一次，按 explainCn 字符数计
 */
import WebSocket from 'ws';
import { registerWebSocketRoute } from './index';
import { AuthService } from '@/services/authService';
import {
  getSentenceForAudio,
  updateSentenceAudio,
  updateSentenceExplainAudio,
} from '@/services/classicsService';
import { checkClassicsAccess } from '@/services/classicsAccessService';
import { OSSService } from '@/services/ossService';
import { recordUsage } from '@/services/usageService';
import { checkQuotaAvailable } from '@/services/quotaService';
import { pcmToMp3 } from '@/utils/pcmToMp3';
import { config } from '@/config';
import { logger } from '@/utils/logger';

type Track = 'en' | 'ai';

// 双轨音色：英文原文朗读走英文音色（Azure 自动切换），中文讲解走 annie（中文女声）
const VOICE = 'annie'; // annie 同时支持中英文混合朗读
const SAMPLE_RATE = 16000;

interface InitMessage {
  type: 'init';
  token: string;
  slug: string;
  chapterNumber: number;
  paraIndex: number;
  sentenceIndex: number;
  track?: Track; // 新增：默认 'ai'（向后兼容）
}

function sendMessage(ws: WebSocket, payload: object): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function getSpeechWsUrl(): string {
  const httpUrl = config.services.speechService.url;
  return httpUrl.replace(/^http/, 'ws') + '/ws/tts/stream';
}

export function setupClassicsSentenceStream() {
  registerWebSocketRoute('/ws/classics/sentence-stream', (clientWs) => {
    let initialized = false;
    let userId: string | null = null;
    let upstream: WebSocket | null = null;
    let closed = false;
    let track: Track = 'ai';
    let sentenceId = '';
    let synthesisText = ''; // en 轨：text；ai 轨：explainCn
    const pcmChunks: Buffer[] = [];
    let charged = false;
    let synthesisCompleted = false;

    const authTimer = setTimeout(() => {
      if (!initialized && clientWs.readyState === WebSocket.OPEN) {
        sendMessage(clientWs, { type: 'error', error: '初始化超时' });
        clientWs.close(4001);
      }
    }, 5000);

    const cleanup = () => {
      if (closed) return;
      closed = true;
      clearTimeout(authTimer);
      if (upstream && upstream.readyState === WebSocket.OPEN) {
        try { upstream.close(); } catch { /* ignore */ }
      }
      if (clientWs.readyState === WebSocket.OPEN) {
        try { clientWs.close(); } catch { /* ignore */ }
      }
    };

    const chargeOnce = () => {
      if (!userId || !synthesisText) return;
      if (charged) {
        // 幂等保护：upstream 的 completed 事件可能重发（网络/异常恢复），只扣一次
        logger.debug('classics-sentence-stream chargeOnce skipped (already charged)', { userId, sentenceId });
        return;
      }
      charged = true;
      recordUsage(userId, 'tts', synthesisText.length).catch((err) => {
        logger.error('classics-sentence-stream 扣费失败', { error: err });
      });
    };

    const handleCompleted = async () => {
      if (closed) return;
      const pcmBuffer = Buffer.concat(pcmChunks);
      try {
        const mp3Buffer = await pcmToMp3(pcmBuffer, SAMPLE_RATE, 1);
        const ts = Date.now();
        const suffix = track === 'en' ? 'en' : 'ai';
        const filename = `classics_sent_${suffix}_${sentenceId}_${ts}.mp3`;
        const uploadResult = await OSSService.uploadFile(mp3Buffer, filename, 'audio/mpeg', { folder: 'audio' });
        if (!uploadResult.success || !uploadResult.cdnUrl) {
          throw new Error(`OSS 上传失败: ${uploadResult.error}`);
        }
        if (track === 'en') {
          await updateSentenceAudio(sentenceId, uploadResult.cdnUrl);
        } else {
          await updateSentenceExplainAudio(sentenceId, uploadResult.cdnUrl);
        }
        sendMessage(clientWs, { type: 'done', audioUrl: uploadResult.cdnUrl });
      } catch (err) {
        logger.error('classics-sentence-stream 后处理失败（不中断客户端播放）', {
          userId,
          sentenceId,
          track,
          error: err instanceof Error ? err.message : err,
        });
        sendMessage(clientWs, { type: 'done', audioUrl: null });
      } finally {
        cleanup();
      }
    };

    const startSynthesis = () => {
      const upstreamUrl = getSpeechWsUrl();
      upstream = new WebSocket(upstreamUrl);

      upstream.on('open', () => {
        sendMessage(upstream!, {
          type: 'config',
          config: { voice: VOICE, format: 'pcm', speed: 1.0 },
        });
      });

      upstream.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          switch (msg.type) {
            case 'started':
              sendMessage(clientWs, { type: 'started' });
              // 单句合成：synthesisText 整体作为 sentences 数组唯一元素
              sendMessage(upstream!, { type: 'synthesize-sentences', sentences: [synthesisText] });
              break;
            case 'audio':
              if (msg.audio) {
                const chunk = Buffer.from(msg.audio, 'base64');
                pcmChunks.push(chunk);
                sendMessage(clientWs, { type: 'audio', audio: msg.audio });
              }
              break;
            case 'completed':
              chargeOnce();
              synthesisCompleted = true;
              handleCompleted();
              break;
            case 'error':
              sendMessage(clientWs, { type: 'error', error: msg.error ?? '合成失败' });
              cleanup();
              break;
            // 句级合成不处理 bookmark：单句讲解内部不需要高亮切换
          }
        } catch (err) {
          logger.error('classics-sentence-stream 上游消息解析失败', { error: err });
        }
      });

      upstream.on('error', (err) => {
        logger.error('classics-sentence-stream 上游错误', { error: err.message });
        sendMessage(clientWs, { type: 'error', error: '合成服务不可用' });
        cleanup();
      });

      upstream.on('close', () => {
        // 优雅关闭（如 speech-service 重启）：close 事件不伴随 error 事件，
        // 若此时 completed 尚未到达（closed 仍为 false），视为异常并通知客户端
        if (!closed && !synthesisCompleted) {
          logger.warn('classics-sentence-stream 上游提前关闭（未收到 completed）', { userId, sentenceId, track });
          sendMessage(clientWs, { type: 'error', error: '合成服务提前断开' });
          cleanup();
        }
      });
    };

    clientWs.on('message', async (data) => {
      if (initialized) return;
      let msg: InitMessage;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        sendMessage(clientWs, { type: 'error', error: 'init 消息格式错误' });
        clientWs.close(4001);
        return;
      }

      if (
        msg.type !== 'init' ||
        !msg.token ||
        !msg.slug ||
        typeof msg.chapterNumber !== 'number' ||
        typeof msg.paraIndex !== 'number' ||
        typeof msg.sentenceIndex !== 'number'
      ) {
        sendMessage(clientWs, { type: 'error', error: '缺少 init 字段' });
        clientWs.close(4001);
        return;
      }

      const decoded = AuthService.verifyToken(msg.token, 'access');
      if (!decoded) {
        sendMessage(clientWs, { type: 'error', code: 'INVALID_TOKEN', error: '认证失败' });
        clientWs.close(4001);
        return;
      }

      userId = decoded.userId;
      track = msg.track === 'en' ? 'en' : 'ai'; // 默认 ai，向后兼容
      clearTimeout(authTimer);
      initialized = true;

      // 会员权限：Free 用户无法使用朗读/讲解（前端已 guard，这里是防绕过）
      const access = await checkClassicsAccess(userId, 'listen');
      if (!access.allowed) {
        logger.info('classics-sentence-stream upgrade required', { userId, track });
        sendMessage(clientWs, {
          type: 'error',
          error: 'UPGRADE_REQUIRED',
          upgradeRequired: true,
        });
        cleanup();
        return;
      }

      // 配额检查（缓存命中也拒绝，保持体验一致）
      try {
        const quotaResult = await checkQuotaAvailable(userId);
        if (!quotaResult.available) {
          logger.info('classics-sentence-stream 配额不足', { userId });
          sendMessage(clientWs, {
            type: 'error',
            error: quotaResult.message ?? '用量已达上限',
            quotaExceeded: true,
          });
          cleanup();
          return;
        }
      } catch (err) {
        logger.error('classics-sentence-stream 配额检查失败', { userId, error: err });
        sendMessage(clientWs, { type: 'error', error: '系统繁忙，请稍后重试' });
        cleanup();
        return;
      }

      // 查 BookSentence
      const sentence = await getSentenceForAudio(
        msg.slug,
        msg.chapterNumber,
        msg.paraIndex,
        msg.sentenceIndex,
      );
      if (!sentence) {
        sendMessage(clientWs, { type: 'error', error: '句子不存在' });
        cleanup();
        return;
      }

      // 按 track 分支：en 用 audioUrl + text；ai 用 explainAudioUrl + explainCn
      const cachedUrl = track === 'en' ? sentence.audioUrl : sentence.explainAudioUrl;
      const textToSynthesize = track === 'en' ? sentence.text : sentence.explainCn;

      // 缓存命中：直接返回 URL
      if (cachedUrl) {
        sendMessage(clientWs, { type: 'cached', audioUrl: cachedUrl });
        cleanup();
        return;
      }

      // 未命中但无合成文本：报错
      if (!textToSynthesize) {
        logger.warn('classics-sentence-stream 缺合成文本', {
          userId,
          track,
          slug: msg.slug,
          chapterNumber: msg.chapterNumber,
          paraIndex: msg.paraIndex,
          sentenceIndex: msg.sentenceIndex,
        });
        sendMessage(clientWs, {
          type: 'error',
          error: track === 'en' ? '原文缺失' : '讲解文本尚未生成',
        });
        cleanup();
        return;
      }

      sentenceId = sentence.id;
      synthesisText = textToSynthesize;

      logger.info('classics-sentence-stream 启动合成', {
        userId,
        track,
        sentenceId,
        textLen: synthesisText.length,
      });

      startSynthesis();
    });

    clientWs.on('close', cleanup);
    clientWs.on('error', (err) => {
      logger.error('classics-sentence-stream 客户端错误', { error: err.message });
      cleanup();
    });
  });
}
