/**
 * 仪表板分组模块 Routes (P2-3)
 */
import Router from '@koa/router'
import { ResponseUtil } from '../../utils/response'
import { JwtPayload } from '../../utils/jwt'
import { validate, idParamSchema } from '../../middleware/validate'
import { requirePermission } from '../../middleware/role'
import { createDashboardGroupSchema, updateDashboardGroupSchema } from './dashboard-group.dto'
import { dashboardGroupService } from './dashboard-group.service'

const router = new Router({ prefix: '/api/dashboard-groups' })

router.get('/', requirePermission('dashboard:view'), async (ctx) => {
  ctx.body = ResponseUtil.success(await dashboardGroupService.list())
})

router.get('/:id', requirePermission('dashboard:view'), validate(idParamSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(await dashboardGroupService.getById(ctx.params.id as any))
})

router.post(
  '/',
  requirePermission('dashboard:create'),
  validate(createDashboardGroupSchema),
  async (ctx) => {
    const { userId } = ctx.state.user as JwtPayload
    ctx.body = ResponseUtil.success(
      await dashboardGroupService.create(ctx.request.body as any, userId),
      '创建成功',
    )
  },
)

router.put(
  '/:id',
  requirePermission('dashboard:edit'),
  validate(updateDashboardGroupSchema),
  async (ctx) => {
    ctx.body = ResponseUtil.success(
      await dashboardGroupService.update(ctx.params.id as any, ctx.request.body as any),
      '更新成功',
    )
  },
)

router.delete(
  '/:id',
  requirePermission('dashboard:delete'),
  validate(idParamSchema),
  async (ctx) => {
    await dashboardGroupService.remove(ctx.params.id as any)
    ctx.body = ResponseUtil.success(null, '删除成功')
  },
)

export default router
