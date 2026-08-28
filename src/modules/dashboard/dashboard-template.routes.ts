/**
 * 仪表板模板模块 Routes (P2-3)
 * - GET /api/dashboard-templates?category=&isSystem= 支持分类与系统/用户模板过滤
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
import { TEMPLATE_CATEGORIES } from '../../constants/template-category'

const router = new Router({ prefix: '/api/dashboard-templates' })

/** 将字符串 'true'/'false' 转为 boolean, 其他返回 undefined */
function parseBool(val: unknown): boolean | undefined {
  if (val === undefined || val === null || val === '') return undefined
  if (val === 'true' || val === '1' || val === 1 || val === true) return true
  if (val === 'false' || val === '0' || val === 0 || val === false) return false
  return undefined
}

router.get('/', requirePermission('dashboard:view'), async (ctx) => {
  const category = (ctx.query.category as string) || undefined
  const isSystem = parseBool(ctx.query.isSystem)
  ctx.body = ResponseUtil.success(await dashboardTemplateService.list(category, isSystem))
})

/** GET /api/dashboard-templates/categories - 获取模板分类枚举 (服务端统一管理, 避免用户自由输入) */
router.get('/categories', requirePermission('dashboard:view'), (ctx) => {
  ctx.body = ResponseUtil.success(TEMPLATE_CATEGORIES)
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
