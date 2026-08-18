/**
 * ============================================================================
 * BI 低代码平台 - 请求级上下文 (基于 AsyncLocalStorage)
 * ============================================================================
 * 在一次 HTTP 请求内隐式传递 tenantId / userId / roleId, 使 Service 层无需把
 * 这些安全上下文参数一路透传 (避免漏传某一个查询点导致跨租户数据泄露)。
 *
 * 工作原理:
 *   tenantContext 中间件在请求入口调用 runWithContext(...), 之后整个
 *   async 调用链 (中间件 -> 路由 -> service -> 内部调用) 都能通过
 *   getRequestContext() 取到同一份上下文。
 *
 * 设计取舍:
 *   - getTenantId() 采用 fail-closed (无上下文时抛错), 确保安全过滤不会
 *     因中间件漏挂而静默失效。
 *   - 仅用于 HTTP 请求链路; 非 HTTP 场景 (seed/脚本) 不经过中间件, 应直接
 *     操作 Prisma 显式写入 tenantId, 不要调用本工具。
 * ============================================================================
 */

import { AsyncLocalStorage } from 'node:async_hooks'
import { BizException } from './biz-error'
import { ErrorCode } from '../constants/error-code'

/** 请求级安全上下文 */
export interface RequestContext {
  tenantId: number
  userId: number
  roleId: number
  /** 数据权限范围类型 (从 Role.dsType 加载, 一次性注入) */
  dsType: string
  /** 数据范围可见 creatorId 列表缓存 (subordinate 递归查询结果, 同请求内复用) */
  dataScopeIds?: number[] | null
  /** 用户名 (来自 JWT, 用于操作日志等) */
  username?: string
  /** 角色并集 (多角色支持, 来自 JWT) */
  roleIds?: number[]
  /** 当前用户权限码列表 (登录/刷新时注入, 用于按钮鉴权) */
  perms?: string[]
}

const als = new AsyncLocalStorage<RequestContext>()

/**
 * 在指定上下文作用域内执行回调 (供 tenantContext 中间件调用)
 */
export function runWithContext<T>(ctx: RequestContext, fn: () => Promise<T>): Promise<T> {
  return als.run(ctx, fn)
}

/**
 * 获取当前请求上下文 (无上下文时返回 undefined)
 */
export function getRequestContext(): RequestContext | undefined {
  return als.getStore()
}

/**
 * 获取当前租户 ID (fail-closed: 无上下文直接抛错, 防止安全过滤静默失效)
 */
export function getTenantId(): number {
  const ctx = als.getStore()
  if (!ctx) {
    throw new BizException(ErrorCode.INTERNAL_ERROR, '租户上下文未初始化', 500)
  }
  return ctx.tenantId
}

/**
 * 获取当前角色并集 (无 roleIds 时回退到单 roleId)
 */
export function getRoleIds(): number[] {
  const ctx = als.getStore()
  if (!ctx) return []
  if (ctx.roleIds && ctx.roleIds.length) return ctx.roleIds
  return [ctx.roleId]
}

/**
 * 校验记录归属当前租户, 不归属则抛 404 (统一返回"资源不存在"以避免泄露跨租户资源是否存在)
 * 注意: 调用方需先做 null/逻辑删除校验; 本函数只负责租户隔离判断。
 */
export function ensureTenantScope(record: { tenantId: number } | null | undefined): void {
  if (!record) return
  if (record.tenantId !== getTenantId()) {
    throw BizException.notFound(ErrorCode.NOT_FOUND)
  }
}
