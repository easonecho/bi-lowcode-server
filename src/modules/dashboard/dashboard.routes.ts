/**
 * 仪表板模块 Routes (分层)
 */
import Router from '@koa/router';
import { ResponseUtil } from '../../utils/response';
import { JwtPayload } from '../../utils/jwt';
import { validate, idParamSchema } from '../../middleware/validate';
import {
  listDashboardSchema, createDashboardSchema, updateDashboardSchema,
} from './dashboard.dto';
import { dashboardService } from './dashboard.service';

const router = new Router({ prefix: '/api/dashboards' });

router.get('/', validate(listDashboardSchema), async (ctx) => {
  const r = await dashboardService.list(ctx.query as any);
  ctx.body = ResponseUtil.paginate(r.list, r.total, r.page, r.pageSize);
});

router.get('/:id', validate(idParamSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(await dashboardService.getById(ctx.params.id as any));
});

router.post('/', validate(createDashboardSchema), async (ctx) => {
  const { userId } = ctx.state.user as JwtPayload;
  ctx.body = ResponseUtil.success(
    await dashboardService.create(ctx.request.body as any, userId),
    '创建成功'
  );
});

router.put('/:id', validate(updateDashboardSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(
    await dashboardService.update(ctx.params.id as any, ctx.request.body as any),
    '更新成功'
  );
});

router.delete('/:id', validate(idParamSchema), async (ctx) => {
  await dashboardService.remove(ctx.params.id as any);
  ctx.body = ResponseUtil.success(null, '删除成功');
});

export default router;
