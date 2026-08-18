/**
 * ============================================================================
 * BI 低代码平台 - 客户端 IP 工具 (安全版)
 * ============================================================================
 * 从请求中获取客户端真实 IP, 带 受信代理白名单 校验。
 *
 * 安全策略:
 *   - 仅当请求直连来源 IP (ctx.ip) 在 TRUSTED_PROXIES 白名单内时,
 *     才信任 X-Forwarded-For / X-Real-IP 头, 防止客户端伪造。
 *   - 否则直接返回 ctx.ip (TCP 连接的对端地址)。
 *
 * 配置:
 *   环境变量 TRUSTED_PROXIES 为逗号分隔的 IP 列表, 如 "127.0.0.1,::1,10.0.0.0/8"
 *   未配置时默认仅信任本地回环 (127.0.0.1, ::1), 适配开发环境。
 * ============================================================================
 */
import type { Context } from 'koa'

const TRUSTED_PROXIES_RAW = process.env.TRUSTED_PROXIES || '127.0.0.1,::1'

// 解析白名单: 支持 IP 和 CIDR
const trustedSet = new Set<string>()
const trustedCidrs: { base: bigint; mask: bigint }[] = []
for (const raw of TRUSTED_PROXIES_RAW.split(',')
  .map((s) => s.trim())
  .filter(Boolean)) {
  if (raw.includes('/')) {
    // CIDR (IPv4 only for simplicity)
    const [ip, prefix] = raw.split('/')
    const base = ipv4ToBigInt(ip)
    const mask = prefix
      ? (BigInt(0xffffffff) << BigInt(32 - Number(prefix))) & BigInt(0xffffffff)
      : BigInt(0xffffffff)
    if (base !== null) trustedCidrs.push({ base: base & mask, mask })
  } else {
    trustedSet.add(raw)
  }
}

function ipv4ToBigInt(ip: string): bigint | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let result = BigInt(0)
  for (const p of parts) {
    const n = Number(p)
    if (!Number.isInteger(n) || n < 0 || n > 255) return null
    result = (result << BigInt(8)) | BigInt(n)
  }
  return result
}

function isTrusted(ip: string): boolean {
  if (trustedSet.has(ip)) return true
  // IPv4 CIDR 匹配
  if (ip.includes('.')) {
    const ipInt = ipv4ToBigInt(ip)
    if (ipInt !== null) {
      for (const cidr of trustedCidrs) {
        if ((ipInt & cidr.mask) === cidr.base) return true
      }
    }
  }
  return false
}

/**
 * 安全获取客户端 IP
 * 仅在受信代理白名单内时信任 X-Forwarded-For / X-Real-IP
 */
export function getClientIp(ctx: Context): string {
  const directIp = ctx.ip || ''
  // 只有直连 IP 在白名单内时, 才信任代理头
  if (isTrusted(directIp)) {
    const xff = ctx.headers['x-forwarded-for']
    if (typeof xff === 'string' && xff) {
      return xff.split(',')[0].trim()
    }
    const xRealIp = ctx.headers['x-real-ip']
    if (typeof xRealIp === 'string' && xRealIp) {
      return xRealIp.trim()
    }
  }
  return directIp || 'unknown'
}
