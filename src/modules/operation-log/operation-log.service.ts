/**
 * 操作日志模块 Service
 */
import { prisma } from '../../config/prisma'
import logger from '../../utils/logger'
import type { ListLogQuery } from './operation-log.dto'

function whereBuilder(q: ListLogQuery) {
  const where: any = {}
  if (q.module) where.module = q.module
  if (q.action) where.action = { contains: q.action }
  if (q.username) where.username = { contains: q.username }
  if (q.status !== undefined) where.status = q.status
  if (q.startTime || q.endTime) {
    where.createdAt = {}
    if (q.startTime) where.createdAt.gte = new Date(q.startTime)
    if (q.endTime) where.createdAt.lte = new Date(q.endTime)
  }
  return where
}

export async function list(q: ListLogQuery) {
  const where = whereBuilder(q)
  const [rows, total] = await Promise.all([
    prisma.operationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.operationLog.count({ where }),
  ])
  return { list: rows, total }
}

export async function getModules() {
  const rows = await prisma.operationLog.findMany({
    select: { module: true },
    distinct: ['module'],
    orderBy: { module: 'asc' },
  })
  return rows.map((r) => r.module)
}

export async function getActions() {
  const rows = await prisma.operationLog.findMany({
    select: { action: true },
    distinct: ['action'],
    orderBy: { action: 'asc' },
  })
  return rows.map((r) => r.action)
}

export async function removeAll() {
  const r = await prisma.operationLog.deleteMany({})
  logger.info({ count: r.count }, '清空操作日志')
  return r.count
}

export async function removeBatch(ids: number[]) {
  const r = await prisma.operationLog.deleteMany({
    where: { id: { in: ids } },
  })
  return r.count
}

export default { list, getModules, getActions, removeAll, removeBatch }
