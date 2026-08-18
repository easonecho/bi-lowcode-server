/**
 * 用户模块 Service
 * P0/P1 修复: 不能删除自己 + 密码 hash + 用户唯一性检查 + 管理员接口需 RBAC
 */
import bcrypt from 'bcryptjs'
import { prisma } from '../../config/prisma'
import { BizException } from '../../utils/biz-error'
import { ErrorCode } from '../../constants/error-code'
import { parsePagination, paginate } from '../../utils/paginate'
import logger from '../../utils/logger'
import { prismaTransaction } from '../../utils/base-service'
import { CreateUserInput, UpdateUserInput } from './user.dto'

// 响应不含 password
function toVO(u: any) {
  if (!u) return u
  const { password: _password, ...rest } = u
  return rest
}

export async function list(q: {
  page?: number
  pageSize?: number
  keyword?: string
  roleId?: number
  status?: number
}) {
  const { page, pageSize, skip, take } = parsePagination(q)
  const where: any = {}
  if (q.keyword) {
    where.OR = [
      { username: { contains: q.keyword } },
      { nickname: { contains: q.keyword } },
      { email: { contains: q.keyword } },
    ]
  }
  if (q.roleId !== undefined) where.roleId = q.roleId
  if (q.status !== undefined) where.status = q.status
  where.deleted = false

  const result = await paginate(prisma.user as any, {
    where,
    include: { role: { select: { id: true, name: true, code: true } } },
    orderBy: { createdAt: 'desc' },
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

export async function getById(id: number) {
  const u = await prisma.user.findUnique({
    where: { id },
    include: { role: true },
  })
  if (!u) throw BizException.notFound(ErrorCode.USER_NOT_FOUND)
  if (u.deleted) throw BizException.notFound(ErrorCode.USER_NOT_FOUND)
  return toVO(u)
}

/** 创建用户 (管理员接口) */
export async function create(input: CreateUserInput, creatorId: number) {
  const existing = await prisma.user.findUnique({ where: { username: input.username } })
  if (existing) throw new BizException(ErrorCode.USER_ALREADY_EXISTS)

  const hashedPassword = await bcrypt.hash(input.password, 10)

  const user = await prisma.user.create({
    data: {
      username: input.username,
      password: hashedPassword,
      email: input.email,
      phone: input.phone,
      nickname: input.nickname,
      avatar: input.avatar,
      roleId: input.roleId,
      status: input.status,
      createBy: 'system',
    },
  })
  if (input.roleId) {
    await prisma.userRole
      .create({ data: { userId: user.id, roleId: input.roleId } })
      .catch((e: any) => {
        if (e?.code !== 'P2002') throw e
      })
  }
  logger.info({ id: user.id, by: creatorId }, '创建用户')
  return toVO(user)
}

export async function update(id: number, input: UpdateUserInput) {
  await getById(id)
  const updated = await prisma.user.update({
    where: { id },
    data: { ...input, updateBy: 'system' } as any,
  })
  logger.info({ id }, '更新用户')
  return toVO(updated)
}

/**
 * 删除用户: 不能删除自己, 事务安全
 */
export async function remove(id: number, operatorUserId: number) {
  if (operatorUserId === id) {
    throw new BizException(ErrorCode.USER_CANNOT_DELETE_SELF)
  }
  await prismaTransaction(async (tx) => {
    const u = await tx.user.findUnique({ where: { id } })
    if (!u) throw BizException.notFound(ErrorCode.USER_NOT_FOUND)
    await tx.user.update({ where: { id }, data: { deleted: true } })
  })
  logger.info({ id, operatorUserId }, '删除用户')
}

export async function changeRole(id: number, roleId: number) {
  await getById(id)
  const u = await prisma.user.update({ where: { id }, data: { roleId, updateBy: 'system' } })
  await prisma.userRole
    .upsert({
      where: { userId_roleId: { userId: id, roleId } },
      update: {},
      create: { userId: id, roleId },
    })
    .catch((e: any) => {
      if (e?.code !== 'P2002') throw e
    })
  logger.info({ id, roleId }, '变更用户角色')
  return toVO(u)
}

export const userService = {
  list,
  getById,
  create,
  update,
  remove,
  changeRole,
}
