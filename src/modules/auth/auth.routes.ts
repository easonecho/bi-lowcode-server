/**
 * ============================================================================
 * BI 低代码平台 - 认证模块路由层 (Routes)
 * ============================================================================
 * 仅负责路由声明、参数校验、调用 service、返回响应
 * 不包含任何 prisma 调用或业务逻辑
 * ============================================================================
 */

import Router from '@koa/router'
import { getClientIp } from '../../utils/ip'
import { ResponseUtil } from '../../utils/response'
import { JwtPayload } from '../../utils/jwt'
import { validate } from '../../middleware/validate'
import {
  loginSchema,
  registerSchema,
  refreshSchema,
  logoutSchema,
  type LoginInput,
  type RegisterInput,
  type RefreshInput,
} from './auth.dto'
import { authService } from './auth.service'
import { loginRateLimit, registerRateLimit, refreshRateLimit } from '../../middleware/rate-limit'
import { trackOnlineUser, removeOnlineUser } from '../../utils/online-tracker'

const router = new Router({ prefix: '/api/auth' })

/**
 * POST /api/auth/login
 * 用户登录接口 (公开接口, 无需认证)
 */
router.post('/login', loginRateLimit, validate(loginSchema), async (ctx) => {
  const result = await authService.login(ctx.request.body as LoginInput)
  // 登录成功后加入在线用户表 (P2-4)
  trackOnlineUser(
    {
      userId: result.user.id,
      username: result.user.username,
      nickname: result.user.nickname || undefined,
      roleId: result.user.roleId,
      tenantId: result.user.tenantId ?? 1,
      roleIds: result.user.roleIds,
    },
    getClientIp(ctx),
  )
  ctx.body = ResponseUtil.success(result, '登录成功')
})

/**
 * POST /api/auth/register
 * 用户注册接口 (公开接口, 无需认证)
 */
router.post('/register', registerRateLimit, validate(registerSchema), async (ctx) => {
  const result = await authService.register(ctx.request.body as RegisterInput)
  // 注册即视为登录, 也加入在线表
  trackOnlineUser(
    {
      userId: result.user.id,
      username: result.user.username,
      nickname: result.user.nickname || undefined,
      roleId: result.user.roleId,
      tenantId: result.user.tenantId ?? 1,
    },
    getClientIp(ctx),
  )
  ctx.body = ResponseUtil.success(result, '注册成功')
})

/**
 * GET /api/auth/profile
 * 获取当前登录用户信息 (需 JWT 认证)
 */
router.get('/profile', async (ctx) => {
  const { userId } = ctx.state.user as JwtPayload
  const user = await authService.getProfile(userId)
  ctx.body = ResponseUtil.success(user)
})

/**
 * POST /api/auth/refresh
 * 使用 refresh token 换取新的 access + refresh token (公开接口, 无需 Bearer access)
 * 但仍经过 authMiddleware 吗? → 不在 publicPaths 中所以会 401.
 * 所以使用单独的公开路由前缀处理: 直接取 body.refreshToken 验证, 不走 Bearer.
 */
router.post('/refresh', refreshRateLimit, validate(refreshSchema), async (ctx) => {
  // authMiddleware 对非 public 路径强制要求 Bearer access,
  // 但 refresh 接口只需要 refresh token.
  // 故在 authMiddleware 中需把 /api/auth/refresh 加到 publicPaths.
  const body = ctx.request.body as RefreshInput
  const result = await authService.refreshToken(body.refreshToken)
  ctx.body = ResponseUtil.success(result, '刷新成功')
})

/**
 * POST /api/auth/logout
 * 登出: 把 access token + refresh token 加入黑名单 (双保险)
 * 需要已认证 (走 authMiddleware) 以便从 ctx.state.user 提取信息;
 * access token 来自 Authorization 头, refresh token 来自请求体 (前端可选传)
 */
router.post('/logout', validate(logoutSchema), async (ctx) => {
  const authHeader = ctx.headers.authorization
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined
  const body = (ctx.request.body || {}) as any
  authService.logout(accessToken, body.refreshToken)
  // 登出后从在线表移除 (P2-4)
  const payload = ctx.state.user as JwtPayload
  if (payload?.userId) {
    removeOnlineUser(payload.userId)
  }
  ctx.body = ResponseUtil.success(null, '登出成功')
})

export default router
