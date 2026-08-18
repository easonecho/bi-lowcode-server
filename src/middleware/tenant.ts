/**
 * ============================================================================
 * BI 低代码平台 - 多租户上下文中间件
 * ============================================================================
 * 在认证中间件之后执行, 将 JWT 中的 tenantId/userId/roleId 注入请求级上下文
 * (AsyncLocalStorage), 供 Service 层隐式读取做租户隔离过滤。
 *
 * 链路顺序 (app.ts): errorHandler -> requestLogger -> cors -> bodyParser
 *   -> swagger -> authMiddleware -> tenantContext -> 路由
 * ============================================================================
 */

import { Context, Next } from 'koa'
import { runWithContext } from '../utils/request-context'
import { prisma } from '../config/prisma'
import type { JwtPayload } from '../utils/jwt'

/**
 * 多租户上下文中间件
 * - 已认证请求: 注入上下文后放行
 * - 未认证请求 (公开路由, authMiddleware 未挂载 user): 直接放行, 不注入上下文
 */
export async function tenantContext(ctx: Context, next: Next): Promise<void> {
  const user = ctx.state?.user as JwtPayload | undefined
  if (!user) {
    await next()
    return
  }

  // fail-closed: 旧版 Token 无 tenantId 字段, 强制重新登录
  if (user.tenantId === undefined || user.tenantId === null) {
    ctx.status = 401
    ctx.body = { code: 401, message: 'Token 已过期，请重新登录', data: undefined }
    return
  }

  // 一次性加载角色的数据范围类型 (dsType), 避免每次 service 查询都查 role
  const role = await prisma.role.findUnique({
    where: { id: user.roleId },
    select: { dsType: true, deleted: true },
  })
  // 角色被删除或不存在: fail-closed, 拒绝访问
  if (!role || role.deleted) {
    ctx.status = 403
    ctx.body = { code: 403, message: '账号所属角色已被禁用，请联系管理员', data: undefined }
    return
  }

  await runWithContext(
    {
      tenantId: user.tenantId,
      userId: user.userId,
      roleId: user.roleId,
      dsType: role.dsType,
      username: user.username,
      roleIds: user.roleIds || [user.roleId],
    },
    async () => {
      ctx.state.tenantId = user.tenantId
      ctx.state.dsType = role.dsType
      await next()
    },
  )
}
