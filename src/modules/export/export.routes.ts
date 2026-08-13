/**
 * 数据导出模块 Routes (分层)
 */
import Router from '@koa/router';
import { validate, idParamSchema } from '../../middleware/validate';
import { exportDatasetSchema, exportChartSchema } from './export.dto';
import { exportService, type ExportFormat } from './export.service';
import type { Context } from 'koa';

const router = new Router({ prefix: '/api/export' });

/**
 * 设置文件下载响应头
 */
function setDownloadHeaders(ctx: Context, filename: string, contentType: string, body: string) {
  ctx.set('Content-Type', contentType);
  ctx.set(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`
  );
  ctx.set('Content-Length', Buffer.byteLength(body, 'utf8').toString());
  ctx.body = body;
}

/** POST /api/export/dataset/:id/csv */
router.post('/dataset/:id/csv', validate(exportDatasetSchema), async (ctx) => {
  const body = (ctx.request.body || {}) as any;
  const r = await exportService.exportDataset(ctx.params.id as any, 'csv', {
    limit: body.limit,
    filename: body.filename,
  });
  setDownloadHeaders(ctx, r.filename, r.contentType, r.body);
});

/** POST /api/export/dataset/:id/json */
router.post('/dataset/:id/json', validate(exportDatasetSchema), async (ctx) => {
  const body = (ctx.request.body || {}) as any;
  const r = await exportService.exportDataset(ctx.params.id as any, 'json', {
    limit: body.limit,
    filename: body.filename,
  });
  setDownloadHeaders(ctx, r.filename, r.contentType, r.body);
});

/** POST /api/export/chart/:id/csv */
router.post('/chart/:id/csv', validate(exportChartSchema), async (ctx) => {
  const body = (ctx.request.body || {}) as any;
  const r = await exportService.exportChart(ctx.params.id as any, 'csv', {
    limit: body.limit,
    filename: body.filename,
  });
  setDownloadHeaders(ctx, r.filename, r.contentType, r.body);
});

/** POST /api/export/chart/:id/json */
router.post('/chart/:id/json', validate(exportChartSchema), async (ctx) => {
  const body = (ctx.request.body || {}) as any;
  const r = await exportService.exportChart(ctx.params.id as any, 'json', {
    limit: body.limit,
    filename: body.filename,
  });
  setDownloadHeaders(ctx, r.filename, r.contentType, r.body);
});

export default router;
