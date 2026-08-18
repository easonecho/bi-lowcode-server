/**
 * ============================================================================
 * 健康检查服务
 * ============================================================================
 * liveness: 进程存活检查 (轻量, 不依赖外部资源)
 * readiness: 就绪检查 (数据库连通性, 用于 K8s readinessProbe)
 * ============================================================================
 */

import { prisma } from '../../config/prisma'

/** 存活检查 - 进程是否活着 */
export function healthCheck() {
  return {
    status: 'alive',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    pid: process.pid,
  }
}

/** 就绪检查 - 数据库是否连通 */
export async function readinessCheck() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return {
      status: 'ready',
      database: true,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: 'not_ready',
      database: false,
      error: error instanceof Error ? error.message : 'Database connection failed',
      timestamp: new Date().toISOString(),
    }
  }
}
