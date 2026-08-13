/**
 * ============================================================================
 * BI 低代码平台 - RBAC 权限控制中间件
 * ============================================================================
 * 参考 jvs-gateway 的 AuthorizationManager
 * 基于 ctx.state.user.roleId 做角色/权限校验
 *
 * 用法:
 *   router.get('/users', requireRole(1), userController.list)  // 仅管理员
 *   router.delete('/users/:id', requirePermission('user:delete'), ...)
 * ============================================================================
 */

import { Context, Next } from 'koa';
import { BizException } from '../utils/biz-error';
import { ErrorCode } from '../constants/error-code';
import { prisma } from '../config/prisma';

/** 角色ID: 1=管理员, 2=普通用户 */
export const RoleId = {
  ADMIN: 1,
  USER: 2,
} as const;

/**
 * 角色校验中间件: 仅允许指定角色访问
 * @param roles 允许的角色ID列表
 */
export function requireRole(...roles: number[]) {
  return async (ctx: Context, next: Next): Promise<void> => {
    const user = ctx.state?.user;
    if (!user) {
      throw BizException.unauthorized();
    }

    if (!roles.includes(user.roleId)) {
      throw BizException.forbidden('权限不足, 无法执行此操作');
    }

    await next();
  };
}

/**
 * 仅管理员可访问
 */
export const requireAdmin = requireRole(RoleId.ADMIN);

/**
 * 权限校验中间件: 基于 Role.permissions 字段
 * 权限格式: 'module:action', 如 'user:delete', 'datasource:create'
 * 通配符: '*' 表示所有权限
 */
export function requirePermission(permission: string) {
  return async (ctx: Context, next: Next): Promise<void> => {
    const user = ctx.state?.user;
    if (!user) {
      throw BizException.unauthorized();
    }

    // 管理员直接放行
    if (user.roleId === RoleId.ADMIN) {
      await next();
      return;
    }

    // 查询角色权限
    const role = await prisma.role.findUnique({
      where: { id: user.roleId },
      select: { permissions: true },
    });

    const permissions = normalizePermissions(role?.permissions);
    if (!permissions.includes('*') && !permissions.includes(permission)) {
      throw BizException.forbidden(`缺少权限: ${permission}`);
    }

    await next();
  };
}

/**
 * 资源归属校验: 确保用户只能操作自己创建的资源
 * @param getResourceOwnerId 通过资源ID获取创建者ID的函数
 */
export function requireOwner(getResourceOwnerId: (ctx: Context) => Promise<number>) {
  return async (ctx: Context, next: Next): Promise<void> => {
    const user = ctx.state?.user;
    if (!user) {
      throw BizException.unauthorized();
    }

    // 管理员可操作所有资源
    if (user.roleId === RoleId.ADMIN) {
      await next();
      return;
    }

    const ownerId = await getResourceOwnerId(ctx);
    if (ownerId !== user.userId) {
      throw BizException.forbidden('无权操作他人的资源');
    }

    await next();
  };
}

/**
 * 规范化权限字段 (兼容数组或 JSON 字符串)
 */
function normalizePermissions(perms: any): string[] {
  if (!perms) return [];
  if (Array.isArray(perms)) return perms;
  if (typeof perms === 'string') {
    try {
      const parsed = JSON.parse(perms);
      return Array.isArray(parsed) ? parsed : [perms];
    } catch {
      return [perms];
    }
  }
  return [];
}
