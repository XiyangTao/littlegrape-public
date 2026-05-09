# Build stage
FROM node:20-alpine AS builder

# 配置国内镜像源
RUN sed -i "s|dl-cdn.alpinelinux.org|mirrors.aliyun.com|g" /etc/apk/repositories

WORKDIR /workspace

# Install OpenSSL for Prisma generate and enable corepack for Yarn 4
RUN apk add --no-cache openssl && corepack enable

# ============ 依赖缓存层 ============
# 复制 workspace 配置文件
COPY package.json yarn.lock .yarnrc.yml ./

# 复制 packages（workspace 依赖）
COPY packages/database/package.json ./packages/database/package.json
COPY packages/database/prisma ./packages/database/prisma/
COPY packages/date-utils/package.json ./packages/date-utils/package.json
COPY packages/shared/package.json ./packages/shared/package.json

# 复制 api-gateway package.json
COPY services/api-gateway/package.json ./services/api-gateway/package.json

# 使用 Yarn 4 安装依赖
RUN corepack prepare yarn@4.6.0 --activate \
    && yarn config set npmRegistryServer https://registry.npmmirror.com \
    && yarn install

# ============ 源码构建层 ============
# 复制 packages 源码
COPY packages/database/src ./packages/database/src/
COPY packages/database/tsconfig.json ./packages/database/tsconfig.json
COPY packages/date-utils/src ./packages/date-utils/src/
COPY packages/date-utils/tsconfig.json ./packages/date-utils/tsconfig.json
COPY packages/shared ./packages/shared/

# 复制 api-gateway 源码
COPY services/api-gateway/tsconfig.json ./services/api-gateway/tsconfig.json
COPY services/api-gateway/src ./services/api-gateway/src/

# Generate Prisma client + build packages
RUN cd packages/database && npx prisma generate && yarn build
RUN cd packages/date-utils && yarn build

# Build api-gateway
RUN cd services/api-gateway && yarn build

# Production stage
FROM node:20-alpine AS runner

# 配置国内镜像源
RUN sed -i "s|dl-cdn.alpinelinux.org|mirrors.aliyun.com|g" /etc/apk/repositories

WORKDIR /workspace

# Install runtime dependencies (Prisma 运行时也需要 openssl)
RUN apk add --no-cache curl openssl

# Create non-root user and logs directory
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 appuser \
    && mkdir -p /workspace/logs && chown appuser:nodejs /workspace/logs

# ============ 生产依赖层 ============
# 启用 corepack 使用 Yarn 4
RUN corepack enable && corepack prepare yarn@4.6.0 --activate

# 复制 workspace 配置
COPY package.json yarn.lock .yarnrc.yml ./
COPY packages/database/package.json ./packages/database/package.json
COPY packages/database/prisma ./packages/database/prisma/
COPY packages/date-utils/package.json ./packages/date-utils/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/api-gateway/package.json ./services/api-gateway/package.json

# 使用 Yarn 4 安装生产依赖（postinstall 需要 prisma schema）
ENV NODE_ENV=production
RUN yarn install

# Copy Prisma client from builder
COPY --from=builder /workspace/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /workspace/node_modules/@prisma ./node_modules/@prisma

# Copy built files
COPY --from=builder /workspace/packages/database/dist ./packages/database/dist/
COPY --from=builder /workspace/packages/database/prisma ./packages/database/prisma/
COPY --from=builder /workspace/packages/date-utils/dist ./packages/date-utils/dist/
COPY --from=builder /workspace/packages/shared ./packages/shared/
COPY --from=builder /workspace/services/api-gateway/dist ./services/api-gateway/dist/

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "services/api-gateway/dist/index.js"]
