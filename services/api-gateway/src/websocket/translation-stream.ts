import { config } from '@/config';
import { registerStreamHandler } from './index';
import { logger } from '@/utils/logger';
import { recordUsage } from '@/services/usageService';

/** PCM 16kHz, 16-bit, 单声道 = 32000 bytes/秒 */
const PCM_BYTES_PER_SECOND = 32000;

export function setupTranslationStreamProxy() {
  const speechServiceUrl = config.services.speechService.url;
  const wsUrl = speechServiceUrl.replace(/^http/, 'ws') + '/ws/translation/stream';

  registerStreamHandler({
    path: '/ws/translation/stream',
    target: wsUrl,
    label: 'Translation',
    requiredFeature: 'voiceTranslation',
    extractUsage: (msg) =>
      (msg.type === 'audio' && msg.audio) ? Math.floor(msg.audio.length * 3 / 4) : 0,
    onComplete: (userId, audioBytes) => {
      if (!userId || audioBytes <= 0) return;
      const audioDurationMs = Math.round((audioBytes / PCM_BYTES_PER_SECOND) * 1000);
      logger.info('Recording translation usage', { userId, audioBytes, audioDurationMs });
      recordUsage(userId, 'translation', audioDurationMs).catch(err => {
        logger.error('记录翻译用量失败:', err);
      });
    },
  });
}
