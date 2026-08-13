/**
 * ============================================================================
 * BI 低代码平台 - 结构化日志
 * ============================================================================
 * 参考 jvs-starter-log, 使用 pino 替代 console
 * 特性: JSON 格式、日志级别、请求 traceId、开发环境可读输出
 * ============================================================================
 */

import pino from 'pino';
import { config } from '../config';

const logger = pino({
  level: config.logLevel,
  base: {
    service: 'bi-lowcode-server',
    env: config.nodeEnv,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // 开发环境用可读格式, 生产环境用 JSON
  transport: config.isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
          ignore: 'pid,hostname,service',
        },
      }
    : undefined,
});

export default logger;
export type Logger = typeof logger;

/**
 * 创建带上下文的子 logger
 * @example const log = createChildLogger({ traceId, userId })
 */
export function createChildLogger(bindings: Record<string, any>) {
  return logger.child(bindings);
}
