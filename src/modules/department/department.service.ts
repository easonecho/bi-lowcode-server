/**
 * 部门模块 Service
 * - 部门树: parentId + children 关系
 * - 删除保护: 有子部门或有用户时不可删
 * - 移动保护: 不能把自己设为自己的后代
 */
import { prisma } from '../../config/prisma'
import { BizException } from '../../utils/biz-error'
import { ErrorCode } from '../../constants/error-code'
import { parsePagination, paginate } from '../../utils/paginate'
import logger from '../../utils/logger'
import { prismaTransaction } from '../../utils/base-service'
import { CreateDepartmentInput, UpdateDepartmentInput } from './department.dto'
import { getTenantId, ensureTenantScope } from '../../utils/request-context'

function toVO(d: any) {
  return d
}

/** 分页列表 (扁平) */
export async function list(q: {
  page?: number
  pageSize?: number
  keyword?: string
  parentId?: number
  status?: number
}) {
  const { page, pageSize, skip, take } = parsePagination(q)
  const where: any = {}
  if (q.keyword) {
    where.OR = [{ name: { contains: q.keyword } }, { code: { contains: q.keyword } }]
  }
  if (q.parentId !== undefined && q.parentId !== 0) where.parentId = q.parentId
  if (q.status !== undefined) where.status = q.status
  where.deleted = false
  where.tenantId = getTenantId()

  const result = await paginate(prisma.department as any, {
    where,
    include: {
      parent: { select: { id: true, name: true } },
      leader: { select: { id: true, username: true, nickname: true } },
      _count: { select: { children: true, users: true } },
    },
    orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    page,
    pageSize,
    skip,
    take,
  })
  return {
    list: result.list.map(toVO),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
  }
}

/** 获取部门树 (不分页, 前端部门选择器用) */
export async function listTree() {
  const tenantId = getTenantId()
  const all = await prisma.department.findMany({
    where: { deleted: false, tenantId, status: 1 },
    orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      name: true,
      code: true,
      parentId: true,
      sort: true,
      status: true,
    },
  })
  return buildTree(all)
}

/** 列表全部 (不分页扁平, 供调试/导出) */
export async function listAll() {
  const tenantId = getTenantId()
  const list = await prisma.department.findMany({
    where: { deleted: false, tenantId },
    orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { children: true, users: true } },
    },
  })
  return list
}

export async function getById(id: number) {
  const d = await prisma.department.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, name: true } },
      leader: { select: { id: true, username: true, nickname: true } },
      _count: { select: { children: true, users: true } },
    },
  })
  if (!d) throw BizException.notFound(ErrorCode.DEPT_NOT_FOUND)
  if (d.deleted) throw BizException.notFound(ErrorCode.DEPT_NOT_FOUND)
  ensureTenantScope(d)
  return toVO(d)
}

export async function create(input: CreateDepartmentInput) {
  const tenantId = getTenantId()

  // 同租户 + 同 parent 下名称唯一
  if (input.name) {
    const dup = await prisma.department.findFirst({
      where: {
        name: input.name,
        deleted: false,
        tenantId,
        parentId: input.parentId ?? null,
      },
    })
    if (dup) throw new BizException(ErrorCode.DEPT_NAME_EXISTS)
  }

  // 父部门必须存在 (且同租户 + 未删除)
  if (input.parentId) {
    const p = await prisma.department.findFirst({
      where: { id: input.parentId, deleted: false, tenantId },
    })
    if (!p) throw new BizException(ErrorCode.DEPT_PARENT_INVALID)
  }

  const record = await prisma.department.create({
    data: {
      name: input.name,
      code: input.code,
      parentId: input.parentId ?? null,
      sort: input.sort,
      leaderId: input.leaderId ?? null,
      status: input.status,
      tenantId,
      createBy: 'system',
    },
  })
  logger.info({ id: record.id, name: input.name }, '创建部门')
  return toVO(record)
}

export async function update(id: number, input: UpdateDepartmentInput) {
  const existing = await getById(id)
  const tenantId = getTenantId()

  // 名称重复校验 (同父级)
  const targetParentId = input.parentId === undefined ? existing.parentId : (input.parentId ?? null)
  if (input.name && (input.name !== existing.name || targetParentId !== existing.parentId)) {
    const dup = await prisma.department.findFirst({
      where: {
        name: input.name,
        deleted: false,
        tenantId,
        parentId: targetParentId,
        id: { not: id },
      },
    })
    if (dup) throw new BizException(ErrorCode.DEPT_NAME_EXISTS)
  }

  // 父部门有效性校验
  if (input.parentId !== undefined && input.parentId !== null) {
    // 不能把自己设为父级
    if (input.parentId === id) throw new BizException(ErrorCode.DEPT_PARENT_INVALID)
    // 父级不能是自己的后代 (防止循环)
    const descendants = await collectDescendantIds(id)
    if (descendants.has(input.parentId)) throw new BizException(ErrorCode.DEPT_PARENT_INVALID)

    const p = await prisma.department.findFirst({
      where: { id: input.parentId, deleted: false, tenantId },
    })
    if (!p) throw new BizException(ErrorCode.DEPT_PARENT_INVALID)
  }

  const updated = await prisma.department.update({
    where: { id },
    data: {
      ...input,
      parentId: input.parentId === undefined ? undefined : (input.parentId ?? null),
      updateBy: 'system',
    } as any,
  })
  logger.info({ id }, '更新部门')
  return toVO(updated)
}

export async function remove(id: number) {
  await prismaTransaction(async (tx) => {
    const d = await tx.department.findUnique({
      where: { id },
      include: { _count: { select: { children: true, users: true } } },
    })
    if (!d) throw BizException.notFound(ErrorCode.DEPT_NOT_FOUND)
    ensureTenantScope(d)
    if ((d._count.children ?? 0) > 0) throw new BizException(ErrorCode.DEPT_HAS_CHILDREN)
    if ((d._count.users ?? 0) > 0) throw new BizException(ErrorCode.DEPT_HAS_USERS)
    await tx.department.update({ where: { id }, data: { deleted: true } })
  })
  logger.info({ id }, '删除部门')
}

// ============================================================================
// 工具函数
// ============================================================================

function buildTree(nodes: Array<{ id: number; parentId: number | null }>) {
  const map = new Map<number, any>()
  const roots: any[] = []
  for (const n of nodes) {
    map.set(n.id, { ...n, children: [] })
  }
  for (const n of nodes) {
    const node = map.get(n.id)!
    if (n.parentId && map.has(n.parentId)) {
      map.get(n.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

/** 递归收集所有后代节点 ID (含孙子...) */
async function collectDescendantIds(id: number): Promise<Set<number>> {
  const result = new Set<number>()
  let parents = [id]
  while (parents.length) {
    const children = await prisma.department.findMany({
      where: { parentId: { in: parents }, deleted: false },
      select: { id: true },
    })
    if (!children.length) break
    const ids = children.map((c) => c.id)
    ids.forEach((i) => result.add(i))
    parents = ids
  }
  return result
}

export const departmentService = {
  list,
  listTree,
  listAll,
  getById,
  create,
  update,
  remove,
}
