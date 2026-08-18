/**
 * ============================================================================
 * BI 低代码平台 - 在线用户跟踪器 (P2-4)
 * ============================================================================
 * 内存级在线用户表, 用于系统监控页展示当前活跃用户。
 * 设计取舍:
 *   - 单进程内存方案: 简单可靠, 适合中小规模部署; 多实例场景需迁移到 Redis。
 *   - 30 分钟无活动自动清除: 通过 lastActiveAt 软过期, 查询时按需清理。
 *   - trackOnRequest 中间件在每个认证请求后刷新 lastActiveAt, 保持活跃状态。
 * ============================================================================
 */
import type { JwtPayload } from './jwt'

export interface OnlineUser {
  userId: number
  username: string
  nickname?: string
  roleId: number
  loginAt: Date
  lastActiveAt: Date
  ip: string
}

/** 跟踪入参: 在 JwtPayload 基础上可选携带 nickname */
export type TrackUserInput = JwtPayload & { nickname?: string }

const onlineMap = new Map<number, OnlineUser>()
const TIMEOUT_MS = 30 * 60 * 1000 // 30 分钟

/** 清理超时用户 (惰性清理, 查询时调用) */
function cleanup(): void {
  const now = Date.now()
  for (const [userId, u] of onlineMap) {
    if (now - u.lastActiveAt.getTime() > TIMEOUT_MS) {
      onlineMap.delete(userId)
    }
  }
}

/** 登录时调用, 加入在线表 */
export function trackOnlineUser(user: TrackUserInput, ip: string): void {
  const now = new Date()
  const existing = onlineMap.get(user.userId)
  if (existing) {
    existing.lastActiveAt = now
    existing.ip = ip
  } else {
    onlineMap.set(user.userId, {
      userId: user.userId,
      username: user.username,
      nickname: user.nickname,
      roleId: user.roleId,
      loginAt: now,
      lastActiveAt: now,
      ip,
    })
  }
}

/** 登出时调用, 移出在线表 */
export function removeOnlineUser(userId: number): void {
  onlineMap.delete(userId)
}

/** 请求级刷新 (中间件调用): 刷新 lastActiveAt */
export function refreshOnlineUser(userId: number, ip: string): void {
  const u = onlineMap.get(userId)
  if (u) {
    u.lastActiveAt = new Date()
    u.ip = ip
  }
}

/** 获取所有在线用户 (含超时清理) */
export function getOnlineUsers(): OnlineUser[] {
  cleanup()
  return Array.from(onlineMap.values()).sort(
    (a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime(),
  )
}

/** 强制踢人下线 */
export function kickUser(userId: number): boolean {
  return onlineMap.delete(userId)
}

/** 在线用户数 */
export function getOnlineCount(): number {
  cleanup()
  return onlineMap.size
}
