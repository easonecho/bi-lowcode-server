/**
 * 用户模块 Routes (分层 + RBAC)
 */
import Router from '@koa/router';
import { ResponseUtil } from '../../utils/response';
import { JwtPayload } from '../../utils/jwt';
import { validate, idParamSchema } from '../../middleware/validate';
import { requireAdmin } from '../../middleware/role';
import {
  listUserSchema, createUserSchema, updateUserSchema, changeRoleSchema,
} from './user.dto';
import { userService } from './user.service';

const router = new Router({ prefix: '/api/users' });

/** GET /api/users (管理员) */
router.get('/', requireAdmin, validate(listUserSchema), async (ctx) => {
  const r = await userService.list(ctx.query as any);
  ctx.body = ResponseUtil.paginate(r.list, r.total, r.page, r.pageSize);
});

router.get('/:id', requireAdmin, validate(idParamSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(await userService.getById(ctx.params.id as any));
});

router.post('/', requireAdmin, validate(createUserSchema), async (ctx) => {
  const { userId } = ctx.state.user as JwtPayload;
  ctx.body = ResponseUtil.success(
    await userService.create(ctx.request.body as any, userId),
    '创建成功'
  );
});

router.put('/:id', requireAdmin, validate(updateUserSchema), async (ctx) => {
  ctx.body = ResponseUtil.success(
    await userService.update(ctx.params.id as any, ctx.request.body as any),
    '更新成功'
  );
});

router.delete('/:id', requireAdmin, validate(idParamSchema), async (ctx) => {
  const { userId } = ctx.state.user as JwtPayload;
  await userService.remove(ctx.params.id as any, userId);
  ctx.body = ResponseUtil.success(null, '删除成功');
});

router.patch('/:id/role', requireAdmin, validate(changeRoleSchema), async (ctx) => {
  const body = ctx.request.body as any;
  ctx.body = ResponseUtil.success(
    await userService.changeRole(ctx.params.id as any, body.roleId),
    '角色已更新'
  );
});

export default router;
