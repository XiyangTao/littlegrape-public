# ============ 依赖安装阶段 ============
FROM python:3.12-slim AS builder

# 配置国内镜像源
RUN sed -i "s|deb.debian.org|mirrors.aliyun.com|g" /etc/apt/sources.list.d/debian.sources
ENV PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple

WORKDIR /app

# ============ 依赖缓存层 ============
# 先只复制项目定义文件
COPY services/ai-service/pyproject.toml ./

# 创建最小的包结构让 pip 能解析依赖（不复制真实代码）
RUN mkdir -p src/ai_service && echo "" > src/ai_service/__init__.py

# 创建虚拟环境并安装依赖
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir .

# ============ 生产运行阶段 ============
FROM python:3.12-slim AS runner

# 配置国内镜像源
RUN sed -i "s|deb.debian.org|mirrors.aliyun.com|g" /etc/apt/sources.list.d/debian.sources

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder (依赖已缓存)
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# ============ 源码层 ============
# 复制真实的源代码（这层会经常变，但不影响上面的依赖缓存）
COPY services/ai-service/src/ ./src/

# 复制共享资源（路径需匹配代码中的相对路径引用 ../../../../packages/shared/）
COPY packages/shared/characters.json /packages/shared/characters.json

# Create non-root user and logs directory (使用固定 UID 1001 与其他服务一致)
RUN groupadd --system --gid 1001 appgroup \
    && useradd --system --uid 1001 --gid appgroup --create-home app \
    && mkdir -p /app/logs \
    && chown -R app:appgroup /app

# Switch to non-root user
USER app

# Environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3003/health || exit 1

# Run the application
CMD ["python", "src/main.py"]
