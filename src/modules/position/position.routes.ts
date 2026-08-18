/**
 * 岗位管理模块 Routes (P2-4)
 */
import Router from '@koa/router'
import { ResponseUtil } from '../../utils/response'
import { validate, idParamSchema } from '../../middleware/validate'
import { requireAdmin } from '../../middleware/role'
import { createPositionSchema, updatePositionSchema } from './position.dto'
import { positionService } from './position.service'

const router = new Router({ prefix: '/api/positions' })

/** GET /api/positions - 岗位列表 */
router.get('/', requireAdmin, async (ctx) => {
  const keyword = (ctx.query.keyword as string) || undefined
  const status = ctx.query.status ? Number(ctx.query.status) : undefined
  ctx.body = ResponseUtil.success(await positionService.list(keyword, status))
})

/** GET /api/positions/:id */
router.get('/:id', requireAdmin, validate(idParamSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(await positionService.getById(Number(ctx.params.id)))
})

/** POST /api/positions - 新增岗位 */
router.post('/', requireAdmin, validate(createPositionSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(await positionService.create(ctx.request.body as any), '创建成功')
})

/** PUT /api/positions/:id - 更新岗位 */
router.put(
  '/:id',
  requireAdmin,
  validate(idParamSchema),
  validate(updatePositionSchema),
  async (ctx) => {
    ctx.body = ResponseUtil.success(
      await positionService.update(Number(ctx.params.id), ctx.request.body as any),
      '更新成功',
    )
  },
)

/** DELETE /api/positions/:id - 删除岗位 */
router.delete('/:id', requireAdmin, validate(idParamSchema), async (ctx) => {
  await positionService.remove(Number(ctx.params.id))
  ctx.body = ResponseUtil.success(null, '删除成功')
})

/** PUT /api/positions/:id/toggle-status - 切换状态 */
router.put('/:id/toggle-status', requireAdmin, validate(idParamSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(
    await positionService.toggleStatus(Number(ctx.params.id)),
    '状态切换成功',
  )
})

export default router
