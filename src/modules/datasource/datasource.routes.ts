/**
 * ============================================================================
 * BI 低代码平台 - 数据源模块路由层 (重构后)
 * ============================================================================
 * 仅负责: 路由声明 → 参数校验 → 调用 service → 返回响应
 * 不包含 prisma 调用、密码加解密、数据库连接等业务逻辑
 * ============================================================================
 */

import Router from '@koa/router';
import { ResponseUtil } from '../../utils/response';
import { JwtPayload } from '../../utils/jwt';
import { validate, idParamSchema } from '../../middleware/validate';
import {
  listDatasourceSchema,
  createDatasourceSchema,
  updateDatasourceSchema,
} from './datasource.dto';
import { datasourceService } from './datasource.service';

const router = new Router({ prefix: '/api/datasources' });

/** GET /api/datasources 列表 (分页) */
router.get('/', validate(listDatasourceSchema), async (ctx) => {
  const q = ctx.query as any;
  const result = await datasourceService.list(q);
  ctx.body = ResponseUtil.paginate(result.list, result.total, result.page, result.pageSize);
});

/** GET /api/datasources/:id 详情 */
router.get('/:id', validate(idParamSchema), async (ctx) => {
  const result = await datasourceService.getById(ctx.params.id as unknown as number);
  ctx.body = ResponseUtil.success(result);
});

/** POST /api/datasources 创建 */
router.post('/', validate(createDatasourceSchema), async (ctx) => {
  const { userId } = ctx.state.user as JwtPayload;
  const result = await datasourceService.create(ctx.request.body as any, userId);
  ctx.body = ResponseUtil.success(result, '创建成功');
});

/** PUT /api/datasources/:id 更新 */
router.put('/:id', validate(updateDatasourceSchema), async (ctx) => {
  const result = await datasourceService.update(
    ctx.params.id as unknown as number,
    ctx.request.body as any
  );
  ctx.body = ResponseUtil.success(result, '更新成功');
});

/** DELETE /api/datasources/:id 删除 */
router.delete('/:id', validate(idParamSchema), async (ctx) => {
  await datasourceService.remove(ctx.params.id as unknown as number);
  ctx.body = ResponseUtil.success(null, '删除成功');
});

/** POST /api/datasources/:id/test 测试连接 */
router.post('/:id/test', validate(idParamSchema), async (ctx) => {
  const result = await datasourceService.test(ctx.params.id as unknown as number);
  ctx.body = ResponseUtil.success(result, '连接成功');
});

/** GET /api/datasources/:id/tables 获取表列表 */
router.get('/:id/tables', validate(idParamSchema), async (ctx) => {
  const tables = await datasourceService.listTables(ctx.params.id as unknown as number);
  ctx.body = ResponseUtil.success(tables);
});

export default router;
