/**
 * ============================================================================
 * BI 低代码平台 - JWT 工具
 * ============================================================================
 * 生成和验证 JWT Token
 * ============================================================================
 */

import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'

/** 从 JWT 中提取过期时间戳 (毫秒, 不做签名校验, 用于黑名单 gc) */
export function decodeTokenExpireAt(token: string): number | null {
  try {
    const payload = jwt.decode(token) as any
    return typeof payload?.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}
import { config } from '../config'

/** JWT access token 载荷 */
export interface JwtPayload {
  userId: number
  username: string
  roleId: number
  tenantId: number
  roleIds?: number[] // 多角色并集
}

/** JWT refresh token 载荷 (更精简, 不含 role/username 等会变的字段) */
export interface JwtRefreshPayload {
  userId: number
  tenantId: number
  /** 标记这是 refresh token, 避免被误用为 access */
  type: 'refresh'
}

/** 双 token 返回结构 */
export interface TokenPair {
  accessToken: string
  refreshToken: string
  accessExpiresIn: number // access token 过期秒数 (便于前端做预判刷新)
}

/** 把 zeit/ms 格式 (15m / 7d / 2h) 近似转为秒数, 用于前端预判刷新 */
function expiresInToSeconds(msStr: string): number {
  const s = String(msStr).trim().toLowerCase()
  const m = s.match(/^(\d+(?:\.\d+)?)([smhdwy]?)$/)
  if (!m) return 15 * 60 // 默认 15 分钟
  const n = parseFloat(m[1])
  const unit = m[2] || 's'
  const mult =
    { s: 1, m: 60, h: 60 * 60, d: 60 * 60 * 24, w: 60 * 60 * 24 * 7, y: 60 * 60 * 24 * 365 }[
      unit
    ] || 1
  return Math.floor(n * mult)
}

/** 生成 access token */
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
    jwtid: crypto.randomUUID(),
  } as jwt.SignOptions)
}

/** 验证 access token */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload
}

/** 生成 refresh token */
export function generateRefreshToken(payload: JwtRefreshPayload): string {
  return jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiresIn,
    jwtid: crypto.randomUUID(),
  } as jwt.SignOptions)
}

/** 验证 refresh token */
export function verifyRefreshToken(token: string): JwtRefreshPayload {
  const decoded = jwt.verify(token, config.jwtRefreshSecret) as any
  if (decoded.type !== 'refresh') {
    throw new jwt.JsonWebTokenError('不是有效的 refresh token')
  }
  return decoded as JwtRefreshPayload
}

/** 生成双 token (access + refresh) */
export function generateTokenPair(payload: JwtPayload): TokenPair {
  return {
    accessToken: generateToken(payload),
    refreshToken: generateRefreshToken({
      userId: payload.userId,
      tenantId: payload.tenantId,
      type: 'refresh',
    }),
    accessExpiresIn: expiresInToSeconds(config.jwtExpiresIn),
  }
}

/** 从 access token 中提取 userId (不做签名校验, 仅用于黑名单匹配; 签名校验请用 verifyToken) */
export function decodeUserId(token: string): number | null {
  try {
    const payload = jwt.decode(token) as any
    return typeof payload?.userId === 'number' ? payload.userId : null
  } catch {
    return null
  }
}
