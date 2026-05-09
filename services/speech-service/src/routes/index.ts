import { Express } from 'express';
import ttsRoutes from './tts';
import asrRoutes from './asr';
import pronunciationRoutes from './pronunciation';
import translationRoutes from './translation';

export function setupRoutes(app: Express) {
  // TTS API路由
  app.use('/api/v1/tts', ttsRoutes);

  // ASR API路由
  app.use('/api/v1/asr', asrRoutes);

  // 发音评估 API 路由
  app.use('/api/v1/pronunciation', pronunciationRoutes);

  // 翻译 API 路由
  app.use('/api/v1/translation', translationRoutes);
}