import { config } from '@/config';
import { registerStreamHandler } from './index';
import { logger } from '@/utils/logger';
import { recordUsage } from '@/services/usageService';

/** PCM 16kHz, 16-bit, 单声道 = 32000 bytes/秒（客户端估算兜底用） */
const PCM_BYTES_PER_SECOND = 32000;

/** speech-service 从 Volcano UsageResponse 解析后转发的 billing 格式 */
interface VolcanoBillingChunk {
  durationMs: number;
  wordCount: number;
  items: Array<{ unit: string; quantity: number }>;
}

/** 连接级累计值 */
interface BillingAccumulator {
  totalDurationMs: number;
  totalWordCount: number;
  /** 按 Unit 分组累加的 token 数（input_audio_tokens / output_text_tokens / output_audio_tokens） */
  tokensByUnit: Record<string, number>;
}

function mergeBilling(acc: BillingAccumulator, chunk: VolcanoBillingChunk) {
  acc.totalDurationMs += Number.isFinite(chunk.durationMs) ? chunk.durationMs : 0;
  acc.totalWordCount += Number.isFinite(chunk.wordCount) ? chunk.wordCount : 0;
  for (const it of chunk.items || []) {
    if (!it.unit) continue;
    acc.tokensByUnit[it.unit] = (acc.tokensByUnit[it.unit] || 0) + (Number.isFinite(it.quantity) ? it.quantity : 0);
  }
}

export function setupInterpretationStreamProxy() {
  const speechServiceUrl = config.services.speechService.url;
  const wsUrl = speechServiceUrl.replace(/^http/, 'ws') + '/ws/interpretation/stream';

  registerStreamHandler({
    path: '/ws/interpretation/stream',
    target: wsUrl,
    label: 'Interpretation',
    requiredFeature: 'voiceTranslation',
    // 客户端→上游：记录 mode + 兜底音频字节数
    extractUsage: (msg, metadata) => {
      if (msg.type === 'config' && msg.config?.mode) {
        metadata.mode = msg.config.mode;
      }
      return (msg.type === 'audio' && msg.audio) ? Math.floor(msg.audio.length * 3 / 4) : 0;
    },
    // 上游→客户端：截获 speech-service 转发的 Volcano billing，连接级累加
    extractUpstreamUsage: (msg, metadata) => {
      if (msg?.type !== 'usage' || !msg.billing) return;
      if (!metadata.billingAcc) {
        metadata.billingAcc = {
          totalDurationMs: 0,
          totalWordCount: 0,
          tokensByUnit: {},
        } as BillingAccumulator;
      }
      mergeBilling(metadata.billingAcc as BillingAccumulator, msg.billing as VolcanoBillingChunk);
    },
    onComplete: (userId, fallbackAudioBytes, metadata) => {
      if (!userId) return;

      const mode = metadata.mode === 's2s' ? 's2s' : 's2t';
      const acc = metadata.billingAcc as BillingAccumulator | undefined;

      // 优先使用火山精确 token 计费——三种 token 分别记账，与火山账单完全对齐
      if (acc && (acc.tokensByUnit.input_audio_tokens > 0 || acc.tokensByUnit.output_text_tokens > 0 || acc.tokensByUnit.output_audio_tokens > 0)) {
        const input = acc.tokensByUnit.input_audio_tokens || 0;
        const outputText = acc.tokensByUnit.output_text_tokens || 0;
        const outputAudio = acc.tokensByUnit.output_audio_tokens || 0;
        logger.info('Recording interpretation usage (volcano per-token)', {
          userId,
          mode,
          totalDurationMs: acc.totalDurationMs,
          input_audio_tokens: input,
          output_text_tokens: outputText,
          output_audio_tokens: outputAudio,
        });
        if (input > 0) {
          recordUsage(userId, 'interpretation_input_audio_tokens', input).catch(err => logger.error('记录同传用量失败 (input):', err));
        }
        if (outputText > 0) {
          recordUsage(userId, 'interpretation_output_text_tokens', outputText).catch(err => logger.error('记录同传用量失败 (output_text):', err));
        }
        if (outputAudio > 0) {
          recordUsage(userId, 'interpretation_output_audio_tokens', outputAudio).catch(err => logger.error('记录同传用量失败 (output_audio):', err));
        }
        return;
      }

      // 兜底：火山未回推 billing（极罕见的协议异常）。
      // 只打警告，不记账——避免用错误估算污染数据库。
      const audioDurationMs = Math.round((fallbackAudioBytes / PCM_BYTES_PER_SECOND) * 1000);
      logger.warn('Interpretation session has no volcano billing, skip recording', {
        userId,
        mode,
        audioBytes: fallbackAudioBytes,
        audioDurationMs,
      });
    },
  });
}
