/**
 * 系统配置模块 Service (P2-4)
 * - 系统参数键值对管理 (类似 RuoYi sys_config)
 * - 支持按 key 查询配置值
 */
import { prisma } from '../../config/prisma'
import { BizException } from '../../utils/biz-error'
import { ErrorCode } from '../../constants/error-code'
import { getTenantId } from '../../utils/request-context'
import type { CreateSystemConfigInput, UpdateSystemConfigInput } from './sys-config.dto'

export async function list(keyword?: string) {
  const where: any = { tenantId: getTenantId() }
  if (keyword) {
    where.OR = [{ configKey: { contains: keyword } }, { configName: { contains: keyword } }]
  }
  return prisma.systemConfig.findMany({
    where,
    orderBy: [{ sort: 'asc' }, { id: 'asc' }],
  })
}

export async function getByKey(configKey: string) {
  const c = await prisma.systemConfig.findFirst({ where: { configKey, tenantId: getTenantId() } })
  if (!c) throw new BizException(ErrorCode.SYS_CONFIG_NOT_FOUND, '系统配置不存在')
  return c
}

export async function getById(id: number) {
  const c = await prisma.systemConfig.findFirst({ where: { id, tenantId: getTenantId() } })
  if (!c) throw new BizException(ErrorCode.SYS_CONFIG_NOT_FOUND, '系统配置不存在')
  return c
}

export async function create(input: CreateSystemConfigInput) {
  const tenantId = getTenantId()
  const exists = await prisma.systemConfig.findFirst({
    where: { configKey: input.configKey, tenantId },
  })
  if (exists) throw new BizException(ErrorCode.SYS_CONFIG_KEY_EXISTS, '配置键名已存在')
  return prisma.systemConfig.create({
    data: { ...input, tenantId, createBy: 'system' },
  })
}

export async function update(id: number, input: UpdateSystemConfigInput) {
  await getById(id)
  // 如果改了 configKey, 需校验唯一性
  if (input.configKey) {
    const dup = await prisma.systemConfig.findFirst({
      where: { configKey: input.configKey, tenantId: getTenantId() },
    })
    if (dup && dup.id !== id) {
      throw new BizException(ErrorCode.SYS_CONFIG_KEY_EXISTS, '配置键名已存在')
    }
  }
  return prisma.systemConfig.update({
    where: { id },
    data: { ...input, updateBy: 'system' },
  })
}

export async function remove(id: number) {
  await getById(id)
  return prisma.systemConfig.delete({ where: { id } })
}

export async function batchDelete(ids: number[]) {
  return prisma.systemConfig.deleteMany({ where: { id: { in: ids } } })
}

export const sysConfigService = {
  list,
  getByKey,
  getById,
  create,
  update,
  remove,
  batchDelete,
}
