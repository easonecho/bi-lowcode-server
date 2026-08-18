/**
 * ============================================================================
 * 健康检查路由
 * ============================================================================
 * GET /api/health/live  - 存活检查 (liveness, 200 = 进程活着)
 * GET /api/health/ready - 就绪检查 (readiness, 200 = 可接收请求, 503 = 未就绪)
 * ============================================================================
 */

import Router from '@koa/router'
import { Context } from 'koa'
import { healthCheck, readinessCheck } from './health.service'

const router = new Router({ prefix: '/api/health' })

// 存活检查 (liveness) - 进程是否活着
router.get('/live', async (ctx: Context) => {
  ctx.status = 200
  ctx.body = { code: 0, message: 'OK', data: healthCheck() }
})

// 就绪检查 (readiness) - 是否可以接收请求
router.get('/ready', async (ctx: Context) => {
  const result = await readinessCheck()
  const ok = result.database
  ctx.status = ok ? 200 : 503
  ctx.body = { code: ok ? 0 : 503, message: ok ? 'Ready' : 'Not Ready', data: result }
})

export default router
