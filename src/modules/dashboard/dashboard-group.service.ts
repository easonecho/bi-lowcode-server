/**
 * 仪表板分组模块 Service (P2-3)
 * - 租户隔离 + 逻辑删除
 * - 删除前检查分组下是否仍有仪表板
 */
import { prisma } from '../../config/prisma'
import { BizException } from '../../utils/biz-error'
import { ErrorCode } from '../../constants/error-code'
import { getTenantId, ensureTenantScope } from '../../utils/request-context'
import type { CreateDashboardGroupInput, UpdateDashboardGroupInput } from './dashboard-group.dto'

export async function list() {
  return prisma.dashboardGroup.findMany({
    where: { deleted: false, tenantId: getTenantId() },
    include: {
      creator: { select: { id: true, username: true, nickname: true } },
      _count: { select: { dashboards: true } },
    },
    orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
  })
}

export async function getById(id: number) {
  const g = await prisma.dashboardGroup.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, username: true, nickname: true } },
      _count: { select: { dashboards: true } },
    },
  })
  if (!g || g.deleted) throw BizException.notFound(ErrorCode.DASHBOARD_GROUP_NOT_FOUND)
  ensureTenantScope(g)
  return g
}

export async function create(input: CreateDashboardGroupInput, creatorId: number) {
  const tenantId = getTenantId()
  const exists = await prisma.dashboardGroup.findFirst({
    where: { name: input.name, deleted: false, tenantId },
  })
  if (exists) throw new BizException(ErrorCode.DASHBOARD_GROUP_NAME_EXISTS, '分组名称已存在')
  return prisma.dashboardGroup.create({
    data: { ...input, creatorId, createBy: 'system', tenantId },
  })
}

export async function update(id: number, input: UpdateDashboardGroupInput) {
  await getById(id)
  return prisma.dashboardGroup.update({
    where: { id },
    data: { ...input, updateBy: 'system' },
  })
}

export async function remove(id: number) {
  await getById(id)
  // 检查分组下是否仍有未删除的仪表板
  const count = await prisma.dashboard.count({
    where: { groupId: id, deleted: false },
  })
  if (count > 0) {
    throw new BizException(
      ErrorCode.DASHBOARD_GROUP_HAS_DASHBOARDS,
      `该分组下存在 ${count} 个仪表板，无法删除`,
    )
  }
  await prisma.dashboardGroup.update({ where: { id }, data: { deleted: true } })
}

export const dashboardGroupService = { list, getById, create, update, remove }
