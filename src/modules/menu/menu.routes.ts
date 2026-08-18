/**
 * 菜单模块 Routes
 */
import Router from '@koa/router'
import { ResponseUtil } from '../../utils/response'
import { validate, idParamSchema } from '../../middleware/validate'
import { requireAdmin } from '../../middleware/role'
import { JwtPayload } from '../../utils/jwt'
import { listMenuSchema, createMenuSchema, updateMenuSchema } from './menu.dto'
import { menuService } from './menu.service'

const router = new Router({ prefix: '/api/menus' })

/** GET /api/menus - 列表 (管理员) */
router.get('/', requireAdmin, validate(listMenuSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(await menuService.list(ctx.query as any))
})

/** GET /api/menus/tree - 管理端菜单树(用于父菜单下拉+角色分配树形) */
router.get('/tree/select', requireAdmin, async (ctx) => {
  const excludeId = ctx.query.excludeId ? Number(ctx.query.excludeId) : undefined
  ctx.body = ResponseUtil.success(await menuService.getMenuTreeForSelect(excludeId))
})

/** GET /api/menus/me - 当前登录用户的菜单树 (侧边栏用, 非管理员也调) */
router.get('/me/tree', async (ctx) => {
  const { roleIds } = ctx.state.user as JwtPayload
  const tree = await menuService.getMenuTreeByRoleIds(roleIds || [])
  ctx.body = ResponseUtil.success(tree)
})

/** GET /api/menus/me/perms - 当前用户的权限码扁平列表 (按钮鉴权) */
router.get('/me/perms', async (ctx) => {
  const { roleIds } = ctx.state.user as JwtPayload
  const perms = await menuService.getPermsByRoleIds(roleIds || [])
  ctx.body = ResponseUtil.success(perms)
})

router.get('/:id', requireAdmin, validate(idParamSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(await menuService.getById(Number(ctx.params.id)))
})

router.post('/', requireAdmin, validate(createMenuSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(await menuService.create(ctx.request.body as any), '创建成功')
})

router.put('/:id', requireAdmin, validate(updateMenuSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(
    await menuService.update(Number(ctx.params.id), ctx.request.body as any),
    '更新成功',
  )
})

router.delete('/:id', requireAdmin, validate(idParamSchema), async (ctx) => {
  await menuService.remove(Number(ctx.params.id))
  ctx.body = ResponseUtil.success(null, '删除成功')
})

export default router
