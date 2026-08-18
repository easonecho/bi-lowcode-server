/**
 * ============================================================================
 * BI 低代码平台 - 错误处理中间件
 * ============================================================================
 * 统一捕获和处理所有未处理的错误
 * ============================================================================
 */

import { Context, Next } from 'koa'
import logger from '../utils/logger'

export async function errorHandler(ctx: Context, next: Next): Promise<void> {
  try {
    await next()
  } catch (err: any) {
    // 记录错误日志(pino 结构化)
    logger.error({ err, path: ctx.path, method: ctx.method }, '[Error]')

    // 设置响应状态码 (BizException 用 statusCode 字段, 兼容 err.status)
    ctx.status = err.statusCode || err.status || 500

    // 统一错误响应格式
    ctx.body = {
      code: typeof err.code === 'number' ? err.code : -1,
      message: err.message || '服务器内部错误',
      data: undefined,
    }
  }
}
