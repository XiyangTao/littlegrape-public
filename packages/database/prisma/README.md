# Prisma 数据库迁移指南

## 概述

本项目使用 Prisma 进行数据库迁移管理。所有表结构变更都通过迁移文件进行版本控制。

## 目录结构

```
prisma/
├── schema.prisma          # 数据库模型定义
├── migrations/            # 迁移文件目录
│   ├── migration_lock.toml
│   ├── 0_init/           # 基线迁移（初始表结构）
│   │   └── migration.sql
│   └── YYYYMMDD_xxx/     # 增量迁移
│       └── migration.sql
└── README.md             # 本文档
```

## 开发流程

### 1. 修改 Schema

编辑 `prisma/schema.prisma`，添加或修改模型：

```prisma
model NewTable {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())

  @@map("new_tables")
}
```

### 2. 生成迁移文件（本地开发环境）

```bash
# 生成迁移并应用到本地数据库
npx prisma migrate dev --name describe_your_change

# 或者只生成迁移文件，不执行
npx prisma migrate dev --name describe_your_change --create-only
```

命名规范：使用小写字母和下划线，描述变更内容，如：
- `add_daily_usages`
- `add_user_avatar_field`
- `create_orders_table`

### 3. 检查生成的 SQL

查看 `prisma/migrations/YYYYMMDD_xxx/migration.sql`，确保 SQL 正确。

### 4. 提交代码

```bash
git add prisma/
git commit -m "feat: add daily_usages table for usage tracking"
```

### 5. 部署到生产环境

重新构建并部署 Docker 镜像，容器启动时会自动执行迁移：

```bash
# 服务器上
cd /path/to/littlegrape
git pull
docker-compose build api-gateway
docker-compose up -d api-gateway
```

## 生产环境迁移

### 自动迁移

容器启动时会自动执行 `prisma migrate deploy`，应用所有未执行的迁移。

### 手动迁移（如需要）

```bash
# 进入容器执行迁移
docker exec littlegrape-api-gateway npx prisma migrate deploy

# 查看迁移状态
docker exec littlegrape-api-gateway npx prisma migrate status
```

## 常用命令

```bash
# 本地开发
npx prisma migrate dev              # 生成并执行迁移
npx prisma migrate dev --create-only # 只生成迁移文件
npx prisma migrate reset            # 重置数据库（危险！）
npx prisma db push                  # 快速同步 schema（不生成迁移）

# 生产环境
npx prisma migrate deploy           # 执行所有待处理的迁移
npx prisma migrate status           # 查看迁移状态

# 其他
npx prisma generate                 # 重新生成 Prisma Client
npx prisma studio                   # 打开数据库管理界面
```

## 处理已有生产数据库（Baseline）

如果生产数据库已有表但没有迁移记录：

1. 创建基线迁移文件（对应已有表结构）
2. 标记为已应用：
   ```bash
   npx prisma migrate resolve --applied 0_init
   ```

## 注意事项

1. **永远不要直接修改生产数据库** - 所有变更通过迁移文件
2. **迁移文件一旦提交，不要修改** - 创建新迁移来修正问题
3. **先在本地测试迁移** - 确保无误后再部署
4. **备份数据库** - 执行重大迁移前先备份
5. **迁移是顺序执行的** - 按时间戳顺序应用

## 回滚迁移

Prisma 不支持自动回滚。如需回滚：

1. 创建新迁移，手动编写反向操作 SQL
2. 或者从备份恢复数据库
