/**
 * ============================================================================
 * BI 低代码平台 - 轻量级内存限流中间件
 * ============================================================================
 * 不引入外部限流依赖 (保持技术栈不变), 自行实现令牌桶/滑动窗口限流.
 *
 * 设计:
 *   - 内存 Map 存储 (key = ip + routeKey, value = {tokens, lastRefill})
 *   - 令牌桶算法: 每次请求消耗 1 个令牌, 按时间间隔补充令牌, 上限 = max
 *   - 超出返回 429 Too Many Requests + Retry-After 头
 *   - 桶在过期后自动从 Map 删除, 避免内存泄漏
 *   - 多实例扩容时建议改 Redis 实现, 接口不变
 *
 * 用法:
 *   app.use(rateLimit({ max: 100, intervalMs: 60_000 }))   // 全局 60s 100 次
 *   router.post('/login', rateLimit({ max: 5, intervalMs: 60_000 }), ...)
 * ============================================================================
 */

import { Context, Next } from 'koa'

import { getClientIp } from '../utils/ip'
export interface RateLimitOptions {
  /** 窗口内最大请求数 (令牌桶上限) */
  max: number
  /** 时间窗口 (毫秒), 默认 60 秒 */
  intervalMs?: number
  /** 自定义 key (默认按 IP; 敏感接口可叠加用户名) */
  keyGenerator?: (ctx: Context) => string
  /** 触发限流时的提示信息 */
  message?: string
  /** 路由标识 (用于区分登录/刷新等不同桶, 默认用 method + path) */
  scope?: string
}

interface TokenBucket {
  tokens: number
  lastRefill: number
}

/** 全局桶存储: key = scope:ip[:userKey] */
const buckets = new Map<string, TokenBucket>()

/** 定时清理过期桶 (每 5 分钟扫描一次, 1 小时未访问则删除) */
const GC_INTERVAL_MS = 5 * 60 * 1000
const BUCKET_TTL_MS = 60 * 60 * 1000
let gcStarted = false
function startGc(): void {
  if (gcStarted) return
  gcStarted = true
  const timer = setInterval(() => {
    const now = Date.now()
    let removed = 0
    buckets.forEach((bucket, key) => {
      if (now - bucket.lastRefill > BUCKET_TTL_MS) {
        buckets.delete(key)
        removed++
      }
    })
    if (removed > 0 && process.env.LOG_LEVEL === 'trace') {
      // 极少触发, 不打日志避免噪音
    }
  }, GC_INTERVAL_MS)
  timer.unref?.()
}

/**
 * 限流中间件工厂
 */
export function rateLimit(options: RateLimitOptions) {
  const {
    max,
    intervalMs = 60_000,
    keyGenerator,
    message = '请求过于频繁，请稍后再试',
    scope,
  } = options

  // 启动后台 GC (单次)
  startGc()

  // 令牌补充速率: intervalMs 内补充 max 个令牌
  const refillRate = max / intervalMs // tokens per ms

  return async function rateLimitMiddleware(ctx: Context, next: Next): Promise<void> {
    const ip = getClientIp(ctx)
    const userKey = keyGenerator ? keyGenerator(ctx) : ''
    const scopeKey = scope || `${ctx.method}:${ctx.path}`
    const key = `${scopeKey}:${ip}${userKey ? `:${userKey}` : ''}`

    const now = Date.now()
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = { tokens: max, lastRefill: now }
      buckets.set(key, bucket)
    } else {
      // 补充令牌
      const elapsed = now - bucket.lastRefill
      const refilled = elapsed * refillRate
      bucket.tokens = Math.min(max, bucket.tokens + refilled)
      bucket.lastRefill = now
    }

    if (bucket.tokens < 1) {
      // 命中限流
      const retryAfterSec = Math.ceil((1 - bucket.tokens) / refillRate / 1000)
      ctx.status = 429
      ctx.set('Retry-After', String(Math.max(1, retryAfterSec)))
      ctx.body = {
        code: 429,
        message,
        data: undefined,
      }
      return
    }

    // 消耗 1 个令牌
    bucket.tokens -= 1

    await next()
  }
}

/** 全局默认限流: 每个 IP 每分钟 100 次 */
export const globalRateLimit = rateLimit({
  max: 100,
  intervalMs: 60_000,
  scope: 'global',
  message: '请求过于频繁，请稍后再试',
})

/** 登录接口限流: 每个 IP 每分钟 5 次 (防爆破) */
export const loginRateLimit = rateLimit({
  max: 5,
  intervalMs: 60_000,
  scope: 'login',
  message: '登录尝试过于频繁，请 1 分钟后再试',
})

/** 注册接口限流: 每个 IP 每分钟 3 次 */
export const registerRateLimit = rateLimit({
  max: 3,
  intervalMs: 60_000,
  scope: 'register',
  message: '注册请求过于频繁，请稍后再试',
})

/** Token 刷新接口限流: 每个 IP 每分钟 10 次 */
export const refreshRateLimit = rateLimit({
  max: 10,
  intervalMs: 60_000,
  scope: 'refresh',
  message: 'Token 刷新过于频繁，请稍后再试',
})
