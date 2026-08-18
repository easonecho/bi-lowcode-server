/**
 * 定时任务模块 Service (P2-4)
 * - cron 表达式校验
 * - 支持手动触发执行 (占位实现, 实际调度需配合 node-cron / agenda)
 * - 记录最后执行时间和结果
 */
import { prisma } from '../../config/prisma'
import { BizException } from '../../utils/biz-error'
import { ErrorCode } from '../../constants/error-code'
import logger from '../../utils/logger'
import { getTenantId } from '../../utils/request-context'
import type { CreateScheduledTaskInput, UpdateScheduledTaskInput } from './scheduled-task.dto'

/** 简易 cron 校验: 5-7 段, 每段符合 * / 数字 / 区间 / 列表 / 步长 */
function isValidCron(cron: string): boolean {
  const parts = cron.trim().split(/\s+/)
  if (parts.length < 5 || parts.length > 7) return false
  const re = /^(\*|\d+|\d+-\d+|\d+(,\d+)*)(\/\d+)?$/
  return parts.every((p) => re.test(p))
}

export async function list(keyword?: string, status?: number) {
  const where: any = { tenantId: getTenantId() }
  if (keyword) {
    where.OR = [{ name: { contains: keyword } }, { handler: { contains: keyword } }]
  }
  if (status !== undefined && !Number.isNaN(status)) {
    where.status = status
  }
  return prisma.scheduledTask.findMany({
    where,
    orderBy: [{ id: 'desc' }],
  })
}

export async function getById(id: number) {
  const t = await prisma.scheduledTask.findUnique({ where: { id } })
  if (!t) throw new BizException(ErrorCode.TASK_NOT_FOUND, '定时任务不存在')
  return t
}

export async function create(input: CreateScheduledTaskInput) {
  if (!isValidCron(input.cron)) {
    throw new BizException(ErrorCode.TASK_CRON_INVALID, 'cron 表达式无效')
  }
  const tenantId = getTenantId()
  const exists = await prisma.scheduledTask.findFirst({
    where: { name: input.name, tenantId },
  })
  if (exists) throw new BizException(ErrorCode.TASK_NAME_EXISTS, '任务名称已存在')
  return prisma.scheduledTask.create({
    data: { ...input, tenantId, createBy: 'system' },
  })
}

export async function update(id: number, input: UpdateScheduledTaskInput) {
  await getById(id)
  if (input.cron && !isValidCron(input.cron)) {
    throw new BizException(ErrorCode.TASK_CRON_INVALID, 'cron 表达式无效')
  }
  if (input.name) {
    const dup = await prisma.scheduledTask.findFirst({
      where: { name: input.name, tenantId: getTenantId() },
    })
    if (dup && dup.id !== id) {
      throw new BizException(ErrorCode.TASK_NAME_EXISTS, '任务名称已存在')
    }
  }
  return prisma.scheduledTask.update({
    where: { id },
    data: { ...input, updateBy: 'system' },
  })
}

export async function remove(id: number) {
  await getById(id)
  return prisma.scheduledTask.delete({ where: { id } })
}

export async function toggleStatus(id: number) {
  const t = await getById(id)
  return prisma.scheduledTask.update({
    where: { id },
    data: { status: t.status === 1 ? 0 : 1, updateBy: 'system' },
  })
}

/** 手动触发执行 (占位: 实际调度需配合 node-cron / agenda) */
export async function run(id: number) {
  const task = await getById(id)
  const result = `手动触发成功: ${task.handler}`
  await prisma.scheduledTask.update({
    where: { id },
    data: {
      lastRunAt: new Date(),
      lastResult: result,
    },
  })
  logger.info({ taskId: id, handler: task.handler }, '定时任务手动触发')
  return { taskId: id, result, runAt: new Date() }
}

export const scheduledTaskService = {
  list,
  getById,
  create,
  update,
  remove,
  toggleStatus,
  run,
}
