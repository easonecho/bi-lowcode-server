/**
 * 数据字典模块 Routes
 */
import Router from '@koa/router'
import { ResponseUtil } from '../../utils/response'
import { validate, idParamSchema } from '../../middleware/validate'
import { requireAdmin } from '../../middleware/role'
import {
  createDictSchema,
  updateDictSchema,
  createDictItemSchema,
  updateDictItemSchema,
} from './dict.dto'
import {
  list,
  getByType,
  create,
  update,
  remove,
  listItems,
  createItem,
  updateItem,
  removeItem,
} from './dict.service'

const router = new Router({ prefix: '/api/dicts' })

/** GET /api/dicts - 字典列表 */
router.get('/', async (ctx) => {
  const keyword = (ctx.query.keyword as string) || undefined
  ctx.body = ResponseUtil.success(await list(keyword))
})

/** GET /api/dicts/:type - 按类型获取字典(含 items) */
router.get('/:type', async (ctx) => {
  ctx.body = ResponseUtil.success(await getByType(ctx.params.type))
})

/** POST /api/dicts - 创建字典 */
router.post('/', requireAdmin, validate(createDictSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(await create(ctx.request.body as any), '创建成功')
})

/** PUT /api/dicts/:id - 更新字典 */
router.put('/:id', requireAdmin, validate(updateDictSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(
    await update(Number(ctx.params.id), ctx.request.body as any),
    '更新成功',
  )
})

/** DELETE /api/dicts/:id - 删除字典 */
router.delete('/:id', requireAdmin, validate(idParamSchema), async (ctx) => {
  await remove(Number(ctx.params.id))
  ctx.body = ResponseUtil.success(null, '删除成功')
})

// ---- DictItem ----

/** GET /api/dicts/:dictId/items - 字典项列表 */
router.get('/:dictId/items', async (ctx) => {
  ctx.body = ResponseUtil.success(await listItems(Number(ctx.params.dictId)))
})

/** POST /api/dicts/items - 创建字典项 */
router.post('/items', requireAdmin, validate(createDictItemSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(await createItem(ctx.request.body as any), '创建成功')
})

/** PUT /api/dicts/items/:id - 更新字典项 */
router.put('/items/:id', requireAdmin, validate(updateDictItemSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(
    await updateItem(Number(ctx.params.id), ctx.request.body as any),
    '更新成功',
  )
})

/** DELETE /api/dicts/items/:id - 删除字典项 */
router.delete('/items/:id', requireAdmin, async (ctx) => {
  await removeItem(Number(ctx.params.id))
  ctx.body = ResponseUtil.success(null, '删除成功')
})

export default router
