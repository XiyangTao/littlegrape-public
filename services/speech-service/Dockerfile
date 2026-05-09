# Build stage
FROM node:20-alpine AS builder

# 配置国内镜像源
RUN sed -i "s|dl-cdn.alpinelinux.org|mirrors.aliyun.com|g" /etc/apk/repositories

WORKDIR /workspace

# Install build dependencies for native modules (sharp, etc.)
RUN apk add --no-cache python3 make g++ vips-dev || true
RUN corepack enable

# ============ 依赖缓存层 ============
COPY package.json yarn.lock .yarnrc.yml ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/speech-service/package.json ./services/speech-service/package.json

# 使用 Yarn 4 安装依赖
RUN corepack prepare yarn@4.6.0 --activate \
    && yarn config set npmRegistryServer https://registry.npmmirror.com \
    && yarn install

# ============ 源码构建层 ============
COPY packages/shared ./packages/shared/
COPY services/speech-service/tsconfig.json ./services/speech-service/tsconfig.json
COPY services/speech-service/src ./services/speech-service/src/

# Build TypeScript
RUN cd services/speech-service && yarn build

# Production stage
FROM node:20-alpine AS runner

# 配置国内镜像源
RUN sed -i "s|dl-cdn.alpinelinux.org|mirrors.aliyun.com|g" /etc/apk/repositories

WORKDIR /workspace

# Install runtime dependencies: ffmpeg, curl for health checks
RUN apk add --no-cache ffmpeg curl

# Create non-root user and logs directory
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 appuser \
    && mkdir -p /workspace/logs && chown appuser:nodejs /workspace/logs

# ============ 生产依赖层 ============
RUN corepack enable && corepack prepare yarn@4.6.0 --activate

COPY package.json yarn.lock .yarnrc.yml ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/speech-service/package.json ./services/speech-service/package.json

# 安装编译工具（sharp 原生模块需要），安装后清理
RUN apk add --no-cache --virtual .build-deps python3 make g++ vips-dev

ENV NODE_ENV=production
RUN yarn install

# 清理编译工具，保留运行时依赖
RUN apk del .build-deps && apk add --no-cache vips

# Copy built files
COPY --from=builder /workspace/packages/shared ./packages/shared/
COPY --from=builder /workspace/services/speech-service/dist ./services/speech-service/dist/

# Copy proto files (required at runtime by gRPC clients)
COPY services/speech-service/src/protos ./services/speech-service/dist/protos/

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3003/health || exit 1

# Start the application
CMD ["node", "services/speech-service/dist/index.js"]
