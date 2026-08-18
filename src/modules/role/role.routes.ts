/**
 * 角色模块 Routes (管理员接口)
 */
import Router from '@koa/router'
import { z } from 'zod'
import { ResponseUtil } from '../../utils/response'
import { validate, idParamSchema } from '../../middleware/validate'
import { requireAdmin } from '../../middleware/role'
import { listRoleSchema, createRoleSchema, updateRoleSchema } from './role.dto'
import { roleService } from './role.service'

const router = new Router({ prefix: '/api/roles' })

const assignMenuSchema = z.object({
  body: z.object({
    menuIds: z.array(z.number().int().min(1)).default([]),
  }),
})

/** GET /api/roles (管理员) */
router.get('/', requireAdmin, validate(listRoleSchema), async (ctx) => {
  const r = await roleService.list(ctx.query as any)
  ctx.body = ResponseUtil.paginate(r.list, r.total, r.page, r.pageSize)
})

/** GET /api/roles/all (不分页, 下拉用) */
router.get('/all/list', requireAdmin, async (ctx) => {
  ctx.body = ResponseUtil.success(await roleService.listAll())
})

/** GET /api/roles/:id/menus - 查询角色已分配菜单ID列表 */
router.get('/:id/menus', requireAdmin, validate(idParamSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(await roleService.getMenuIds(Number(ctx.params.id)))
})

/** PUT /api/roles/:id/menus - 分配角色菜单权限 */
router.put('/:id/menus', requireAdmin, validate(assignMenuSchema), async (ctx) => {
  const body = (ctx.request.body as any) || {}
  await roleService.assignMenus(Number(ctx.params.id), body.menuIds || [])
  ctx.body = ResponseUtil.success(null, '分配成功')
})

router.get('/:id', requireAdmin, validate(idParamSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(await roleService.getById(Number(ctx.params.id)))
})

router.post('/', requireAdmin, validate(createRoleSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(await roleService.create(ctx.request.body as any), '创建成功')
})

router.put('/:id', requireAdmin, validate(updateRoleSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(
    await roleService.update(Number(ctx.params.id), ctx.request.body as any),
    '更新成功',
  )
})

router.delete('/:id', requireAdmin, validate(idParamSchema), async (ctx) => {
  await roleService.remove(Number(ctx.params.id))
  ctx.body = ResponseUtil.success(null, '删除成功')
})

export default router
