/**
 * ============================================================================
 * 数据集模块 Routes
 * P2 增强: execute 路由支持参数化查询 (params)
 * ============================================================================
 */
import Router from '@koa/router'
import { ResponseUtil } from '../../utils/response'
import { JwtPayload } from '../../utils/jwt'
import { validate, idParamSchema } from '../../middleware/validate'
import { requirePermission } from '../../middleware/role'
import {
  listDatasetSchema,
  createDatasetSchema,
  updateDatasetSchema,
  previewDatasetSchema,
  executeDatasetSchema,
} from './dataset.dto'
import { datasetService } from './dataset.service'

const router = new Router({ prefix: '/api/datasets' })

router.get('/', requirePermission('dataset:view'), validate(listDatasetSchema), async (ctx) => {
  const r = await datasetService.list(ctx.query as any)
  ctx.body = ResponseUtil.paginate(r.list, r.total, r.page, r.pageSize)
})

router.get('/:id', requirePermission('dataset:view'), validate(idParamSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(await datasetService.getById(ctx.params.id as any))
})

router.post(
  '/',
  requirePermission('dataset:create'),
  validate(createDatasetSchema),
  async (ctx) => {
    const { userId } = ctx.state.user as JwtPayload
    ctx.body = ResponseUtil.success(
      await datasetService.create(ctx.request.body as any, userId),
      '创建成功',
    )
  },
)

router.put(
  '/:id',
  requirePermission('dataset:edit'),
  validate(updateDatasetSchema),
  async (ctx) => {
    ctx.body = ResponseUtil.success(
      await datasetService.update(ctx.params.id as any, ctx.request.body as any),
      '更新成功',
    )
  },
)

router.delete('/:id', requirePermission('dataset:delete'), validate(idParamSchema), async (ctx) => {
  await datasetService.remove(ctx.params.id as any)
  ctx.body = ResponseUtil.success(null, '删除成功')
})

/** POST /api/datasets/preview 预览 SQL (无需已有数据集; 支持 params) */
router.post(
  '/preview',
  requirePermission('dataset:view'),
  validate(previewDatasetSchema),
  async (ctx) => {
    const { userId } = ctx.state.user as JwtPayload
    ctx.body = ResponseUtil.success(
      await datasetService.previewSql(ctx.request.body as any, userId),
    )
  },
)

/** POST /api/datasets/:id/execute 执行已保存数据集的 SQL (支持 params) */
router.post(
  '/:id/execute',
  requirePermission('dataset:view'),
  validate(executeDatasetSchema),
  async (ctx) => {
    const body = (ctx.request.body || {}) as any
    ctx.body = ResponseUtil.success(
      await datasetService.execute(ctx.params.id as any, body.limit, body.params),
    )
  },
)

export default router
