import { config } from '@/config';
import { registerStreamHandler } from './index';
import { logger } from '@/utils/logger';
import { recordUsage } from '@/services/usageService';

/** PCM 16kHz, 16-bit, 单声道 = 32000 bytes/秒 */
const PCM_BYTES_PER_SECOND = 32000;

export function setupASRStreamProxy() {
  const speechServiceUrl = config.services.speechService.url;
  const wsUrl = speechServiceUrl.replace(/^http/, 'ws') + '/ws/asr/stream';

  registerStreamHandler({
    path: '/ws/asr/stream',
    target: wsUrl,
    label: 'ASR',
    forwardQueryString: true,
    requiredFeature: 'asr',
    extractUsage: (msg) =>
      (msg.type === 'audio' && msg.audio) ? Math.floor(msg.audio.length * 3 / 4) : 0,
    onComplete: (userId, audioBytes) => {
      if (!userId || audioBytes <= 0) return;
      const audioDurationMs = Math.round((audioBytes / PCM_BYTES_PER_SECOND) * 1000);
      logger.info('Recording ASR usage', { userId, audioBytes, audioDurationMs });
      recordUsage(userId, 'asr', audioDurationMs).catch(err => {
        logger.error('记录ASR用量失败:', err);
      });
    },
  });
}
