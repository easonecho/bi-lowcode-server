/**
 * ============================================================================
 * BI 低代码平台 - JWT 认证中间件
 * ============================================================================
 * 从 Authorization Header 中提取 Token 并验证
 * 验证通过后将用户信息挂载到 ctx.state.user
 * ============================================================================
 */

import { Context, Next } from 'koa';
import { verifyToken } from '../utils/jwt';

// 不需要认证的路由路径
const publicPaths = [
  '/api/auth/login',     // 登录
  '/api/auth/register',  // 注册
  '/api-docs',           // Swagger UI 文档
  '/api-docs/.*',        // Swagger UI 资源
  '/swagger.json',       // OpenAPI JSON 规范 (用于 YApi 导入)
  '/',                   // 根路径
  '/api',                // API 根路径
];

/**
 * JWT 认证中间件
 */
export async function authMiddleware(ctx: Context, next: Next): Promise<void> {
  // 检查是否为公开路径
  const path = ctx.path;
  const isPublic = publicPaths.some((p) => {
    return new RegExp(`^${p}$`).test(path);
  });

  if (isPublic) {
    await next();
    return;
  }

  // 从 Header 中获取 Token
  const authHeader = ctx.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    ctx.status = 401;
    ctx.body = { code: 401, message: '未提供认证 Token，请先登录' };
    return;
  }

  const token = authHeader.substring(7); // 去掉 "Bearer " 前缀

  try {
    // 验证 Token
    const payload = verifyToken(token);
    // 将用户信息挂载到 ctx.state
    ctx.state.user = payload;
    await next();
  } catch (error) {
    ctx.status = 401;
    ctx.body = { code: 401, message: 'Token 无效或已过期，请重新登录' };
  }
}
