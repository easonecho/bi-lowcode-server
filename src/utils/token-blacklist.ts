/**
 * ============================================================================
 * BI 低代码平台 - Token 黑名单 (内存实现, 无 Redis)
 * ============================================================================
 * 设计说明:
 *   - 不引入 Redis 等外部依赖 (保持项目技术栈不变), 使用内存 Map 存储黑名单
 *   - 每个 token 记录过期时间戳, 启动后台定时清理 (默认每 30 秒)
 *   - 黑名单仅针对"仍未过期但被主动作废"的 token (登出 / 改密码 / 管理员踢人)
 *   - 已经过期的 token 由 JWT verifyToken 自动拒绝, 无需入黑名单
 *
 * 容量与性能说明:
 *   - 单实例: 千万用户级以下的活跃 token 可直接存内存 (每条 ~150 字节,
 *     10 万条仅 ~15MB); 定期清过期保证集合不会无限膨胀
 *   - 多实例横向扩容: 建议后续上 Redis 广播黑名单 (此 API 保持不变即可平滑迁移)
 * ============================================================================
 */

import logger from './logger'

/** 黑名单条目: key = token (或 jti), value = 过期时间戳 (毫秒) */
const blacklist = new Map<string, number>()

/** 后台清理周期 (毫秒) */
const CLEANUP_INTERVAL_MS = 30 * 1000

/**
 * 判断 token 是否被拉黑 (黑名单中且未过期)
 */
export function isTokenBlacklisted(token: string): boolean {
  if (!token) return false
  const expireAt = blacklist.get(token)
  if (expireAt === undefined) return false
  if (expireAt <= Date.now()) {
    // 到达过期时间后可从集合中移除
    blacklist.delete(token)
    return false
  }
  return true
}

/**
 * 把 token 加入黑名单
 * @param token 完整 JWT 字符串
 * @param expireAtMs 过期时间戳 (毫秒), 默认当前时间 + 24 小时兜底
 *   调用方应传入 JWT 自身的 exp * 1000 (如果能拿到), 以便尽早被 gc 掉
 */
export function blacklistToken(token: string, expireAtMs?: number): void {
  if (!token) return
  const expire = expireAtMs ?? Date.now() + 24 * 60 * 60 * 1000
  // 兜底: 超过 24h 的也只留 24h, 避免异常调用导致内存泄漏
  const safeExpire = Math.min(expire, Date.now() + 24 * 60 * 60 * 1000)
  blacklist.set(token, safeExpire)
}

/**
 * 批量把多组 {token, expireAtMs} 加入黑名单 (管理员批量踢人 / 改密码踢所有设备时用)
 */
export function blacklistTokens(entries: Array<{ token: string; expireAtMs?: number }>): void {
  for (const e of entries) blacklistToken(e.token, e.expireAtMs)
}

/**
 * 手动清理所有已过期的黑名单条目 (也被定时器周期执行)
 */
export function purgeExpired(): number {
  let removed = 0
  const now = Date.now()
  // Map#forEach 允许遍历时 delete (ES2015 spec)
  blacklist.forEach((expireAt, key) => {
    if (expireAt <= now) {
      blacklist.delete(key)
      removed++
    }
  })
  if (removed > 0) {
    logger.trace({ removed, remaining: blacklist.size }, 'token blacklist gc')
  }
  return removed
}

/**
 * 当前黑名单大小 (用于监控 / debug)
 */
export function blacklistSize(): number {
  return blacklist.size
}

/**
 * 启动后台清理定时器 (仅启动一次, app bootstrap 时调用)
 */
let __timerStarted = false
export function startBlacklistGc(): void {
  if (__timerStarted) return
  __timerStarted = true
  setInterval(purgeExpired, CLEANUP_INTERVAL_MS).unref?.()
  logger.info({ intervalMs: CLEANUP_INTERVAL_MS }, 'token blacklist gc started')
}
