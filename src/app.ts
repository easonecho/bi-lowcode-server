/**
 * ============================================================================
 * BI 低代码平台 - Koa 应用主入口 (重构)
 * ============================================================================
 * 创建 Koa 应用，注册中间件和路由
 * 参考 jvs-gateway 的中间件链: 错误处理 → 日志 → CORS → 解析 → 文档 → 认证 → 路由
 * ============================================================================
 */

import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import logger from 'koa-logger';
import cors from '@koa/cors';
import { config, getCorsOrigins } from './config';
import { errorHandler } from './middleware/error';
import { requestLogger } from './middleware/request-logger';
import { authMiddleware } from './middleware/auth';
import { swaggerMiddleware } from './middleware/swagger';

// 导入路由模块
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/user/user.routes';
import datasourceRoutes from './modules/datasource/datasource.routes';
import datasetRoutes from './modules/dataset/dataset.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import chartRoutes from './modules/chart/chart.routes';
import exportRoutes from './modules/export/export.routes';

/**
 * 创建 Koa 应用
 */
const app = new Koa();

/**
 * 注册全局中间件 (注意顺序很重要!)
 */
// 1. 错误处理 (最先执行，捕获所有错误)
app.use(errorHandler);

// 2. 请求日志 + traceId (结构化日志, 替代 koa-logger)
app.use(requestLogger);

// 3. 开发模式下的控制台请求日志 (可选, 与 pino 互补)
if (config.isDev) {
  app.use(logger());
}

// 4. 跨域处理 (P0 修复: 不再使用 origin:'*' + credentials:true)
const allowedOrigins = getCorsOrigins();
app.use(
  cors({
    origin: (ctx) => {
      const requestOrigin = ctx.request.header.origin;
      if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
        return requestOrigin;
      }
      if (!requestOrigin) {
        return allowedOrigins[0] || '';
      }
      return '';
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Trace-Id'],
    exposeHeaders: ['X-Trace-Id'],
    credentials: true,
    maxAge: 86400,
  })
);

// 5. 请求体解析 (解析 JSON / form 数据)
app.use(
  bodyParser({
    jsonLimit: '10mb',
    formLimit: '10mb',
    textLimit: '10mb',
  })
);

// 6. Swagger 文档中间件 (放在认证之前，确保 /swagger.json 和 /api-docs 无需 Token 即可访问)
app.use(swaggerMiddleware);

// 7. JWT 认证中间件
app.use(authMiddleware);

/**
 * 注册路由模块
 */
app.use(authRoutes.routes()).use(authRoutes.allowedMethods());
app.use(userRoutes.routes()).use(userRoutes.allowedMethods());
app.use(datasourceRoutes.routes()).use(datasourceRoutes.allowedMethods());
app.use(datasetRoutes.routes()).use(datasetRoutes.allowedMethods());
app.use(dashboardRoutes.routes()).use(dashboardRoutes.allowedMethods());
app.use(chartRoutes.routes()).use(chartRoutes.allowedMethods());
app.use(exportRoutes.routes()).use(exportRoutes.allowedMethods());

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
        version: '1.0.0',
        docs: '/api-docs',
        endpoints: {
          auth: '/api/auth',
          users: '/api/users',
          datasources: '/api/datasources',
          datasets: '/api/datasets',
          dashboards: '/api/dashboards',
          charts: '/api/charts',
          export: '/api/export',
        },
      },
    };
  }
});

export default app;