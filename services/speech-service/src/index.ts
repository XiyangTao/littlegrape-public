import express from 'express';
// import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { URL } from 'url';

import { config } from '@/config';
import { logger } from '@/utils/logger';
import { setupRoutes } from '@/routes';
import { redisClient } from '@/config/redis';
// Azure 引擎
import { createStreamingASRSession } from '@/services/streaming-asr';
import { createStreamingPronunciationSession } from '@/services/streaming-pronunciation-assessment';
import { createStreamingTTSSession } from '@/services/streaming-tts';
import { createStreamingTranslationSession } from '@/services/streaming-translation';
import { createSimultaneousInterpretationSession, isVolcanoAstAvailable } from '@/services/simultaneous-interpretation';
// 讯飞引擎
import { createXunfeiASRSession, isXunfeiASRAvailable } from '@/services/xunfei-asr';
import { createXunfeiPronunciationSession, isXunfeiAvailable } from '@/services/xunfei-pronunciation';
import { createXunfeiTTSSession, isXunfeiTTSAvailable } from '@/services/xunfei-tts';

const app = express();
const server = createServer(app);

// 创建 WebSocket 服务器（不监听任何路径，手动处理升级）
const wss = new WebSocketServer({ noServer: true });

// 处理 WebSocket 连接
wss.on('connection', (ws, request) => {
  const url = request.url ? new URL(request.url, `http://${request.headers.host}`) : null;
  const pathname = url?.pathname || '';
  const engine = url?.searchParams.get('engine') || 'azure'; // 默认使用 Azure

  logger.info('WebSocket connection established', {
    pathname,
    engine,
    ip: request.socket.remoteAddress
  });

  // ===== ASR 流式识别 =====
  if (pathname === '/ws/asr/stream') {
    if (engine === 'xunfei') {
      if (isXunfeiASRAvailable()) {
        createXunfeiASRSession(ws);
      } else {
        logger.error('Xunfei ASR not available');
        ws.close(1008, 'Xunfei ASR not configured');
      }
    } else {
      // 默认 Azure
      createStreamingASRSession(ws);
    }
  }
  // ===== 发音评估 =====
  else if (pathname === '/ws/pronunciation/stream') {
    if (engine === 'xunfei') {
      if (isXunfeiAvailable()) {
        createXunfeiPronunciationSession(ws);
      } else {
        logger.error('Xunfei Pronunciation not available');
        ws.close(1008, 'Xunfei not configured');
      }
    } else {
      // 默认 Azure
      createStreamingPronunciationSession(ws);
    }
  }
  // ===== TTS 流式合成 =====
  else if (pathname === '/ws/tts/stream') {
    if (engine === 'xunfei') {
      if (isXunfeiTTSAvailable()) {
        createXunfeiTTSSession(ws);
      } else {
        logger.error('Xunfei TTS not available');
        ws.close(1008, 'Xunfei TTS not configured');
      }
    } else {
      // 默认 Azure
      createStreamingTTSSession(ws);
    }
  }
  // ===== 实时翻译 =====
  else if (pathname === '/ws/translation/stream') {
    // 目前只支持 Azure
    createStreamingTranslationSession(ws);
  }
  // ===== 同声传译 =====
  else if (pathname === '/ws/interpretation/stream') {
    if (isVolcanoAstAvailable()) {
      createSimultaneousInterpretationSession(ws);
    } else {
      logger.error('Volcano AST not available');
      ws.close(1008, 'Volcano AST not configured');
    }
  }
  // ===== 未知路径 =====
  else {
    logger.warn('Unknown WebSocket path', { pathname });
    ws.close(1008, 'Unknown path');
  }
});

// 支持的 WebSocket 路径
const SUPPORTED_WS_PATHS = [
  '/ws/asr/stream',
  '/ws/pronunciation/stream',
  '/ws/tts/stream',
  '/ws/translation/stream',
  '/ws/interpretation/stream'
];

// 处理 HTTP 升级请求
server.on('upgrade', (request, socket, head) => {
  const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : '';

  logger.info('WebSocket upgrade request', { pathname });

  if (SUPPORTED_WS_PATHS.includes(pathname)) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    logger.warn('Rejecting WebSocket upgrade for unknown path', { pathname });
    socket.destroy();
  }
});

// 基础中间件
app.use(helmet({
  crossOriginEmbedderPolicy: false // 允许跨域资源嵌入
}));

// app.use(cors({
//   origin: config.cors.origin,
//   credentials: config.cors.credentials
// }));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


// 请求日志中间件
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// 健康检查
app.get('/health', (_req, res) => {
  res.json({
    service: 'tts-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime()
  });
});

// API 路由
setupRoutes(app);

// 404 处理
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// 全局错误处理
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', error);

  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Request body too large'
    });
  }

  return res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 优雅关闭处理
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');

  try {
    // 关闭Redis连接
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis connection closed');
    }

    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');

  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis connection closed');
    }

    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// 捕获未处理的Promise拒绝
process.on('unhandledRejection', (reason, _promise) => {
  logger.error('Unhandled Promise Rejection:', reason);
});

// 捕获未处理的异常
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// 启动服务器（使用 HTTP server 以支持 WebSocket）
server.listen(config.server.port, config.server.host, () => {
  logger.info(`Speech Service started on ${config.server.host}:${config.server.port}`, {
    port: config.server.port,
    host: config.server.host,
    environment: config.server.runtimeEnv,
    websocket: 'ws://*/ws/asr/stream',
    timestamp: new Date().toISOString()
  });
});

export default app;