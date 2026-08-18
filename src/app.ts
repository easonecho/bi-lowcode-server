/**
 * ============================================================================
 * BI 低代码平台 - Koa 应用主入口 (重构)
 * ============================================================================
 * 创建 Koa 应用，注册中间件和路由
 * 参考 jvs-gateway 的中间件链: 错误处理 → 日志 → CORS → 解析 → 文档 → 认证 → 路由
 * ============================================================================
 */

import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import logger from 'koa-logger'
import cors from '@koa/cors'
import helmet from 'koa-helmet'
import { config, getCorsOrigins } from './config'
import { errorHandler } from './middleware/error'
import { requestLogger } from './middleware/request-logger'
import { authMiddleware } from './middleware/auth'
import { tenantContext } from './middleware/tenant'
import { startBlacklistGc } from './utils/token-blacklist'
import { globalRateLimit } from './middleware/rate-limit'
import { operationLogger } from './middleware/operation-logger'
import { swaggerMiddleware } from './middleware/swagger'

// 导入路由模块
import authRoutes from './modules/auth/auth.routes'
import userRoutes from './modules/user/user.routes'
import roleRoutes from './modules/role/role.routes'
import departmentRoutes from './modules/department/department.routes'
import datasourceRoutes from './modules/datasource/datasource.routes'
import datasetRoutes from './modules/dataset/dataset.routes'
import dashboardRoutes from './modules/dashboard/dashboard.routes'
import dashboardGroupRoutes from './modules/dashboard/dashboard-group.routes'
import dashboardTemplateRoutes from './modules/dashboard/dashboard-template.routes'
import chartRoutes from './modules/chart/chart.routes'
import exportRoutes from './modules/export/export.routes'
import healthRoutes from './modules/health/health.routes'
import shareRoutes from './modules/share/share.routes'
import menuRoutes from './modules/menu/menu.routes'
import operationLogRoutes from './modules/operation-log/operation-log.routes'
import dictRoutes from './modules/dict/dict.routes'
import sysConfigRoutes from './modules/system-config/sys-config.routes'
import positionRoutes from './modules/position/position.routes'
import scheduledTaskRoutes from './modules/scheduled-task/scheduled-task.routes'
import monitorRoutes from './modules/monitor/monitor.routes'

/**
 * 创建 Koa 应用
 */
const app = new Koa()

/**
 * 注册全局中间件 (注意顺序很重要!)
 */
// 1. 错误处理 (最先执行，捕获所有错误)
app.use(errorHandler)

// 2. 请求日志 + traceId (结构化日志, 替代 koa-logger)
app.use(requestLogger)

// 2.5 安全响应头 (Helmet: HSTS / CSP / X-Frame-Options / nosniff 等)
app.use(
  helmet({
    // 生产环境强制 HTTPS (开发环境不强制, 避免 http 调试被拦)
    hsts:
      process.env.NODE_ENV === 'production'
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
    // 防止点击劫持
    frameguard: { action: 'deny' },
    // 禁用 MIME 嗅探
    noSniff: true,
    // 禁用 XSS 过滤器 (现代浏览器已废弃, 反而可能引入漏洞)
    xssFilter: false,
    // 隐藏 Powered-By
    hidePoweredBy: true,
    // 禁用下载文件类型嗅探
    ieNoOpen: true,
    // 限制 Referrer 信息泄露
    referrerPolicy: { policy: 'same-origin' },
    // 跨域资源策略: 同源 (API 服务不需要跨域加载资源)
    crossOriginResourcePolicy: { policy: 'same-origin' },
    // 不允许 DNS 预取 (减少信息泄露)
    dnsPrefetchControl: { allow: false },
  }),
)

// 2.6 全局限流 (每个 IP 每分钟 100 次, 防止基础暴力扫描)
app.use(globalRateLimit)

// 3. 开发模式下的控制台请求日志 (可选, 与 pino 互补)
if (config.isDev) {
  app.use(logger())
}

// 4. 跨域处理 (P0 修复: 不再使用 origin:'*' + credentials:true)
const allowedOrigins = getCorsOrigins()
app.use(
  cors({
    origin: (ctx) => {
      const requestOrigin = ctx.request.header.origin
      if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
        return requestOrigin
      }
      if (!requestOrigin) {
        return allowedOrigins[0] || ''
      }
      return ''
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Trace-Id'],
    exposeHeaders: ['X-Trace-Id'],
    credentials: true,
    maxAge: 86400,
  }),
)

// 5. 请求体解析 (解析 JSON / form 数据)
app.use(
  bodyParser({
    jsonLimit: '10mb',
    formLimit: '10mb',
    textLimit: '10mb',
  }),
)

// 6. Swagger 文档中间件 (放在认证之前，确保 /swagger.json 和 /api-docs 无需 Token 即可访问)
app.use(swaggerMiddleware)

// 7. JWT 认证中间件
app.use(authMiddleware)

// 8. 多租户上下文中间件 (在认证之后, 注入 tenantId 到请求级上下文)
app.use(tenantContext)

// 9. 操作日志中间件 (在认证/租户之后, 路由之前, 这样能拿到 ctx.state.user 和 tenantId)
app.use(operationLogger)

/**
 * 注册路由模块
 */
app.use(authRoutes.routes()).use(authRoutes.allowedMethods())
app.use(userRoutes.routes()).use(userRoutes.allowedMethods())
app.use(roleRoutes.routes()).use(roleRoutes.allowedMethods())
app.use(departmentRoutes.routes()).use(departmentRoutes.allowedMethods())
app.use(datasourceRoutes.routes()).use(datasourceRoutes.allowedMethods())
app.use(datasetRoutes.routes()).use(datasetRoutes.allowedMethods())
app.use(dashboardRoutes.routes()).use(dashboardRoutes.allowedMethods())
app.use(dashboardGroupRoutes.routes()).use(dashboardGroupRoutes.allowedMethods())
app.use(dashboardTemplateRoutes.routes()).use(dashboardTemplateRoutes.allowedMethods())
app.use(chartRoutes.routes()).use(chartRoutes.allowedMethods())
app.use(exportRoutes.routes()).use(exportRoutes.allowedMethods())
app.use(healthRoutes.routes()).use(healthRoutes.allowedMethods())
app.use(shareRoutes.routes()).use(shareRoutes.allowedMethods())
app.use(menuRoutes.routes()).use(menuRoutes.allowedMethods())
app.use(operationLogRoutes.routes()).use(operationLogRoutes.allowedMethods())
app.use(dictRoutes.routes()).use(dictRoutes.allowedMethods())
app.use(sysConfigRoutes.routes()).use(sysConfigRoutes.allowedMethods())
app.use(positionRoutes.routes()).use(positionRoutes.allowedMethods())
app.use(scheduledTaskRoutes.routes()).use(scheduledTaskRoutes.allowedMethods())
app.use(monitorRoutes.routes()).use(monitorRoutes.allowedMethods())

// 14. 启动 Token 黑名单后台清理 GC
startBlacklistGc()

/**
 * 根路由 - 健康检查
 */
app.use(async (ctx) => {
  if (ctx.path === '/' || ctx.path === '/api') {
    ctx.body = {
      code: 0,
      message: 'BI 低代码平台服务端运行中',
      data: {
        name: 'BI Low-Code Server',
        version: '1.1.0',
        docs: '/api-docs',
        endpoints: {
          auth: '/api/auth',
          users: '/api/users',
          roles: '/api/roles',
          departments: '/api/departments',
          datasources: '/api/datasources',
          datasets: '/api/datasets',
          dashboards: '/api/dashboards',
          dashboardGroups: '/api/dashboard-groups',
          dashboardTemplates: '/api/dashboard-templates',
          charts: '/api/charts',
          export: '/api/export',
          menus: '/api/menus',
        },
      },
    }
  }
})

export default app
