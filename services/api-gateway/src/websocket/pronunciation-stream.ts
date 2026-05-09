import { config } from '@/config';
import { registerStreamHandler } from './index';
import { logger } from '@/utils/logger';
import { recordUsage } from '@/services/usageService';

/** PCM 16kHz, 16-bit, 单声道 = 32000 bytes/秒 */
const PCM_BYTES_PER_SECOND = 32000;

export function setupPronunciationStreamProxy() {
  const speechServiceUrl = config.services.speechService.url;
  const wsUrl = speechServiceUrl.replace(/^http/, 'ws') + '/ws/pronunciation/stream';

  registerStreamHandler({
    path: '/ws/pronunciation/stream',
    target: wsUrl,
    label: 'Pronunciation',
    forwardQueryString: true,
    requiredFeature: 'pronunciation',
    extractUsage: (msg) =>
      (msg.type === 'audio' && msg.audio) ? Math.floor(msg.audio.length * 3 / 4) : 0,
    onComplete: (userId, audioBytes) => {
      if (!userId || audioBytes <= 0) return;
      const audioDurationMs = Math.round((audioBytes / PCM_BYTES_PER_SECOND) * 1000);
      logger.info('Recording pronunciation usage', { userId, audioBytes, audioDurationMs });
      recordUsage(userId, 'pronunciation', audioDurationMs).catch(err => {
        logger.error('记录发音评估用量失败:', err);
      });
    },
  });
}
