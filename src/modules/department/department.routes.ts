/**
 * 部门模块 Routes (管理员接口)
 */
import Router from '@koa/router'
import { ResponseUtil } from '../../utils/response'
import { validate, idParamSchema } from '../../middleware/validate'
import { requireAdmin } from '../../middleware/role'
import {
  listDepartmentSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
} from './department.dto'
import { departmentService } from './department.service'

const router = new Router({ prefix: '/api/departments' })

/** GET /api/departments 分页列表 (扁平) */
router.get('/', requireAdmin, validate(listDepartmentSchema), async (ctx) => {
  const r = await departmentService.list(ctx.query as any)
  ctx.body = ResponseUtil.paginate(r.list, r.total, r.page, r.pageSize)
})

/** GET /api/departments/tree 部门树 (不分页, 仅启用状态) */
router.get('/tree/list', requireAdmin, async (ctx) => {
  ctx.body = ResponseUtil.success(await departmentService.listTree())
})

/** GET /api/departments/all 全部分页扁平列表 */
router.get('/all/list', requireAdmin, async (ctx) => {
  ctx.body = ResponseUtil.success(await departmentService.listAll())
})

router.get('/:id', requireAdmin, validate(idParamSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(await departmentService.getById(ctx.params.id as any))
})

router.post('/', requireAdmin, validate(createDepartmentSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(
    await departmentService.create(ctx.request.body as any),
    '创建成功',
  )
})

router.put('/:id', requireAdmin, validate(updateDepartmentSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(
    await departmentService.update(ctx.params.id as any, ctx.request.body as any),
    '更新成功',
  )
})

router.delete('/:id', requireAdmin, validate(idParamSchema), async (ctx) => {
  await departmentService.remove(ctx.params.id as any)
  ctx.body = ResponseUtil.success(null, '删除成功')
})

export default router
