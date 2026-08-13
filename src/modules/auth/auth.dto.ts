/**
 * ============================================================================
 * BI 低代码平台 - 认证模块 DTO (zod schema 定义)
 * ============================================================================
 * 定义登录/注册接口的请求参数校验规则
 * ============================================================================
 */

import { z } from 'zod';

/**
 * 登录参数 schema
 * Body: { username, password }
 */
export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, '用户名不能为空'),
    password: z.string().min(1, '密码不能为空'),
  }),
});

/**
 * 注册参数 schema
 * Body: { username, password, email?, phone?, nickname? }
 */
export const registerSchema = z.object({
  body: z.object({
    username: z.string().min(2, '用户名至少 2 个字符').max(50, '用户名最多 50 个字符'),
    password: z.string().min(6, '密码至少 6 位').max(50, '密码最多 50 个字符'),
    email: z.string().email('邮箱格式不正确').optional(),
    phone: z.string().optional(),
    nickname: z.string().optional(),
  }),
});

/** 登录请求体类型 */
export type LoginInput = z.infer<typeof loginSchema>['body'];

/** 注册请求体类型 */
export type RegisterInput = z.infer<typeof registerSchema>['body'];
