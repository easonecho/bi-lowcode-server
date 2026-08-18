/**
 * ============================================================================
 * BI 低代码平台 - 操作日志中间件 (落库到 OperationLog 表)
 * ============================================================================
 * 自动记录关键操作 (写操作 + 敏感查询) 到 operation_logs 表, 用于审计追溯.
 *
 * 记录策略:
 *   - 写操作 (POST/PUT/DELETE) 全记录
 *   - 敏感查询 (POST /api/auth/login, /api/auth/refresh, /api/datasets/preview,
 *     /api/datasets/:id/execute, /api/charts/:id/data) 也记录
 *   - 普通 GET 查询不记录 (避免日志爆炸, 可通过 requestLogger 看访问日志)
 *
 * 落库策略:
 *   - 异步落库 (setImmediate), 不阻塞响应
 *   - 落库失败仅打 warn 日志, 不影响主流程
 *   - 敏感字段 (password 等) 自动脱敏
 * ============================================================================
 */

import { Context, Next } from 'koa'
import { getClientIp } from '../utils/ip'
import { prisma } from '../config/prisma'
import { getRequestContext } from '../utils/request-context'
import logger from '../utils/logger'

/** 需要记录日志的 GET 路径正则 (敏感查询) */
const SENSITIVE_GET_PATTERNS: RegExp[] = [
  // 数据集执行/预览
  /^\/api\/datasets\/preview$/,
  /^\/api\/datasets\/\d+\/execute$/,
  // 图表数据查询
  /^\/api\/charts\/\d+\/data$/,
]

/** 敏感字段名 (大小写不敏感), 值会被替换为 *** */
const SENSITIVE_FIELDS = new Set([
  'password',
  'oldPassword',
  'newPassword',
  'confirmPassword',
  'refreshToken',
  'accessToken',
  'secret',
  'apiKey',
  'token',
])

/** 操作类型推断: 从 HTTP method + path 推断 */
function inferAction(method: string, p: string): string {
  // 登录/注册/登出/刷新 直接匹配路径关键词
  if (p.includes('/auth/login')) return 'login'
  if (p.includes('/auth/register')) return 'register'
  if (p.includes('/auth/logout')) return 'logout'
  if (p.includes('/auth/refresh')) return 'refresh'
  if (p.includes('/preview')) return 'preview'
  if (p.includes('/execute')) return 'execute'
  if (p.includes('/data') && method === 'POST') return 'query'
  if (p.includes('/export')) return 'export'
  if (p.includes('/csv')) return 'export_csv'
  if (p.includes('/json') && method === 'POST') return 'export_json'

  // 通用 CRUD 推断
  switch (method) {
    case 'POST':
      return 'create'
    case 'PUT':
    case 'PATCH':
      return 'update'
    case 'DELETE':
      return 'delete'
    default:
      return method.toLowerCase()
  }
}

/** 从路径推断业务模块 */
function inferModule(p: string): string {
  // /api/datasources/:id -> datasource
  const m = p.match(/^\/api\/([a-z-]+)/)
  if (!m) return 'unknown'
  const mod = m[1]
  // 复数转单数 (datasources -> datasource)
  return mod.endsWith('s') ? mod.slice(0, -1) : mod
}

/** 判断是否需要记录日志 */
function shouldLog(method: string, p: string): boolean {
  // 写操作全部记录
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return true
  }
  // 敏感 GET 查询
  if (method === 'GET' || method === 'POST') {
    return SENSITIVE_GET_PATTERNS.some((re) => re.test(p))
  }
  return false
}

/** 敏感字段脱敏 (递归处理对象/数组) */
function maskSensitive(obj: any, depth = 0): any {
  if (obj === null || obj === undefined) return obj
  if (depth > 5) return '[max-depth]' // 防止循环引用
  if (typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.slice(0, 100).map((item) => maskSensitive(item, depth + 1))
  }

  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      result[key] = '***'
    } else {
      result[key] = maskSensitive(value, depth + 1)
    }
  }
  return result
}

/** 截断字符串到指定长度 */
function truncate(s: string | undefined, max: number): string | undefined {
  if (!s) return s
  return s.length > max ? `${s.slice(0, max)}...` : s
}

/**
 * 操作日志中间件
 * - 在路由前注册, 在响应后 (await next() 之后) 异步落库
 * - 即使请求抛错 (ctx.status >= 400) 也会记录, 便于排查问题
 */
export async function operationLogger(ctx: Context, next: Next): Promise<void> {
  const startAt = Date.now()
  const method = ctx.method
  const p = ctx.path

  // 提前判断: 不需要记录的请求直接放行 (减少开销)
  if (!shouldLog(method, p)) {
    await next()
    return
  }

  // 先执行业务逻辑, 再记录 (这样能拿到 status / 错误信息)
  let caughtError: any = null
  try {
    await next()
  } catch (err) {
    caughtError = err
    // 不吞错误, 交给 errorHandler 处理
    throw err
  } finally {
    // 异步落库 (不阻塞响应)
    const duration = Date.now() - startAt
    const ctxState = ctx.state
    const user = ctxState?.user as { userId?: number; username?: string } | undefined
    const reqCtx = getRequestContext()
    const tenantId = reqCtx?.tenantId ?? 1

    // 收集请求参数 (body + query, 脱敏)
    let params: any = undefined
    try {
      const body = (ctx.request as any).body
      const query = ctx.query
      const merged: any = {}
      if (body && typeof body === 'object' && Object.keys(body).length > 0) {
        merged.body = body
      }
      if (query && Object.keys(query).length > 0) {
        merged.query = query
      }
      if (Object.keys(merged).length > 0) {
        params = maskSensitive(merged)
      }
    } catch {
      /* ignore */
    }

    // 错误信息 (限 2000 字符)
    const errorMsg = caughtError?.message || (ctx.status >= 400 ? `HTTP ${ctx.status}` : undefined)

    // 用 setImmediate 异步落库, 不阻塞响应
    setImmediate(() => {
      prisma.operationLog
        .create({
          data: {
            userId: user?.userId ?? null,
            username: user?.username ?? null,
            module: inferModule(p),
            action: inferAction(method, p),
            method,
            path: truncate(p, 500) || p,
            params: params ?? undefined,
            ip: truncate(getClientIp(ctx), 50),
            userAgent: truncate(ctx.headers['user-agent'], 500),
            status: ctx.status,
            duration,
            errorMsg: truncate(errorMsg, 2000),
            tenantId,
          },
        })
        .catch((err) => {
          // 落库失败不影响主流程, 仅打 warn
          logger.warn({ err: err.message, path: p, method }, '操作日志落库失败')
        })
    })
  }
}
