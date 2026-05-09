#!/usr/bin/env bash
# ============================================================
# LittleGrape 生产部署脚本
#
# 用法：
#   ./scripts/deploy.sh              # 部署所有后端服务
#   ./scripts/deploy.sh api-gateway  # 只部署 api-gateway
#   ./scripts/deploy.sh ai-service   # 只部署 ai-service
#   ./scripts/deploy.sh speech-service
#   ./scripts/deploy.sh web          # 部署官网（本地构建 + rsync）
#   ./scripts/deploy.sh db           # 只执行数据库迁移（prisma migrate deploy）
# ============================================================

set -euo pipefail

# ==================== 配置 ====================
# 真实部署目标请通过环境变量注入，不要把服务器地址硬编码到仓库
SERVER="${LITTLEGRAPE_DEPLOY_SERVER:-user@your-server.example.com}"
SSH_KEY="${LITTLEGRAPE_DEPLOY_SSH_KEY:-$HOME/.ssh/id_ed25519}"
REMOTE_DIR="${LITTLEGRAPE_REMOTE_DIR:-/opt/littlegrape}"
WEB_DIR="${LITTLEGRAPE_WEB_DIR:-/var/www/littlegrape-web}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SSH="ssh -i $SSH_KEY $SERVER"
SERVICES=("api-gateway" "ai-service" "speech-service")

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ==================== 前置检查 ====================

# 确保本地无未提交改动
if ! git diff --quiet HEAD 2>/dev/null; then
  error "本地有未提交的改动，请先提交再部署"
fi

# 确保已推送到远程
LOCAL_HEAD=$(git rev-parse HEAD)
REMOTE_HEAD=$(git rev-parse origin/main 2>/dev/null || echo "unknown")
if [ "$LOCAL_HEAD" != "$REMOTE_HEAD" ]; then
  warn "本地 HEAD ($LOCAL_HEAD) 与 origin/main ($REMOTE_HEAD) 不一致"
  read -p "是否先 git push? [Y/n] " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    git push origin main
    info "已推送到 origin/main"
  fi
fi

# ==================== 部署目标 ====================
TARGET="${1:-all}"

deploy_services() {
  local services_to_build=("$@")

  info "拉取最新代码..."
  $SSH "cd $REMOTE_DIR && git pull origin main"

  # 逐个构建再重启，避免 2C4G 小机器内存不足
  for svc in "${services_to_build[@]}"; do
    info "构建并重启：$svc"
    $SSH "cd $REMOTE_DIR && docker compose up -d --build $svc"
  done

  # 清理旧镜像释放磁盘
  $SSH "docker image prune -f" >/dev/null 2>&1 || true

  info "等待健康检查..."
  sleep 5
  $SSH "docker ps --format 'table {{.Names}}\t{{.Status}}' | grep littlegrape"

  info "部署完成 ✓"
}

deploy_web() {
  info "本地构建官网..."
  cd "$PROJECT_ROOT/apps/web"
  npx next build

  if [ ! -d "out" ]; then
    error "构建失败：out/ 目录不存在"
  fi

  info "上传到服务器..."
  # rsync 到临时目录，再 sudo 移动到 nginx 目录（避免权限问题）
  $SSH "rm -rf /tmp/littlegrape-web-deploy && mkdir -p /tmp/littlegrape-web-deploy"
  rsync -az --delete -e "ssh -i $SSH_KEY" out/ "$SERVER:/tmp/littlegrape-web-deploy/"
  $SSH "sudo rm -rf $WEB_DIR && sudo mv /tmp/littlegrape-web-deploy $WEB_DIR && sudo chown -R xiyang:xiyang $WEB_DIR"

  info "官网部署完成 ✓"
  echo "  ${LITTLEGRAPE_WEB_URL:-https://your-domain.example.com/}"
}

deploy_db() {
  info "拉取最新代码..."
  $SSH "cd $REMOTE_DIR && git pull origin main"

  info "执行数据库迁移..."
  $SSH "cd $REMOTE_DIR && set -a && source .env && set +a && cd packages/database && npx prisma@5.22.0 migrate deploy"

  info "数据库迁移完成 ✓"
}

# ==================== 执行 ====================
case "$TARGET" in
  all)
    deploy_services "${SERVICES[@]}"
    ;;
  api-gateway|ai-service|speech-service)
    deploy_services "$TARGET"
    ;;
  web)
    deploy_web
    ;;
  db)
    deploy_db
    ;;
  *)
    error "未知目标: $TARGET\n用法: deploy.sh [all|api-gateway|ai-service|speech-service|web|db]"
    ;;
esac
