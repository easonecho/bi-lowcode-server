/**
 * 数据导出模块 Routes (P1: 新增 xlsx)
 */
import Router from '@koa/router'
import { validate } from '../../middleware/validate'
import { requirePermission } from '../../middleware/role'
import { exportDatasetSchema, exportChartSchema } from './export.dto'
import { exportService } from './export.service'
import type { Context } from 'koa'

const router = new Router({ prefix: '/api/export' })

function setDownloadHeaders(
  ctx: Context,
  filename: string,
  contentType: string,
  body: string | Buffer,
) {
  ctx.set('Content-Type', contentType)
  ctx.set(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  )
  ctx.set('Content-Length', Buffer.byteLength(body).toString())
  ctx.body = body
}

/** POST /api/export/dataset/:id/csv */
router.post(
  '/dataset/:id/csv',
  requirePermission('dataset:view'),
  validate(exportDatasetSchema),
  async (ctx) => {
    const body = (ctx.request.body || {}) as any
    const r = await exportService.exportDataset(ctx.params.id as any, 'csv', {
      limit: body.limit,
      filename: body.filename,
    })
    setDownloadHeaders(ctx, r.filename, r.contentType, r.body)
  },
)

/** POST /api/export/dataset/:id/json */
router.post(
  '/dataset/:id/json',
  requirePermission('dataset:view'),
  validate(exportDatasetSchema),
  async (ctx) => {
    const body = (ctx.request.body || {}) as any
    const r = await exportService.exportDataset(ctx.params.id as any, 'json', {
      limit: body.limit,
      filename: body.filename,
    })
    setDownloadHeaders(ctx, r.filename, r.contentType, r.body)
  },
)

/** POST /api/export/dataset/:id/xlsx */
router.post(
  '/dataset/:id/xlsx',
  requirePermission('dataset:view'),
  validate(exportDatasetSchema),
  async (ctx) => {
    const body = (ctx.request.body || {}) as any
    const r = await exportService.exportDataset(ctx.params.id as any, 'xlsx', {
      limit: body.limit,
      filename: body.filename,
    })
    setDownloadHeaders(ctx, r.filename, r.contentType, r.body)
  },
)

/** POST /api/export/chart/:id/csv */
router.post(
  '/chart/:id/csv',
  requirePermission('chart:view'),
  validate(exportChartSchema),
  async (ctx) => {
    const body = (ctx.request.body || {}) as any
    const r = await exportService.exportChart(ctx.params.id as any, 'csv', {
      limit: body.limit,
      filename: body.filename,
    })
    setDownloadHeaders(ctx, r.filename, r.contentType, r.body)
  },
)

/** POST /api/export/chart/:id/json */
router.post(
  '/chart/:id/json',
  requirePermission('chart:view'),
  validate(exportChartSchema),
  async (ctx) => {
    const body = (ctx.request.body || {}) as any
    const r = await exportService.exportChart(ctx.params.id as any, 'json', {
      limit: body.limit,
      filename: body.filename,
    })
    setDownloadHeaders(ctx, r.filename, r.contentType, r.body)
  },
)

/** POST /api/export/chart/:id/xlsx */
router.post(
  '/chart/:id/xlsx',
  requirePermission('chart:view'),
  validate(exportChartSchema),
  async (ctx) => {
    const body = (ctx.request.body || {}) as any
    const r = await exportService.exportChart(ctx.params.id as any, 'xlsx', {
      limit: body.limit,
      filename: body.filename,
    })
    setDownloadHeaders(ctx, r.filename, r.contentType, r.body)
  },
)

export default router
