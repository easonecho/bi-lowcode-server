/**
 * 角色模块 Service
 */
import { prisma } from '../../config/prisma'
import { BizException } from '../../utils/biz-error'
import { ErrorCode } from '../../constants/error-code'
import { parsePagination, paginate } from '../../utils/paginate'
import logger from '../../utils/logger'
import { prismaTransaction } from '../../utils/base-service'
import { CreateRoleInput, UpdateRoleInput } from './role.dto'
import { getTenantId, ensureTenantScope } from '../../utils/request-context'
import { getMenuIdsByRoleId, assignRoleMenus } from '../menu/menu.service'

// 内置角色 ID (1=超级管理员, 2=普通用户, 3=访客) - 不可修改/删除
const BUILTIN_ROLE_IDS = new Set([1, 2, 3])

function toVO(r: any) {
  return r
}

export async function list(q: {
  page?: number
  pageSize?: number
  keyword?: string
  dsType?: string
}) {
  const { page, pageSize, skip, take } = parsePagination(q)
  const where: any = {}
  if (q.keyword) {
    where.OR = [
      { name: { contains: q.keyword } },
      { code: { contains: q.keyword } },
      { description: { contains: q.keyword } },
    ]
  }
  if (q.dsType) where.dsType = q.dsType
  where.deleted = false
  where.tenantId = getTenantId()

  const result = await paginate(prisma.role as any, {
    where,
    include: {
      _count: { select: { users: true, userRoles: true } },
    },
    orderBy: { id: 'asc' },
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

/** 列表全部角色 (不分页, 用于用户管理下拉选择) */
export async function listAll() {
  const tenantId = getTenantId()
  const list = await prisma.role.findMany({
    where: { deleted: false, tenantId },
    orderBy: { id: 'asc' },
    select: { id: true, name: true, code: true, description: true, dsType: true },
  })
  return list
}

export async function getById(id: number) {
  const r = await prisma.role.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true, userRoles: true } },
    },
  })
  if (!r) throw BizException.notFound(ErrorCode.ROLE_NOT_FOUND)
  if (r.deleted) throw BizException.notFound(ErrorCode.ROLE_NOT_FOUND)
  ensureTenantScope(r)
  return toVO(r)
}

export async function create(input: CreateRoleInput) {
  const tenantId = getTenantId()

  const existingName = await prisma.role.findFirst({
    where: { name: input.name, deleted: false, tenantId },
  })
  if (existingName) throw new BizException(ErrorCode.ROLE_NAME_EXISTS)

  const existingCode = await prisma.role.findFirst({
    where: { code: input.code, deleted: false, tenantId },
  })
  if (existingCode) throw new BizException(ErrorCode.ROLE_CODE_EXISTS)

  const record = await prisma.role.create({
    data: {
      name: input.name,
      code: input.code,
      description: input.description,
      permissions: (input.permissions as any) ?? [],
      dsType: input.dsType,
      tenantId,
      createBy: 'system',
    },
  })
  logger.info({ id: record.id, code: input.code }, '创建角色')
  return toVO(record)
}

export async function update(id: number, input: UpdateRoleInput) {
  if (BUILTIN_ROLE_IDS.has(id)) {
    throw new BizException(ErrorCode.ROLE_CANNOT_MODIFY_BUILTIN)
  }
  const existing = await getById(id)
  const tenantId = getTenantId()

  if (input.name && input.name !== existing.name) {
    const dup = await prisma.role.findFirst({
      where: { name: input.name, deleted: false, tenantId, id: { not: id } },
    })
    if (dup) throw new BizException(ErrorCode.ROLE_NAME_EXISTS)
  }

  const updated = await prisma.role.update({
    where: { id },
    data: { ...input, updateBy: 'system' } as any,
  })
  logger.info({ id }, '更新角色')
  return toVO(updated)
}

export async function remove(id: number) {
  if (BUILTIN_ROLE_IDS.has(id)) {
    throw new BizException(ErrorCode.ROLE_CANNOT_MODIFY_BUILTIN)
  }
  await prismaTransaction(async (tx) => {
    const r = await tx.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true, userRoles: true } } },
    })
    if (!r) throw BizException.notFound(ErrorCode.ROLE_NOT_FOUND)
    ensureTenantScope(r)
    if ((r._count.users ?? 0) > 0 || (r._count.userRoles ?? 0) > 0) {
      throw new BizException(ErrorCode.ROLE_HAS_USERS)
    }
    await tx.role.update({ where: { id }, data: { deleted: true } })
  })
  logger.info({ id }, '删除角色')
}

/** 查询角色已分配的菜单ID列表 (回显用) */
export async function getMenuIds(roleId: number): Promise<number[]> {
  await getById(roleId)
  return getMenuIdsByRoleId(roleId)
}

/** 分配角色菜单权限 */
export async function assignMenus(roleId: number, menuIds: number[]): Promise<void> {
  await getById(roleId)
  return assignRoleMenus(roleId, menuIds)
}

export const roleService = {
  list,
  listAll,
  getById,
  create,
  update,
  remove,
  getMenuIds,
  assignMenus,
}
