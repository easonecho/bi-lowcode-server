/**
 * ============================================================================
 * BI 低代码平台 - 环境配置 (P0 安全修复)
 * ============================================================================
 * 移除所有硬编码的密钥默认值, 启动时强制校验
 * 参考 jvs 的多环境配置 + 启动校验思想
 * ============================================================================
 */

import dotenv from 'dotenv'

dotenv.config()

/** 读取环境变量, 无默认值 (敏感配置必须显式提供) */
function required(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`[启动失败] 环境变量 ${key} 未设置, 请检查 .env 文件`)
  }
  return value
}

/** 读取环境变量, 有默认值 (非敏感配置) */
function optional(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue
}

export const config = {
  // 服务配置
  port: parseInt(optional('PORT', '3000'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),
  isDev: optional('NODE_ENV', 'development') === 'development',

  // 数据库配置 (P0 修复: 移除硬编码密码)
  databaseUrl: required('DATABASE_URL'),

  // JWT 配置
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: optional('JWT_EXPIRES_IN', '15m'), // access token 15 分钟
  jwtRefreshSecret: optional('JWT_REFRESH_SECRET', `${required('JWT_SECRET')}-refresh`),
  jwtRefreshExpiresIn: optional('JWT_REFRESH_EXPIRES_IN', '7d'),

  // 数据源密码加密密钥 (P0 新增: AES-256-GCM)
  cryptoKey: required('CRYPTO_KEY'),

  // 跨域配置 (P0 修复: 不允许 *, 必须显式配置)
  corsOrigin: required('CORS_ORIGIN'),

  // 日志级别
  logLevel: optional('LOG_LEVEL', 'info'),
}

export type Config = typeof config

/**
 * 解析 CORS 白名单 (支持逗号分隔)
 */
export function getCorsOrigins(): string[] {
  return config.corsOrigin
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
