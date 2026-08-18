/**
 * 岗位管理模块 Service (P2-4)
 * - 岗位编码唯一性约束
 * - 支持停用/启用
 */
import { prisma } from '../../config/prisma'
import { BizException } from '../../utils/biz-error'
import { ErrorCode } from '../../constants/error-code'
import { getTenantId } from '../../utils/request-context'
import type { CreatePositionInput, UpdatePositionInput } from './position.dto'

export async function list(keyword?: string, status?: number) {
  const where: any = { tenantId: getTenantId() }
  if (keyword) {
    where.OR = [{ name: { contains: keyword } }, { code: { contains: keyword } }]
  }
  if (status !== undefined && !Number.isNaN(status)) {
    where.status = status
  }
  return prisma.position.findMany({
    where,
    orderBy: [{ sort: 'asc' }, { id: 'asc' }],
  })
}

export async function getById(id: number) {
  const p = await prisma.position.findUnique({ where: { id } })
  if (!p) throw new BizException(ErrorCode.POSITION_NOT_FOUND, '岗位不存在')
  return p
}

export async function create(input: CreatePositionInput) {
  const tenantId = getTenantId()
  const exists = await prisma.position.findUnique({
    where: { code: input.code },
  })
  if (exists) throw new BizException(ErrorCode.POSITION_CODE_EXISTS, '岗位编码已存在')
  return prisma.position.create({
    data: { ...input, tenantId, createBy: 'system' },
  })
}

export async function update(id: number, input: UpdatePositionInput) {
  await getById(id)
  if (input.code) {
    const dup = await prisma.position.findUnique({
      where: { code: input.code },
    })
    if (dup && dup.id !== id) {
      throw new BizException(ErrorCode.POSITION_CODE_EXISTS, '岗位编码已存在')
    }
  }
  return prisma.position.update({
    where: { id },
    data: { ...input, updateBy: 'system' },
  })
}

export async function remove(id: number) {
  await getById(id)
  return prisma.position.delete({ where: { id } })
}

export async function toggleStatus(id: number) {
  const p = await getById(id)
  return prisma.position.update({
    where: { id },
    data: { status: p.status === 1 ? 0 : 1, updateBy: 'system' },
  })
}

export const positionService = {
  list,
  getById,
  create,
  update,
  remove,
  toggleStatus,
}
