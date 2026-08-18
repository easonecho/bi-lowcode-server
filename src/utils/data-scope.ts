/**
 * ============================================================================
 * BI 低代码平台 - 行级数据权限过滤工具
 * ============================================================================
 * 基于 Role.dsType 实现行级数据隔离, 复用请求级上下文 (AsyncLocalStorage):
 *   - all         本租户全部数据 (不加 creatorId 过滤)
 *   - oneself     仅本人创建的数据
 *   - subordinate 本人 + 本人负责部门(含递归子部门)下用户创建的数据
 *   - custom      暂按 all 处理 (P1 预留, 后续可扩展为按部门/角色配置)
 *
 * Service 层用法:
 *   list:    where = { ...where, ...buildDataScopeWhere() }
 *   单条:    ensureDataScope(record)  // 取代仅 ensureTenantScope
 *
 * 设计取舍:
 *   - 下级用户 ID 列表 (subordinate) 在每次请求内懒加载并缓存到上下文, 避免重复
 *     递归查询部门树。单次请求内 dsType 与 userId 不变, 缓存安全。
 * ============================================================================
 */

import { prisma } from '../config/prisma'
import { BizException } from './biz-error'
import { ErrorCode } from '../constants/error-code'
import { getRequestContext } from './request-context'

/** 数据范围类型常量 */
export const DsType = {
  ALL: 'all',
  ONESELF: 'oneself',
  SUBORDINATE: 'subordinate',
  CUSTOM: 'custom',
} as const

/**
 * 计算当前用户可见的 creatorId 列表
 * - all/custom: 返回 null (表示不加 creatorId 过滤)
 * - oneself:    [userId]
 * - subordinate: [userId, ...下级部门成员ID]
 *
 * 结果缓存到 RequestContext.dataScopeIds, 同一请求内只算一次。
 */
export async function getDataScopeCreatorIds(): Promise<number[] | null> {
  const ctx = getRequestContext()
  if (!ctx) {
    throw new BizException(ErrorCode.INTERNAL_ERROR, '请求上下文未初始化', 500)
  }

  // 缓存命中
  if (ctx.dataScopeIds !== undefined) {
    return ctx.dataScopeIds
  }

  let ids: number[] | null

  switch (ctx.dsType) {
    case DsType.ALL:
    case DsType.CUSTOM:
      ids = null // 不过滤
      break
    case DsType.ONESELF:
      ids = [ctx.userId]
      break
    case DsType.SUBORDINATE:
      ids = await collectSubordinateUserIds(ctx.userId, ctx.tenantId)
      break
    default:
      // 未知类型, fail-closed: 限制为仅本人, 宁可少看不能多看
      ids = [ctx.userId]
  }

  ctx.dataScopeIds = ids
  return ids
}

/**
 * 构建行级过滤条件 (Prisma where 片段)
 * - 返回 {} 表示不过滤 (all/custom)
 * - 返回 { creatorId: { in: [...] } } 表示限定创建者
 */
export async function buildDataScopeWhere(): Promise<Record<string, unknown>> {
  const ids = await getDataScopeCreatorIds()
  if (ids === null) return {}
  return { creatorId: { in: ids } }
}

/**
 * 校验单条记录的可见性 (用于 getById/update/delete)
 * 调用方应先做 null / 逻辑删除 / 租户隔离校验, 再调用本函数。
 * - all/custom: 放行
 * - oneself/subordinate: creatorId 必须在可见列表内, 否则抛 404
 *
 * @param record 必须包含 creatorId 字段
 */
export async function ensureDataScope(
  record: { creatorId: number } | null | undefined,
): Promise<void> {
  if (!record) return
  const ids = await getDataScopeCreatorIds()
  if (ids === null) return // all/custom 放行
  if (!ids.includes(record.creatorId)) {
    // 统一 404, 不暴露资源存在性
    throw BizException.notFound(ErrorCode.NOT_FOUND)
  }
}

/**
 * 收集 subordinate 范围的用户 ID: 本人 + 本人负责部门(递归子部门)下的成员
 * 部门负责人通过 Department.leaderId = userId 判定
 */
async function collectSubordinateUserIds(userId: number, tenantId: number): Promise<number[]> {
  // 1. 找出本人负责的所有顶级部门
  const ledDepts = await prisma.department.findMany({
    where: { leaderId: userId, deleted: false, tenantId },
    select: { id: true },
  })

  // 2. 递归收集子部门 ID (BFS)
  const allDeptIds = new Set<number>(ledDepts.map((d) => d.id))
  let frontier = [...allDeptIds]
  while (frontier.length > 0) {
    const children = await prisma.department.findMany({
      where: { parentId: { in: frontier }, deleted: false, tenantId },
      select: { id: true },
    })
    const newIds = children.map((c) => c.id).filter((id) => !allDeptIds.has(id))
    newIds.forEach((id) => allDeptIds.add(id))
    frontier = newIds
  }

  // 3. 收集这些部门下的用户 ID
  const deptUserIds =
    allDeptIds.size > 0
      ? await prisma.user
          .findMany({
            where: { deptId: { in: [...allDeptIds] }, deleted: false, tenantId },
            select: { id: true },
          })
          .then((rs) => rs.map((u) => u.id))
      : []

  // 4. 合并本人 (确保即使无部门也能看到自己的数据)
  const idSet = new Set<number>([userId, ...deptUserIds])
  return [...idSet]
}
