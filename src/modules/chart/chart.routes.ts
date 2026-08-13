/**
 * 图表模块 Routes (分层)
 */
import Router from '@koa/router';
import { ResponseUtil } from '../../utils/response';
import { validate, idParamSchema } from '../../middleware/validate';
import { listChartSchema, createChartSchema, updateChartSchema } from './chart.dto';
import { chartService } from './chart.service';

const router = new Router({ prefix: '/api/charts' });

router.get('/', validate(listChartSchema), async (ctx) => {
  const r = await chartService.list(ctx.query as any);
  ctx.body = ResponseUtil.paginate(r.list, r.total, r.page, r.pageSize);
});

router.get('/:id', validate(idParamSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(await chartService.getById(ctx.params.id as any));
});

router.post('/', validate(createChartSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(await chartService.create(ctx.request.body as any, ctx.state.user.userId), '创建成功');
});

router.put('/:id', validate(updateChartSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(
    await chartService.update(ctx.params.id as any, ctx.request.body as any),
    '更新成功'
  );
});

router.delete('/:id', validate(idParamSchema), async (ctx) => {
  await chartService.remove(ctx.params.id as any);
  ctx.body = ResponseUtil.success(null, '删除成功');
});

/** POST /api/charts/:id/data 执行图表数据查询 */
router.post('/:id/data', validate(idParamSchema), async (ctx) => {
  const body = (ctx.request.body || {}) as any;
  ctx.body = ResponseUtil.success(await chartService.queryData(ctx.params.id as any, body.limit));
});

export default router;
