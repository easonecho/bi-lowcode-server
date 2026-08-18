/**
 * ============================================================================
 * BI 低代码平台 - 认证模块业务逻辑层 (Service)
 * ============================================================================
 * 处理登录/注册/获取用户信息等业务逻辑
 * - 不处理 HTTP 响应, 只抛出 BizException
 * - 密码字段绝不出现在返回结果中
 * ============================================================================
 */

import bcrypt from 'bcryptjs'
import { prisma } from '../../config/prisma'
import {
  generateTokenPair,
  TokenPair,
  verifyRefreshToken,
  decodeTokenExpireAt,
} from '../../utils/jwt'
import { blacklistToken, isTokenBlacklisted } from '../../utils/token-blacklist'
import { BizException } from '../../utils/biz-error'
import { ErrorCode } from '../../constants/error-code'
import { LoginInput, RegisterInput } from './auth.dto'
import { getMenuTreeByRoleIds, getPermsByRoleIds } from '../menu/menu.service'
import { runWithContext } from '../../utils/request-context'

/** 登录/注册返回的用户信息 (不含密码) */
interface AuthUserResult {
  id: number
  username: string
  email: string | null
  phone: string | null
  nickname: string | null
  avatar: string | null
  status: number
  roleId: number
  tenantId?: number
  createdAt: Date
  updatedAt: Date
}

/** 登录返回结果 (含角色信息 + 菜单路由 + 权限码) */
interface LoginResult extends TokenPair {
  user: AuthUserResult & {
    roleName: string
    permissions: unknown
    roleIds: number[]
  }
  routers: unknown[]
  perms: string[]
}

/** 注册返回结果 */
interface RegisterResult extends TokenPair {
  user: AuthUserResult
}

/** 刷新 token 返回结果 (含角色信息 + 菜单路由 + 权限码) */
interface RefreshResult extends TokenPair {
  user: AuthUserResult & {
    roleName: string
    permissions: unknown
    roleIds: number[]
  }
  routers: unknown[]
  perms: string[]
}

/**
 * 收集用户的所有角色 ID (主角色 + UserRole 关联角色并集)
 * 失败时回退为只含 primaryRoleId 的数组
 */
async function collectRoleIds(userId: number, primaryRoleId: number): Promise<number[]> {
  try {
    const urs = await prisma.userRole.findMany({
      where: { userId },
      select: { roleId: true },
    })
    const set = new Set<number>([primaryRoleId])
    urs.forEach((r) => set.add(r.roleId))
    return [...set]
  } catch {
    return [primaryRoleId]
  }
}

/**
 * 在请求上下文内构建用户的菜单路由树 + 权限码列表
 * login/refreshToken 不在 HTTP 中间件链中, 需手动 runWithContext 注入上下文
 */
async function buildRoutersAndPerms(
  roleIds: number[],
  tenantId: number,
  userId: number,
  username: string,
  roleId: number,
  dsType: string,
): Promise<{ routers: unknown[]; perms: string[] }> {
  try {
    return await runWithContext(
      { tenantId, userId, roleId, dsType, username, roleIds },
      async () => {
        const [routers, perms] = await Promise.all([
          getMenuTreeByRoleIds(roleIds),
          getPermsByRoleIds(roleIds),
        ])
        return { routers, perms }
      },
    )
  } catch {
    return { routers: [], perms: [] }
  }
}

/**
 * 用户登录
 * 流程: 查用户 → 校验密码 → 检查状态 → 生成 JWT → 返回 { token, user, routers, perms }
 */
export async function login(data: LoginInput): Promise<LoginResult> {
  const { username, password } = data

  // 1. 查找用户 (需要取密码用于校验)
  const user = await prisma.user.findUnique({
    where: { username },
    include: { role: true },
  })

  // 用户不存在: 不暴露具体原因, 统一返回"用户名或密码错误"
  if (!user) {
    throw new BizException(ErrorCode.USER_PASSWORD_ERROR)
  }

  // 软删除用户视为不存在
  if (user.deleted) {
    throw new BizException(ErrorCode.USER_PASSWORD_ERROR)
  }

  // 2. 检查用户状态
  if (user.status === 0) {
    throw new BizException(ErrorCode.USER_DISABLED)
  }

  // 3. 校验密码 (bcrypt)
  const isPasswordValid = await bcrypt.compare(password, user.password)
  if (!isPasswordValid) {
    throw new BizException(ErrorCode.USER_PASSWORD_ERROR)
  }

  // 4. 收集角色并集 (P0: 多角色支持)
  const roleIds = await collectRoleIds(user.id, user.roleId)

  // 5. 生成双 Token (access 15min + refresh 7d), 携带 roleIds
  const pair = generateTokenPair({
    userId: user.id,
    username: user.username,
    roleId: user.roleId,
    tenantId: user.tenantId,
    roleIds,
  })

  // 6. 构建路由树 + 权限码 (在请求上下文中执行)
  const { routers, perms } = await buildRoutersAndPerms(
    roleIds,
    user.tenantId,
    user.id,
    user.username,
    user.roleId,
    user.role.dsType,
  )

  // 7. 返回用户信息 (不包含密码)
  return {
    ...pair,
    routers,
    perms,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      nickname: user.nickname,
      avatar: user.avatar,
      status: user.status,
      roleId: user.roleId,
      tenantId: user.tenantId,
      roleIds,
      roleName: user.role.name,
      permissions: user.role.permissions,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  }
}

/**
 * 用户注册
 * 流程: 检查用户名是否存在 → bcrypt 加密密码 → 创建用户(roleId=2) → 生成 JWT → 返回 { token, user }
 */
export async function register(data: RegisterInput): Promise<RegisterResult> {
  const { username, password, email, phone, nickname } = data

  // 1. 检查用户名是否已存在
  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    throw new BizException(ErrorCode.USER_ALREADY_EXISTS)
  }

  // 2. 加密密码 (bcrypt)
  const hashedPassword = await bcrypt.hash(password, 10)

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
      tenantId: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  // 创建用户-角色关联 (P0: 多角色支持)
  const defaultRole = await prisma.role.findUnique({ where: { code: 'USER' } })
  if (defaultRole) {
    await prisma.userRole
      .create({ data: { userId: user.id, roleId: defaultRole.id } })
      .catch((e: any) => {
        if (e?.code !== 'P2002') throw e
      })
  }

  // 4. 生成双 Token
  const pair = generateTokenPair({
    userId: user.id,
    username: user.username,
    roleId: user.roleId,
    tenantId: (user as any).tenantId || 1,
  })

  // 5. 返回结果 (select 已排除 password)
  return { ...pair, user }
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
  })

  if (!user) {
    throw new BizException(ErrorCode.USER_NOT_FOUND)
  }

  if (user.deleted) {
    throw new BizException(ErrorCode.USER_NOT_FOUND)
  }

  return user
}

/**
 * 用 refresh token 换取新的 token pair
 * - 校验 refresh token 签名 + 过期 + 类型
 * - 校验用户仍存在/未禁用/未软删
 * - 返回双 token + 最新用户信息 (role/permissions 可能变化) + 路由 + 权限码
 */
export async function refreshToken(refresh: string): Promise<RefreshResult> {
  // refresh token 拉黑校验 (用户登出/改密码/管理员踢人会把 refresh 加入黑名单)
  if (isTokenBlacklisted(refresh)) {
    throw BizException.unauthorized('Refresh Token 已被作废，请重新登录')
  }

  let payload: ReturnType<typeof verifyRefreshToken>
  try {
    payload = verifyRefreshToken(refresh)
  } catch {
    throw BizException.unauthorized('Refresh Token 无效或已过期，请重新登录')
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { role: true },
  })

  if (!user || user.deleted || user.status === 0) {
    throw BizException.unauthorized('账号状态异常，请重新登录')
  }

  // 租户一致性校验
  if (user.tenantId !== payload.tenantId) {
    throw BizException.unauthorized('Token 与账号租户不匹配，请重新登录')
  }

  // 收集角色并集 (P0: 多角色支持)
  const roleIds = await collectRoleIds(user.id, user.roleId)

  const pair = generateTokenPair({
    userId: user.id,
    username: user.username,
    roleId: user.roleId,
    tenantId: user.tenantId,
    roleIds,
  })

  // 构建路由树 + 权限码
  const { routers, perms } = await buildRoutersAndPerms(
    roleIds,
    user.tenantId,
    user.id,
    user.username,
    user.roleId,
    user.role.dsType,
  )

  // Token Rotation: 刷新后立即拉黑旧 refresh token, 防止被泄露后反复使用
  blacklistToken(refresh, decodeTokenExpireAt(refresh) ?? undefined)

  return {
    ...pair,
    routers,
    perms,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      nickname: user.nickname,
      avatar: user.avatar,
      status: user.status,
      roleId: user.roleId,
      roleIds,
      roleName: user.role.name,
      permissions: user.role.permissions,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  }
}

/**
 * 认证模块 Service 导出
 */
/**
 * 登出: 拉黑 access token + refresh token
 */
export function logout(accessToken: string | undefined, refreshToken?: string): void {
  if (accessToken) blacklistToken(accessToken, decodeTokenExpireAt(accessToken) ?? undefined)
  if (refreshToken) blacklistToken(refreshToken, decodeTokenExpireAt(refreshToken) ?? undefined)
}

export const authService = {
  login,
  register,
  getProfile,
  refreshToken,
  logout,
}
