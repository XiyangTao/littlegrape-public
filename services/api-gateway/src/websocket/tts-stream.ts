import { config } from '@/config';
import { registerStreamHandler } from './index';
import { logger } from '@/utils/logger';
import { recordUsage } from '@/services/usageService';

export function setupTTSStreamProxy() {
  const speechServiceUrl = config.services.speechService.url;
  const wsUrl = speechServiceUrl.replace(/^http/, 'ws') + '/ws/tts/stream';

  registerStreamHandler({
    path: '/ws/tts/stream',
    target: wsUrl,
    label: 'TTS',
    requiredFeature: 'tts',
    extractUsage: (msg) =>
      (msg.type === 'synthesize' && msg.text) ? msg.text.length : 0,
    onComplete: (userId, totalChars) => {
      if (!userId || totalChars <= 0) return;
      logger.info('Recording TTS usage', { userId, totalChars });
      recordUsage(userId, 'tts', totalChars).catch(err => {
        logger.error('记录TTS用量失败:', err);
      });
    },
  });
}
