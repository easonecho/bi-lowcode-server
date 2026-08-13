/**
 * ============================================================================
 * BI 低代码平台 - 请求日志中间件
 * ============================================================================
 * 参考 jvs-gateway 的 RequestTimeFilter
 * 记录每个请求的方法、路径、状态码、耗时, 注入 traceId
 * ============================================================================
 */

import { Context, Next } from 'koa';
import { randomUUID } from 'crypto';
import logger from '../utils/logger';

/**
 * 请求日志 + traceId 中间件
 */
export async function requestLogger(ctx: Context, next: Next): Promise<void> {
  const traceId = (ctx.headers['x-trace-id'] as string) || randomUUID();
  const startTime = Date.now();

  // 注入 traceId 到 ctx.state, 供后续 logger 使用
  ctx.state.traceId = traceId;

  // 注入响应头
  ctx.set('X-Trace-Id', traceId);

  const log = logger.child({ traceId, method: ctx.method, path: ctx.path });

  try {
    await next();

    const duration = Date.now() - startTime;
    const statusCode = ctx.status;

    if (statusCode >= 400) {
      log.warn({ statusCode, duration }, '请求完成 (异常)');
    } else {
      log.info({ statusCode, duration }, '请求完成');
    }
  } catch (err) {
    const duration = Date.now() - startTime;
    log.error({ err, duration }, '请求未捕获异常');
    throw err;
  }
}
