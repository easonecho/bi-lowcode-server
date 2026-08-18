/**
 * 数据字典模块 Service
 */
import { prisma } from '../../config/prisma'
import { BizException } from '../../utils/biz-error'
import { ErrorCode } from '../../constants/error-code'
import type {
  CreateDictInput,
  UpdateDictInput,
  CreateDictItemInput,
  UpdateDictItemInput,
} from './dict.dto'

export async function list(keyword?: string) {
  const where: any = {}
  if (keyword) {
    where.OR = [{ type: { contains: keyword } }, { name: { contains: keyword } }]
  }
  return prisma.dict.findMany({
    where,
    include: { _count: { select: { items: true } } },
    orderBy: { id: 'asc' },
  })
}

export async function getByType(type: string) {
  const dict = await prisma.dict.findUnique({
    where: { type },
    include: {
      items: {
        where: { status: 1 },
        orderBy: { sort: 'asc' },
      },
    },
  })
  if (!dict) throw new BizException(ErrorCode.NOT_FOUND, `字典类型 ${type} 不存在`)
  return dict
}

export async function create(input: CreateDictInput) {
  const exists = await prisma.dict.findUnique({ where: { type: input.type } })
  if (exists) throw new BizException(ErrorCode.CONFLICT, `字典类型 ${input.type} 已存在`)
  return prisma.dict.create({ data: input })
}

export async function update(id: number, input: UpdateDictInput) {
  await prisma.dict.findUniqueOrThrow({ where: { id } })
  return prisma.dict.update({ where: { id }, data: input })
}

export async function remove(id: number) {
  await prisma.dictItem.deleteMany({ where: { dictId: id } })
  return prisma.dict.delete({ where: { id } })
}

// ---- DictItem ----

export async function listItems(dictId: number) {
  return prisma.dictItem.findMany({
    where: { dictId },
    orderBy: { sort: 'asc' },
  })
}

export async function createItem(input: CreateDictItemInput) {
  return prisma.dictItem.create({ data: input })
}

export async function updateItem(id: number, input: UpdateDictItemInput) {
  return prisma.dictItem.update({ where: { id }, data: input })
}

export async function removeItem(id: number) {
  return prisma.dictItem.delete({ where: { id } })
}

export default {
  list,
  getByType,
  create,
  update,
  remove,
  listItems,
  createItem,
  updateItem,
  removeItem,
}
