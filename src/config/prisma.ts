/**
 * ============================================================================
 * BI 低代码平台 - Prisma 数据库客户端
 * ============================================================================
 * 单例模式创建 Prisma 客户端，避免开发模式下热重载创建多个连接
 * ============================================================================
 */

import { PrismaClient } from '@prisma/client';

// 声明全局变量类型（避免 TypeScript 报错）
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

// 创建 Prisma 客户端实例
// - log: 在开发模式下输出 SQL 查询日志
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

// 在开发模式下将 prisma 挂载到全局对象，防止热重载时创建多个连接
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
