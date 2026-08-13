/**
 * ============================================================================
 * BI 低代码平台 - AES-256-GCM 加解密工具
 * ============================================================================
 * 用于数据源密码等敏感信息的加密存储
 * 密钥从环境变量 CRYPTO_KEY 读取 (32 字节 hex 字符串 = 64 字符)
 * ============================================================================
 */

import crypto from 'crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // GCM 推荐 12 字节, 这里用 16 兼容
const TAG_LENGTH = 16;

/** 获取加密密钥 (32 字节) */
function getKey(): Buffer {
  const keyHex = config.cryptoKey;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('CRYPTO_KEY 必须是 64 字符的 hex 字符串 (32 字节), 运行 `openssl rand -hex 32` 生成');
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * 加密明文字符串
 * @returns 格式: iv:tag:ciphertext (均为 hex)
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * 解密密文字符串
 * @param ciphertext 格式: iv:tag:ciphertext
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('密文格式无效, 期望格式: iv:tag:ciphertext');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * 判断字符串是否为加密格式 (iv:tag:ciphertext)
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  return parts.length === 3 && parts[0].length === IV_LENGTH * 2 && parts[1].length === TAG_LENGTH * 2;
}
