/**
 * 仪表板模块 Routes
 */
import Router from '@koa/router'
import { ResponseUtil } from '../../utils/response'
import { JwtPayload } from '../../utils/jwt'
import { validate, idParamSchema } from '../../middleware/validate'
import { requirePermission } from '../../middleware/role'
import { listDashboardSchema, createDashboardSchema, updateDashboardSchema } from './dashboard.dto'
import { dashboardService } from './dashboard.service'

const router = new Router({ prefix: '/api/dashboards' })

router.get('/', requirePermission('dashboard:view'), validate(listDashboardSchema), async (ctx) => {
  const { userId } = ctx.state.user as JwtPayload
  const query = (ctx.state.validatedQuery || ctx.query) as any
  const r = await dashboardService.list({ ...query, userId } as any)
  ctx.body = ResponseUtil.paginate(r.list, r.total, r.page, r.pageSize)
})

router.get('/:id', requirePermission('dashboard:view'), validate(idParamSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(await dashboardService.getById(ctx.params.id as any))
})

router.post(
  '/',
  requirePermission('dashboard:create'),
  validate(createDashboardSchema),
  async (ctx) => {
    const { userId } = ctx.state.user as JwtPayload
    ctx.body = ResponseUtil.success(
      await dashboardService.create(ctx.request.body as any, userId),
      '创建成功',
    )
  },
)

router.put(
  '/:id',
  requirePermission('dashboard:edit'),
  validate(updateDashboardSchema),
  async (ctx) => {
    ctx.body = ResponseUtil.success(
      await dashboardService.update(ctx.params.id as any, ctx.request.body as any),
      '更新成功',
    )
  },
)

router.delete(
  '/:id',
  requirePermission('dashboard:delete'),
  validate(idParamSchema),
  async (ctx) => {
    await dashboardService.remove(ctx.params.id as any)
    ctx.body = ResponseUtil.success(null, '删除成功')
  },
)

// 复制仪表板 (4.1 新增)
router.post(
  '/:id/copy',
  requirePermission('dashboard:create'),
  validate(idParamSchema),
  async (ctx) => {
    const { userId } = ctx.state.user as JwtPayload
    ctx.body = ResponseUtil.success(
      await dashboardService.copy(ctx.params.id as any, userId),
      '复制成功',
    )
  },
)

// 收藏/取消收藏 (4.4 新增)
router.post(
  '/:id/favorite',
  requirePermission('dashboard:view'),
  validate(idParamSchema),
  async (ctx) => {
    const { userId } = ctx.state.user as JwtPayload
    ctx.body = ResponseUtil.success(
      await dashboardService.toggleFavorite(ctx.params.id as any, userId),
    )
  },
)

export default router
