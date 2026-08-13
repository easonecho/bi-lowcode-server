/**
 * ============================================================================
 * BI 低代码平台 - Swagger 文档中间件
 * ============================================================================
 * 提供:
 * - /swagger.json  -> OpenAPI JSON 规范 (用于导入 YApi)
 * - /api-docs      -> Swagger UI 可视化文档
 * ============================================================================
 */

import { Context, Next } from 'koa';
import path from 'path';
import fs from 'fs';
import { swaggerSpec } from '../config/swagger';

// 加载 Swagger UI 静态资源
const swaggerUiPath = path.dirname(require.resolve('swagger-ui-dist'));
const swaggerUiAssets = fs.readFileSync(path.join(swaggerUiPath, 'swagger-ui-bundle.js'), 'utf-8');
const swaggerUiCss = fs.readFileSync(path.join(swaggerUiPath, 'swagger-ui.css'), 'utf-8');

/**
 * Swagger 文档中间件
 * 处理 /swagger.json 和 /api-docs 路由
 */
export async function swaggerMiddleware(ctx: Context, next: Next): Promise<void> {
  const path = ctx.path;

  // 1. 返回 OpenAPI JSON 规范
  if (path === '/swagger.json') {
    ctx.set('Content-Type', 'application/json; charset=utf-8');
    ctx.set('Access-Control-Allow-Origin', '*');
    ctx.body = swaggerSpec;
    return;
  }

  // 2. 返回 Swagger UI 页面
  if (path === '/api-docs' || path === '/api-docs/') {
    ctx.set('Content-Type', 'text/html; charset=utf-8');
    ctx.body = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>BI 低代码平台 - API 文档</title>
  <style>
    body { margin: 0; }
    ${swaggerUiCss}
    .topbar { display: none; }
    .swagger-ui .info .title { color: #1890ff; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script>
    ${swaggerUiAssets}
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: '/swagger.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
        layout: 'BaseLayout',
        requestInterceptor: function(req) {
          // 自动添加 JWT Token 到请求头
          var token = localStorage.getItem('bi_token');
          if (token) {
            req.headers['Authorization'] = 'Bearer ' + token;
          }
          return req;
        }
      });
    };
  </script>
</body>
</html>`;
    return;
  }

  await next();
}
