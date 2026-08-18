/**
 * 菜单模块 Service
 * - CRUD + 树形列表 + 根据角色构建用户可见菜单树 + 权限码列表
 */
import { prisma } from '../../config/prisma'
import { BizException } from '../../utils/biz-error'
import { ErrorCode } from '../../constants/error-code'
import logger from '../../utils/logger'
import { prismaTransaction } from '../../utils/base-service'
import { CreateMenuInput, UpdateMenuInput } from './menu.dto'
import { getTenantId, ensureTenantScope } from '../../utils/request-context'

export interface MenuTreeNode {
  id: number
  name: string
  parentId: number
  orderNum: number
  path?: string | null
  component?: string | null
  query?: string | null
  isFrame: boolean
  isCache: boolean
  menuType: 'M' | 'C' | 'F'
  visible: boolean
  status: number
  perms?: string | null
  icon: string
  children?: MenuTreeNode[]
}

function toVO(m: any): any {
  return m
}

/** 列表所有菜单 (不分页, 管理端使用) */
export async function list(q: { keyword?: string; status?: number }) {
  const where: any = { deleted: false, tenantId: getTenantId() }
  if (q.keyword) {
    where.OR = [{ name: { contains: q.keyword } }, { perms: { contains: q.keyword } }]
  }
  if (q.status !== undefined && q.status !== null && String(q.status) !== '') {
    where.status = Number(q.status)
  }
  const list = await prisma.menu.findMany({
    where,
    orderBy: [{ orderNum: 'asc' }, { id: 'asc' }],
  })
  return list.map(toVO)
}

/** 获取当前角色可见的菜单树 (M/C 两级用于侧边栏 + 路由) */
export async function getMenuTreeByRoleIds(roleIds: number[]): Promise<MenuTreeNode[]> {
  if (!roleIds || roleIds.length === 0) return []
  const tenantId = getTenantId()

  const rows = await prisma.menu.findMany({
    where: {
      deleted: false,
      tenantId,
      status: 1,
      menuType: { in: ['M', 'C'] }, // 目录+菜单, 按钮不进路由树
      OR: [
        // 超级管理员角色(内置ID=1) 直接见所有
        roleIds.includes(1) ? {} : undefined,
        { roleMenus: { some: { roleId: { in: roleIds } } } },
      ].filter(Boolean) as any[],
    },
    orderBy: [{ orderNum: 'asc' }, { id: 'asc' }],
  })

  return buildTree(rows as any[])
}

/** 获取角色的权限码 (F + C.perms 全部扁平化字符串数组) */
export async function getPermsByRoleIds(roleIds: number[]): Promise<string[]> {
  if (!roleIds || roleIds.length === 0) return []
  const tenantId = getTenantId()

  const rows = await prisma.menu.findMany({
    where: {
      deleted: false,
      tenantId,
      status: 1,
      perms: { not: null },
      OR: [
        roleIds.includes(1) ? {} : undefined,
        { roleMenus: { some: { roleId: { in: roleIds } } } },
      ].filter(Boolean) as any[],
    },
    select: { perms: true },
  })

  const set = new Set<string>()
  for (const r of rows) {
    if (r.perms) {
      // 支持逗号分隔多权限 (system:user:list,system:user:add)
      for (const p of String(r.perms).split(',')) {
        const t = p.trim()
        if (t) set.add(t)
      }
    }
  }
  return [...set]
}

/** 获取角色已分配的菜单ID列表 (用于分配回显+勾选) */
export async function getMenuIdsByRoleId(roleId: number): Promise<number[]> {
  const rows = await prisma.roleMenu.findMany({
    where: { roleId },
    select: { menuId: true },
  })
  return rows.map((r) => r.menuId)
}

/** 分配角色菜单 (先全删后插) */
export async function assignRoleMenus(roleId: number, menuIds: number[]): Promise<void> {
  ensureBuiltinRoleEditable(roleId)
  await prismaTransaction(async (tx) => {
    await tx.roleMenu.deleteMany({ where: { roleId } })
    if (menuIds && menuIds.length > 0) {
      const data = [...new Set(menuIds)].map((id) => ({ roleId, menuId: id }))
      await tx.roleMenu.createMany({ data, skipDuplicates: true })
    }
  })
  logger.info({ roleId, count: menuIds?.length || 0 }, '分配角色菜单')
}

function ensureBuiltinRoleEditable(roleId: number) {
  // 仅内置 ADMIN 角色禁止修改 (ID=1), 其他内置角色允许
  if (roleId === 1) {
    throw new BizException(ErrorCode.ROLE_CANNOT_MODIFY_BUILTIN)
  }
}

export async function getById(id: number) {
  const m = await prisma.menu.findUnique({ where: { id } })
  if (!m || m.deleted) throw BizException.notFound(ErrorCode.MENU_NOT_FOUND)
  ensureTenantScope(m)
  return toVO(m)
}

export async function create(input: CreateMenuInput) {
  const tenantId = getTenantId()
  if (input.parentId > 0) {
    const p = await prisma.menu.findUnique({ where: { id: input.parentId } })
    if (!p || p.deleted) throw new BizException(ErrorCode.MENU_PARENT_INVALID)
  }
  const r = await prisma.menu.create({
    data: { ...input, tenantId, createBy: 'system' } as any,
  })
  logger.info({ id: r.id, name: input.name }, '创建菜单')
  return toVO(r)
}

export async function update(id: number, input: UpdateMenuInput) {
  await getById(id)
  if (input.parentId !== undefined && input.parentId > 0) {
    if (input.parentId === id) throw new BizException(ErrorCode.MENU_PARENT_INVALID)
    const p = await prisma.menu.findUnique({ where: { id: input.parentId } })
    if (!p || p.deleted) throw new BizException(ErrorCode.MENU_PARENT_INVALID)
  }
  const r = await prisma.menu.update({
    where: { id },
    data: { ...input, updateBy: 'system' } as any,
  })
  logger.info({ id }, '更新菜单')
  return toVO(r)
}

export async function remove(id: number) {
  await prismaTransaction(async (tx) => {
    const m = await tx.menu.findUnique({ where: { id } })
    if (!m || m.deleted) throw BizException.notFound(ErrorCode.MENU_NOT_FOUND)
    ensureTenantScope(m)
    const children = await tx.menu.count({
      where: { parentId: id, deleted: false, tenantId: m.tenantId },
    })
    if (children > 0) throw new BizException(ErrorCode.MENU_HAS_CHILDREN)
    // 同时清除 role_menus 关联
    await tx.roleMenu.deleteMany({ where: { menuId: id } })
    await tx.menu.update({ where: { id }, data: { deleted: true } })
  })
  logger.info({ id }, '删除菜单')
}

/** 构建菜单树 (扁平→嵌套 children) */
export function buildTree(list: MenuTreeNode[]): MenuTreeNode[] {
  const map = new Map<number, MenuTreeNode>()
  const roots: MenuTreeNode[] = []
  for (const item of list) {
    map.set(item.id, { ...item, children: [] })
  }
  for (const item of list) {
    const node = map.get(item.id)!
    if (item.parentId === 0 || !map.has(item.parentId)) {
      roots.push(node)
    } else {
      const parent = map.get(item.parentId)!
      parent.children!.push(node)
    }
  }
  return roots
}

/** 管理端下拉选择: 菜单树 (排除自身及子孙, 避免循环) */
export async function getMenuTreeForSelect(excludeId?: number) {
  const tenantId = getTenantId()
  let rows = await prisma.menu.findMany({
    where: { deleted: false, tenantId, status: 1 },
    orderBy: [{ orderNum: 'asc' }, { id: 'asc' }],
    select: { id: true, parentId: true, name: true, menuType: true },
  })
  if (excludeId) {
    const excludeSet = new Set<number>()
    const collect = (pid: number) => {
      excludeSet.add(pid)
      rows.filter((r) => r.parentId === pid).forEach((r) => collect(r.id))
    }
    collect(excludeId)
    rows = rows.filter((r) => !excludeSet.has(r.id))
  }
  return buildTree(rows as any[])
}

export const menuService = {
  list,
  getById,
  create,
  update,
  remove,
  getMenuTreeByRoleIds,
  getPermsByRoleIds,
  getMenuIdsByRoleId,
  assignRoleMenus,
  getMenuTreeForSelect,
  buildTree,
}
