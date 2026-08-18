/**
 * 定时任务模块 Routes (P2-4)
 */
import Router from '@koa/router'
import { ResponseUtil } from '../../utils/response'
import { validate, idParamSchema } from '../../middleware/validate'
import { requireAdmin } from '../../middleware/role'
import { createScheduledTaskSchema, updateScheduledTaskSchema } from './scheduled-task.dto'
import { scheduledTaskService } from './scheduled-task.service'

const router = new Router({ prefix: '/api/scheduled-tasks' })

/** GET /api/scheduled-tasks - 任务列表 */
router.get('/', requireAdmin, async (ctx) => {
  const keyword = (ctx.query.keyword as string) || undefined
  const status = ctx.query.status ? Number(ctx.query.status) : undefined
  ctx.body = ResponseUtil.success(await scheduledTaskService.list(keyword, status))
})

/** GET /api/scheduled-tasks/:id */
router.get('/:id', requireAdmin, validate(idParamSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(await scheduledTaskService.getById(Number(ctx.params.id)))
})

/** POST /api/scheduled-tasks - 新增任务 */
router.post('/', requireAdmin, validate(createScheduledTaskSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(
    await scheduledTaskService.create(ctx.request.body as any),
    '创建成功',
  )
})

/** PUT /api/scheduled-tasks/:id - 更新任务 */
router.put(
  '/:id',
  requireAdmin,
  validate(idParamSchema),
  validate(updateScheduledTaskSchema),
  async (ctx) => {
    ctx.body = ResponseUtil.success(
      await scheduledTaskService.update(Number(ctx.params.id), ctx.request.body as any),
      '更新成功',
    )
  },
)

/** DELETE /api/scheduled-tasks/:id - 删除任务 */
router.delete('/:id', requireAdmin, validate(idParamSchema), async (ctx) => {
  await scheduledTaskService.remove(Number(ctx.params.id))
  ctx.body = ResponseUtil.success(null, '删除成功')
})

/** PUT /api/scheduled-tasks/:id/toggle-status - 切换状态 */
router.put('/:id/toggle-status', requireAdmin, validate(idParamSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(
    await scheduledTaskService.toggleStatus(Number(ctx.params.id)),
    '状态切换成功',
  )
})

/** POST /api/scheduled-tasks/:id/run - 手动触发 */
router.post('/:id/run', requireAdmin, validate(idParamSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(await scheduledTaskService.run(Number(ctx.params.id)), '触发成功')
})

export default router
