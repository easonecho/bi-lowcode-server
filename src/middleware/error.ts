/**
 * ============================================================================
 * BI 低代码平台 - 错误处理中间件
 * ============================================================================
 * 统一捕获和处理所有未处理的错误
 * ============================================================================
 */

import { Context, Next } from 'koa';

export async function errorHandler(ctx: Context, next: Next): Promise<void> {
  try {
    await next();
  } catch (err: any) {
    // 记录错误日志
    console.error('[Error]', err);

    // 设置响应状态码
    ctx.status = err.status || 500;

    // 统一错误响应格式
    ctx.body = {
      code: err.code || -1,
      message: err.message || '服务器内部错误',
      data: undefined,
    };
  }
}
