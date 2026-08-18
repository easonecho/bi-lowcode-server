/**
 * ============================================================================
 * BI 低代码平台 - 服务启动入口
 * ============================================================================
 * 启动 Koa HTTP 服务
 * ============================================================================
 */

import app from './app'
import { config } from './config'
import { prisma } from './config/prisma'
import logger from './utils/logger'
import { startScheduler, stopScheduler } from './utils/scheduler'

/**
 * 启动服务
 */
async function startServer(): Promise<void> {
  try {
    // 1. 测试数据库连接
    logger.info('正在连接数据库...')
    await prisma.$connect()
    logger.info('数据库连接成功')

    // 2. 启动 HTTP 服务
    const server = app.listen(config.port, () => {
      logger.info({ env: config.nodeEnv, port: config.port }, 'BI 低代码平台服务端已启动')
      logger.info(`  地址: http://localhost:${config.port}`)
      logger.info(`  API:  http://localhost:${config.port}/api`)
      // 启动定时任务调度器
      startScheduler()
    })

    // 3. 优雅关闭处理
    const shutdown = async (signal: string) => {
      logger.info({ signal }, '收到关闭信号,正在关闭服务...')
      stopScheduler()
      server.close()
      await prisma.$disconnect()
      logger.info('服务已关闭')
      process.exit(0)
    }

    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))

    // 4. 全局未捕获异常处理 (防止进程崩溃)
    process.on('unhandledRejection', (reason) => {
      logger.error({ reason }, 'unhandledRejection 未捕获的 Promise 拒绝')
    })
    process.on('uncaughtException', (err) => {
      logger.error({ err }, 'uncaughtException 未捕获的异常, 进程即将退出')
      process.exit(1)
    })
  } catch (error) {
    logger.error({ err: error }, '服务启动失败')
    process.exit(1)
  }
}

// 启动
startServer()
