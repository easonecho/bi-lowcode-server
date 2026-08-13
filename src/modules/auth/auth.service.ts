/**
 * ============================================================================
 * BI 低代码平台 - 认证模块业务逻辑层 (Service)
 * ============================================================================
 * 处理登录/注册/获取用户信息等业务逻辑
 * - 不处理 HTTP 响应, 只抛出 BizException
 * - 密码字段绝不出现在返回结果中
 * ============================================================================
 */

import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma';
import { generateToken } from '../../utils/jwt';
import { BizException } from '../../utils/biz-error';
import { ErrorCode } from '../../constants/error-code';
import { LoginInput, RegisterInput } from './auth.dto';

/** 登录/注册返回的用户信息 (不含密码) */
interface AuthUserResult {
  id: number;
  username: string;
  email: string | null;
  phone: string | null;
  nickname: string | null;
  avatar: string | null;
  status: number;
  roleId: number;
  createdAt: Date;
  updatedAt: Date;
}

/** 登录返回结果 (含角色信息) */
interface LoginResult {
  token: string;
  user: AuthUserResult & {
    roleName: string;
    permissions: unknown;
  };
}

/** 注册返回结果 */
interface RegisterResult {
  token: string;
  user: AuthUserResult;
}

/**
 * 用户登录
 * 流程: 查用户 → 校验密码 → 检查状态 → 生成 JWT → 返回 { token, user }
 */
export async function login(data: LoginInput): Promise<LoginResult> {
  const { username, password } = data;

  // 1. 查找用户 (需要取密码用于校验)
  const user = await prisma.user.findUnique({
    where: { username },
    include: { role: true },
  });

  // 用户不存在: 不暴露具体原因, 统一返回"用户名或密码错误"
  if (!user) {
    throw new BizException(ErrorCode.USER_PASSWORD_ERROR);
  }

  // 软删除用户视为不存在
  if (user.deleted) {
    throw new BizException(ErrorCode.USER_PASSWORD_ERROR);
  }

  // 2. 检查用户状态
  if (user.status === 0) {
    throw new BizException(ErrorCode.USER_DISABLED);
  }

  // 3. 校验密码 (bcrypt)
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new BizException(ErrorCode.USER_PASSWORD_ERROR);
  }

  // 4. 生成 JWT Token
  const token = generateToken({
    userId: user.id,
    username: user.username,
    roleId: user.roleId,
  });

  // 5. 返回用户信息 (不包含密码)
  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      nickname: user.nickname,
      avatar: user.avatar,
      status: user.status,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions: user.role.permissions,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  };
}

/**
 * 用户注册
 * 流程: 检查用户名是否存在 → bcrypt 加密密码 → 创建用户(roleId=2) → 生成 JWT → 返回 { token, user }
 */
export async function register(data: RegisterInput): Promise<RegisterResult> {
  const { username, password, email, phone, nickname } = data;

  // 1. 检查用户名是否已存在
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    throw new BizException(ErrorCode.USER_ALREADY_EXISTS);
  }

  // 2. 加密密码 (bcrypt)
  const hashedPassword = await bcrypt.hash(password, 10);

  // 3. 创建用户 (默认角色: 普通用户 roleId=2)
  const user = await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      email,
      phone,
      nickname: nickname || username,
      roleId: 2,
      createBy: username,
    },
    select: {
      id: true,
      username: true,
      email: true,
      phone: true,
      nickname: true,
      avatar: true,
      status: true,
      roleId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // 创建用户-角色关联 (P0: 多角色支持)
  const defaultRole = await prisma.role.findUnique({ where: { code: 'USER' } });
  if (defaultRole) {
    await prisma.userRole.create({ data: { userId: user.id, roleId: defaultRole.id } }).catch(() => {});
  }

  // 4. 生成 JWT Token
  const token = generateToken({
    userId: user.id,
    username: user.username,
    roleId: user.roleId,
  });

  // 5. 返回结果 (select 已排除 password)
  return { token, user };
}

/**
 * 获取当前登录用户信息
 * P0 修复: 不再同时使用 include 和 select, 仅使用 select (含 role 嵌套查询)
 */
export async function getProfile(userId: number): Promise<AuthUserResult & { role: unknown }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      phone: true,
      nickname: true,
      avatar: true,
      status: true,
      deleted: true,
      roleId: true,
      role: {
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          permissions: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new BizException(ErrorCode.USER_NOT_FOUND);
  }

  if (user.deleted) {
    throw new BizException(ErrorCode.USER_NOT_FOUND);
  }

  return user;
}

/**
 * 认证模块 Service 导出
 */
export const authService = {
  login,
  register,
  getProfile,
};
