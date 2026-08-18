# ============================================================================
# BI 低代码平台 - 后端 Dockerfile (多阶段构建)
# ============================================================================
# 构建阶段: Node.js 编译 TypeScript
# 运行阶段: Node.js 运行编译产物
# ============================================================================

# ---------- 构建阶段 ----------
FROM node:20-alpine AS builder
WORKDIR /app

# 先拷贝依赖清单,利用 Docker 缓存
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# 拷贝源码并编译
COPY . .
RUN npx prisma generate
RUN npm run build

# ---------- 运行阶段 ----------
FROM node:20-alpine
WORKDIR /app

# 只安装生产依赖
COPY package*.json ./
RUN npm ci --omit=dev

# 拷贝编译产物和 Prisma 文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000

# 启动命令由 docker-compose 的 command 覆盖(含 migrate deploy)
CMD ["node", "dist/server.js"]