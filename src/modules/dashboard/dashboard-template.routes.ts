/**
 * 仪表板模板模块 Routes (P2-3)
 */
import Router from '@koa/router'
import { ResponseUtil } from '../../utils/response'
import { JwtPayload } from '../../utils/jwt'
import { validate, idParamSchema } from '../../middleware/validate'
import { requirePermission } from '../../middleware/role'
import {
  createDashboardTemplateSchema,
  updateDashboardTemplateSchema,
  saveAsTemplateSchema,
  applyTemplateSchema,
} from './dashboard-template.dto'
import { dashboardTemplateService } from './dashboard-template.service'

const router = new Router({ prefix: '/api/dashboard-templates' })

router.get('/', requirePermission('dashboard:view'), async (ctx) => {
  const category = (ctx.query.category as string) || undefined
  ctx.body = ResponseUtil.success(await dashboardTemplateService.list(category))
})

router.get('/:id', requirePermission('dashboard:view'), validate(idParamSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(await dashboardTemplateService.getById(ctx.params.id as any))
})

router.post(
  '/',
  requirePermission('dashboard:create'),
  validate(createDashboardTemplateSchema),
  async (ctx) => {
    const { userId } = ctx.state.user as JwtPayload
    ctx.body = ResponseUtil.success(
      await dashboardTemplateService.create(ctx.request.body as any, userId),
      '创建成功',
    )
  },
)

router.put(
  '/:id',
  requirePermission('dashboard:edit'),
  validate(updateDashboardTemplateSchema),
  async (ctx) => {
    ctx.body = ResponseUtil.success(
      await dashboardTemplateService.update(ctx.params.id as any, ctx.request.body as any),
      '更新成功',
    )
  },
)

router.delete(
  '/:id',
  requirePermission('dashboard:delete'),
  validate(idParamSchema),
  async (ctx) => {
    await dashboardTemplateService.remove(ctx.params.id as any)
    ctx.body = ResponseUtil.success(null, '删除成功')
  },
)

/** POST /api/dashboard-templates/save-from-dashboard/:dashboardId - 从仪表板保存为模板 */
router.post(
  '/save-from-dashboard/:dashboardId',
  requirePermission('dashboard:create'),
  validate(saveAsTemplateSchema),
  async (ctx) => {
    const { userId } = ctx.state.user as JwtPayload
    ctx.body = ResponseUtil.success(
      await dashboardTemplateService.saveAsTemplate(
        ctx.params.dashboardId as any,
        ctx.request.body as any,
        userId,
      ),
      '已保存为模板',
    )
  },
)

/** POST /api/dashboard-templates/:id/apply - 基于模板创建仪表板 */
router.post(
  '/:id/apply',
  requirePermission('dashboard:create'),
  validate(applyTemplateSchema),
  async (ctx) => {
    const { userId } = ctx.state.user as JwtPayload
    ctx.body = ResponseUtil.success(
      await dashboardTemplateService.applyTemplate(
        ctx.params.id as any,
        ctx.request.body as any,
        userId,
      ),
      '已从模板创建仪表板',
    )
  },
)

export default router
