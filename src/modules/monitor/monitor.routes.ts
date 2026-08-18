/**
 * 系统监控模块 Routes (P2-4)
 */
import Router from '@koa/router'
import { ResponseUtil } from '../../utils/response'
import { requireAdmin } from '../../middleware/role'
import { monitorService } from './monitor.service'
import { validate, idParamSchema } from '../../middleware/validate'

const router = new Router({ prefix: '/api/monitor' })

/** GET /api/monitor/stats - 系统统计概览 */
router.get('/stats', requireAdmin, async (ctx) => {
  ctx.body = ResponseUtil.success(await monitorService.getSystemStats())
})

/** GET /api/monitor/online - 在线用户列表 */
router.get('/online', requireAdmin, async (ctx) => {
  ctx.body = ResponseUtil.success(monitorService.listOnlineUsers())
})

/** GET /api/monitor/memory - 进程内存信息 */
router.get('/memory', requireAdmin, async (ctx) => {
  ctx.body = ResponseUtil.success(monitorService.getProcessMemory())
})

/** DELETE /api/monitor/online/:userId - 强制踢人 */
router.delete('/online/:userId', requireAdmin, validate(idParamSchema), async (ctx) => {
  const ok = monitorService.forceLogout(Number(ctx.params.userId))
  ctx.body = ResponseUtil.success({ kicked: ok }, ok ? '踢出成功' : '用户不在线')
})

export default router
