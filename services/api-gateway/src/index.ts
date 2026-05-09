import { config } from '@/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { logger } from '@/utils/logger';
import { connectDatabase, disconnectDatabase } from '@/config/database';
import { connectRedis, disconnectRedis } from '@/config/redis';
import authRoutes from '@/routes/auth';
import healthRoutes from '@/routes/health';
import userRoutes from '@/routes/user';
import testRoutes from '@/routes/test';
import greetingRoutes from '@/routes/greeting';
import uploadRoutes from '@/routes/upload';
import ttsRoutes from '@/routes/tts';
import asrRoutes from '@/routes/asr';
import chatRoutes from '@/routes/chat';
import usageRoutes from '@/routes/usage';
import pronunciationRoutes from '@/routes/pronunciation';
import wordsRoutes from '@/routes/words';
import statsRoutes from '@/routes/stats';
import feedbackRoutes from '@/routes/feedback';
import quotaRoutes from '@/routes/quota';
import orderRoutes from '@/routes/order';
import storyRoutes from '@/routes/story';
import diaryRoutes from '@/routes/diary';
import readingRoutes from '@/routes/reading';
import classicsRoutes from '@/routes/classics';
import listeningRoutes from '@/routes/listening';
import achievementRoutes from '@/routes/achievement';
import invitationRoutes from '@/routes/invitation';
import leaderboardRoutes from '@/routes/leaderboard';
import learningPathRoutes from '@/routes/learningPath';
import examRoutes from '@/routes/exam';
import communityRoutes from '@/routes/community';
import assistantRoutes from '@/routes/assistant';
import dailyChallengeRoutes from '@/routes/dailyChallenge';
import tasksRoutes from '@/routes/tasks';
import grammarRoutes from '@/routes/grammar';
import exerciseRoutes from '@/routes/exercise';
import characterRoutes from '@/routes/character';
import phonemeRoutes from '@/routes/phoneme';
import followRoutes from '@/routes/follow';
import versionRoutes from '@/routes/version';
import companionMem0Routes from '@/routes/companion-mem0';
import adminRoutes from '@/routes/admin';
import { routeGuard } from '@/middleware';
import { setupWebSocket, closeAllClientConnections } from '@/websocket';
import { registerAchievementHandler } from '@/events/eventBus';
import { processAchievementEvent } from '@/services/achievementService';
import { closeAllPushConnections } from '@/websocket/push-channel';
import { initScheduler, shutdownScheduler } from '@/scheduler';
import { initializePlans } from '@/services/quotaService';


if (config.server.runtimeEnv === 'development') {
  printSettings();
}

const app = express();
const server = createServer(app);

// HTTP keep-alive 超时配置 ——
//
// Node.js 默认 keepAliveTimeout = 5s，远短于上游 LB idle（阿里云 SLB / AWS ALB 默认 60s）
// 与移动端 OkHttp 连接池（默认 5 分钟）。错位会导致服务端先关连接，但客户端 / LB 不知道，
// 复用"僵尸 socket"时立即失败（症状：客户端间歇性 ERR_NETWORK，多见于 multipart 上传
// 等不可重试的请求）。
//
// 标准做法（AWS/GCP/Azure/Node.js 官方文档共识）：
//   服务端 keepAliveTimeout > 上游 LB idle timeout，让客户端 / LB 永远先关。
//   headersTimeout 必须 ≥ keepAliveTimeout（Node.js 17+ 强校验）。
//
// 65s 覆盖阿里云 SLB / AWS ALB 默认 60s。若改用 nginx（默认 75s），需调到 80s 以上。
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

async function startServer() {
  try {
    logger.info('Starting API Gateway server');
    logger.info(`Environment: ${config.server.runtimeEnv}`);
    logger.info(`Server will run on ${config.server.host}:${config.server.port}`);

    // 连接数据库和Redis
    logger.info('Connecting to database...');
    await connectDatabase();

    logger.info('Connecting to Redis...');
    await connectRedis();

    // 初始化 Plan 表数据 + 缓存
    await initializePlans();

    // 安全中间件
    // 防止跨站脚本攻击(XSS)、点击劫持(Clickjacking)等安全问题
    // 保护应用程序免受常见的网络攻击
    app.use(helmet());

    // CORS 配置
    // 允许跨域请求
    app.use(cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials
    }));

    // Cookie解析中间件
    app.use(cookieParser());

    // 请求解析中间件
    app.use(express.json({ limit: config.server.requestBodyLimit }));
    app.use(express.urlencoded({ extended: true, limit: config.server.requestBodyLimit }));

    // 注册成就事件处理器
    registerAchievementHandler(({ userId, eventType, metadata }) => processAchievementEvent(userId, eventType, metadata));

    // 路由守卫中间件 - 统一处理认证
    app.use(routeGuard);

    // 路由注册
    app.use('/health', healthRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api/test', testRoutes);
    app.use('/api/greeting', greetingRoutes);
    app.use('/api/upload', uploadRoutes);
    app.use('/api/tts', ttsRoutes);
    app.use('/api/asr', asrRoutes);
    app.use('/api/chat', chatRoutes);
    app.use('/api/usage', usageRoutes);
    app.use('/api/pronunciation', pronunciationRoutes);
    app.use('/api/words', wordsRoutes);
    app.use('/api/stats', statsRoutes);
    app.use('/api/feedback', feedbackRoutes);
    app.use('/api/quota', quotaRoutes);
    app.use('/api/order', orderRoutes);
    app.use('/api/story', storyRoutes);
    app.use('/api/diary', diaryRoutes);
    app.use('/api/reading', readingRoutes);
    app.use('/api/classics', classicsRoutes);
    app.use('/api/listening', listeningRoutes);
    app.use('/api/achievement', achievementRoutes);
    app.use('/api/invitation', invitationRoutes);
    app.use('/api/leaderboard', leaderboardRoutes);
    app.use('/api/learning-path', learningPathRoutes);
    app.use('/api/exam', examRoutes);
    app.use('/api/community', communityRoutes);
    app.use('/api/assistant', assistantRoutes);
    app.use('/api/daily-challenge', dailyChallengeRoutes);
    app.use('/api/tasks', tasksRoutes);
    app.use('/api/grammar', grammarRoutes);
    app.use('/api/exercise', exerciseRoutes);
    app.use('/api/characters', characterRoutes);
    app.use('/api/phonemes', phonemeRoutes);
    app.use('/api/follow', followRoutes);
    app.use('/api/version', versionRoutes);
    app.use('/api/companion-mem0', companionMem0Routes);
    app.use('/api/admin', adminRoutes);

    // 全局错误处理中间件
    app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      res.status(500).json({
        success: false,
        error: config.server.runtimeEnv === 'production' ? 'Internal server error' : error.message
      });
    });

    // 404 处理
    app.use((req: express.Request, res: express.Response) => {
      res.status(404).json({
        success: false,
        error: 'Route not found'
      });
    });

    // WebSocket 服务设置
    setupWebSocket(server);

    // 启动服务器
    server.listen(config.server.port, config.server.host, () => {
      logger.info(`🚀 API Gateway server running on ${config.server.host}:${config.server.port}`);
      logger.info(`📊 Environment: ${config.server.runtimeEnv}`);
      logger.info(`🔌 WebSocket proxy: ws://*/ws/asr/stream -> speech-service`);

      // 启动统一调度器（BullMQ repeatable jobs）
      initScheduler();
    });

    // 优雅关闭处理
    let isShuttingDown = false;
    const gracefulShutdown = async (signal: string) => {
      if (isShuttingDown) {
        logger.info('Force shutdown');
        process.exit(1);
      }
      isShuttingDown = true;
      logger.info(`${signal} received, shutting down gracefully`);

      // 关闭所有 WebSocket 连接，让 server.close() 能正常完成
      closeAllPushConnections();
      closeAllClientConnections();

      // 5秒后强制退出，防止残余连接阻塞关闭
      const forceTimer = setTimeout(() => {
        logger.warn('Graceful shutdown timed out, forcing exit');
        process.exit(1);
      }, 5000);
      forceTimer.unref();

      server.close(async () => {
        logger.info('HTTP server closed');
        await shutdownScheduler();
        await disconnectDatabase();
        await disconnectRedis();
        logger.info('Process terminated');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

function printSettings() {
  logger.info('📋 Configuration loaded:');
  logger.info(`Server: ${JSON.stringify(config.server, null, 2)}`);
  logger.info(`Database: ${JSON.stringify(config.database, null, 2)}`);
  logger.info(`Redis: ${JSON.stringify({
    ...config.redis,
    password: config.redis.password ? '***' : undefined  // 隐藏密码
  }, null, 2)}`);
  logger.info(`JWT: ${JSON.stringify({
    ...config.jwt,
    secret: '***',
    refreshSecret: '***'  // 隐藏敏感信息
  }, null, 2)}`);
  logger.info(`CORS: ${JSON.stringify(config.cors, null, 2)}`);
  logger.info(`Services: ${JSON.stringify(config.services, null, 2)}`);
  logger.info(`Logging: ${JSON.stringify(config.logging, null, 2)}`);
}
  

startServer();