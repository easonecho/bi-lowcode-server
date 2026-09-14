/**
 * ============================================================================
 * BI 低代码平台 - JWT 认证中间件
 * ============================================================================
 * 从 Authorization Header 中提取 Token 并验证
 * 验证通过后将用户信息挂载到 ctx.state.user
 * ============================================================================
 */

import { Context, Next } from 'koa'
import { verifyToken } from '../utils/jwt'
import { isTokenBlacklisted } from '../utils/token-blacklist'

// 不需要认证的路由路径
const publicPaths = [
  '/api/auth/login', // 登录
  '/api/auth/register', // 注册
  '/api/auth/refresh', // 刷新 access token (用 refresh token)
  '/api-docs', // Swagger UI 文档
  '/api-docs/.*', // Swagger UI 资源
  '/swagger.json', // OpenAPI JSON 规范 (用于 YApi 导入)
  '/', // 根路径
  '/api', // API 根路径
  '/api/health/live', // 存活检查
  '/api/health/ready', // 就绪检查
  '/api/public/dashboards/.+', // 公开看板分享访问
  '/uploads/.*', // 静态素材文件访问 (图片/视频/装饰)
]

/**
 * JWT 认证中间件
 */
export async function authMiddleware(ctx: Context, next: Next): Promise<void> {
  // 检查是否为公开路径
  const path = ctx.path
  const isPublic = publicPaths.some((p) => {
    return new RegExp(`^${p}$`).test(path)
  })

  if (isPublic) {
    await next()
    return
  }

  // 从 Header 中获取 Token
  const authHeader = ctx.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    ctx.status = 401
    ctx.body = { code: 401, message: '未提供认证 Token，请先登录', data: undefined }
    return
  }

  const token = authHeader.substring(7) // 去掉 "Bearer " 前缀

  // 🔑 只捕获 verifyToken 的错误; await next() 必须移出 try 块,
  // 否则下游 handler 抛出的业务错误(如 SQL 执行失败)会被误判为 Token 失效,返回误导性 401
  let payload
  try {
    payload = verifyToken(token)
  } catch {
    ctx.status = 401
    ctx.body = { code: 401, message: 'Token 无效或已过期，请重新登录', data: undefined }
    return
  }
  // access token 黑名单校验 (主动登出 / 踢人的场景)
  if (isTokenBlacklisted(token)) {
    ctx.status = 401
    ctx.body = { code: 401, message: 'Token 已被作废，请重新登录', data: undefined }
    return
  }
  // 将用户信息挂载到 ctx.state
  ctx.state.user = payload
  await next()
}
