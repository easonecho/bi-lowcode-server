/**
 * ============================================================================
 * BI 低代码平台 - JWT 工具
 * ============================================================================
 * 生成和验证 JWT Token
 * ============================================================================
 */

import jwt from 'jsonwebtoken';
import { config } from '../config';

// JWT 载荷接口
export interface JwtPayload {
  userId: number;      // 用户ID
  username: string;    // 用户名
  roleId: number;      // 角色ID
}

/**
 * 生成 JWT Token
 * @param payload 载荷信息
 * @returns JWT Token 字符串
 */
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
}

/**
 * 验证 JWT Token
 * @param token JWT Token 字符串
 * @returns 解码后的载荷信息
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
}
