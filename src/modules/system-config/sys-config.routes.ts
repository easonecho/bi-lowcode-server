/**
 * 系统配置模块 Routes (P2-4)
 */
import Router from '@koa/router'
import { ResponseUtil } from '../../utils/response'
import { validate, idParamSchema } from '../../middleware/validate'
import { requireAdmin } from '../../middleware/role'
import { createSystemConfigSchema, updateSystemConfigSchema } from './sys-config.dto'
import { sysConfigService } from './sys-config.service'

const router = new Router({ prefix: '/api/system-configs' })

/** GET /api/system-configs - 配置列表 */
router.get('/', requireAdmin, async (ctx) => {
  const keyword = (ctx.query.keyword as string) || undefined
  ctx.body = ResponseUtil.success(await sysConfigService.list(keyword))
})

/** GET /api/system-configs/key/:configKey - 按 key 查询配置 */
router.get('/key/:configKey', requireAdmin, async (ctx) => {
  ctx.body = ResponseUtil.success(await sysConfigService.getByKey(ctx.params.configKey))
})

/** GET /api/system-configs/:id - 按主键查询 */
router.get('/:id', requireAdmin, validate(idParamSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(await sysConfigService.getById(Number(ctx.params.id)))
})

/** POST /api/system-configs - 新增配置 */
router.post('/', requireAdmin, validate(createSystemConfigSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(
    await sysConfigService.create(ctx.request.body as any),
    '创建成功',
  )
})

/** PUT /api/system-configs/:id - 更新配置 */
router.put(
  '/:id',
  requireAdmin,
  validate(idParamSchema),
  validate(updateSystemConfigSchema),
  async (ctx) => {
    ctx.body = ResponseUtil.success(
      await sysConfigService.update(Number(ctx.params.id), ctx.request.body as any),
      '更新成功',
    )
  },
)

/** DELETE /api/system-configs/:id - 删除配置 */
router.delete('/:id', requireAdmin, validate(idParamSchema), async (ctx) => {
  await sysConfigService.remove(Number(ctx.params.id))
  ctx.body = ResponseUtil.success(null, '删除成功')
})

/** POST /api/system-configs/batch-delete - 批量删除 */
router.post('/batch-delete', requireAdmin, async (ctx) => {
  const { ids } = ctx.request.body as { ids: number[] }
  await sysConfigService.batchDelete(ids || [])
  ctx.body = ResponseUtil.success(null, '批量删除成功')
})

export default router
