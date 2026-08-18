/**
 * 操作日志模块 Routes
 */
import Router from '@koa/router'
import { ResponseUtil } from '../../utils/response'
import { validate } from '../../middleware/validate'
import { requireAdmin } from '../../middleware/role'
import { listLogSchema } from './operation-log.dto'
import { list, getModules, getActions, removeAll, removeBatch } from './operation-log.service'

const router = new Router({ prefix: '/api/operation-logs' })

/** GET /api/operation-logs - 分页列表 (管理员) */
router.get('/', requireAdmin, validate(listLogSchema), async (ctx) => {
  const q = ctx.query as any
  const result = await list({
    page: Number(q.page) || 1,
    pageSize: Number(q.pageSize) || 20,
    module: q.module,
    action: q.action,
    username: q.username,
    status: q.status ? Number(q.status) : undefined,
    startTime: q.startTime,
    endTime: q.endTime,
  })
  ctx.body = ResponseUtil.success(result)
})

/** GET /api/operation-logs/modules - 获取所有模块列表 (筛选下拉) */
router.get('/modules', requireAdmin, async (ctx) => {
  ctx.body = ResponseUtil.success(await getModules())
})

/** GET /api/operation-logs/actions - 获取所有操作列表 */
router.get('/actions', requireAdmin, async (ctx) => {
  ctx.body = ResponseUtil.success(await getActions())
})

/** DELETE /api/operation-logs/:id - 删除单条 */
router.delete('/:id', requireAdmin, async (ctx) => {
  await removeBatch([Number(ctx.params.id)])
  ctx.body = ResponseUtil.success(null, '删除成功')
})

/** DELETE /api/operation-logs/batch/delete - 批量删除 */
router.delete('/batch/delete', requireAdmin, async (ctx) => {
  const { ids } = ctx.request.body as { ids: number[] }
  const count = await removeBatch(ids || [])
  ctx.body = ResponseUtil.success({ count }, `批量删除 ${count} 条`)
})

/** DELETE /api/operation-logs/all/clean - 清空全部 */
router.delete('/all/clean', requireAdmin, async (ctx) => {
  const count = await removeAll()
  ctx.body = ResponseUtil.success({ count }, `已清空 ${count} 条日志`)
})

export default router
