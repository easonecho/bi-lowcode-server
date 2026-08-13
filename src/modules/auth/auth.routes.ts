/**
 * ============================================================================
 * BI 低代码平台 - 认证模块路由层 (Routes)
 * ============================================================================
 * 仅负责路由声明、参数校验、调用 service、返回响应
 * 不包含任何 prisma 调用或业务逻辑
 * ============================================================================
 */

import Router from '@koa/router';
import { ResponseUtil } from '../../utils/response';
import { JwtPayload } from '../../utils/jwt';
import { validate } from '../../middleware/validate';
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from './auth.dto';
import { authService } from './auth.service';

const router = new Router({ prefix: '/api/auth' });

/**
 * POST /api/auth/login
 * 用户登录接口 (公开接口, 无需认证)
 */
router.post('/login', validate(loginSchema), async (ctx) => {
  const result = await authService.login(ctx.request.body as LoginInput);
  ctx.body = ResponseUtil.success(result, '登录成功');
});

/**
 * POST /api/auth/register
 * 用户注册接口 (公开接口, 无需认证)
 */
router.post('/register', validate(registerSchema), async (ctx) => {
  const result = await authService.register(ctx.request.body as RegisterInput);
  ctx.body = ResponseUtil.success(result, '注册成功');
});

/**
 * GET /api/auth/profile
 * 获取当前登录用户信息 (需 JWT 认证)
 */
router.get('/profile', async (ctx) => {
  const { userId } = ctx.state.user as JwtPayload;
  const user = await authService.getProfile(userId);
  ctx.body = ResponseUtil.success(user);
});

export default router;
