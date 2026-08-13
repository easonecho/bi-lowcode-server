/**
 * ============================================================================
 * BI 低代码平台 - 服务启动入口
 * ============================================================================
 * 启动 Koa HTTP 服务
 * ============================================================================
 */

import app from './app';
import { config } from './config';
import { prisma } from './config/prisma';

/**
 * 启动服务
 */
async function startServer(): Promise<void> {
  try {
    // 1. 测试数据库连接
    console.log('正在连接数据库...');
    await prisma.$connect();
    console.log('数据库连接成功');

    // 2. 启动 HTTP 服务
    const server = app.listen(config.port, () => {
      console.log('');
      console.log('========================================');
      console.log('  BI 低代码平台服务端已启动');
      console.log('========================================');
      console.log(`  环境: ${config.nodeEnv}`);
      console.log(`  地址: http://localhost:${config.port}`);
      console.log(`  API:  http://localhost:${config.port}/api`);
      console.log('========================================');
      console.log('');
    });

    // 3. 优雅关闭处理
    const shutdown = async (signal: string) => {
      console.log(`\n收到 ${signal} 信号，正在关闭服务...`);
      server.close();
      await prisma.$disconnect();
      console.log('服务已关闭');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('服务启动失败:', error);
    process.exit(1);
  }
}

// 启动
startServer();
