/**
 * 仪表板模块 Service
 * P1 修复: 删除时用 $transaction 包裹 (先解除 charts.dashboardId 再删除仪表板)
 * P2-3: 支持 groupId 分组筛选
 */
import { prisma } from '../../config/prisma'
import { BizException } from '../../utils/biz-error'
import { ErrorCode } from '../../constants/error-code'
import { parsePagination, paginate } from '../../utils/paginate'
import { prismaTransaction } from '../../utils/base-service'
import logger from '../../utils/logger'
import { CreateDashboardInput, UpdateDashboardInput } from './dashboard.dto'
import { getTenantId, ensureTenantScope } from '../../utils/request-context'
import { buildDataScopeWhere, ensureDataScope } from '../../utils/data-scope'

const commonInclude = {
  creator: { select: { id: true, username: true, nickname: true } },
  _count: { select: { charts: true } },
}

const detailInclude = {
  ...commonInclude,
  charts: {
    include: { dataset: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
}

export async function list(q: {
  page?: number
  pageSize?: number
  keyword?: string
  status?: number
  isPublic?: boolean
  onlyFavorites?: boolean
  userId?: number
  groupId?: number
  ungrouped?: boolean
}) {
  const { page, pageSize, skip, take } = parsePagination(q)
  const where: any = {}
  if (q.keyword) {
    where.OR = [{ name: { contains: q.keyword } }, { description: { contains: q.keyword } }]
  }
  if (q.status !== undefined) where.status = q.status
  if (q.isPublic !== undefined) where.isPublic = q.isPublic
  if (q.onlyFavorites && q.userId) {
    where.favorites = { some: { userId: q.userId } }
  }
  // P2-3: 分组筛选 (显式转 number, 避免 query 字符串传入 Prisma)
  if (q.ungrouped) {
    where.groupId = null
  } else if (q.groupId !== undefined && q.groupId !== null) {
    const gid = Number(q.groupId)
    if (!Number.isNaN(gid)) where.groupId = gid
  }
  where.deleted = false
  where.tenantId = getTenantId()
  Object.assign(where, await buildDataScopeWhere())

  const include = q.userId
    ? {
        ...commonInclude,
        favorites: { where: { userId: q.userId }, select: { id: true } },
      }
    : commonInclude

  return paginate(prisma.dashboard as any, {
    where,
    include,
    orderBy: { createdAt: 'desc' },
    page,
    pageSize,
    skip,
    take,
  })
}

export async function getById(id: number) {
  const d = await prisma.dashboard.findUnique({ where: { id }, include: detailInclude })
  if (!d) throw BizException.notFound(ErrorCode.DASHBOARD_NOT_FOUND)
  if (d.deleted) throw BizException.notFound(ErrorCode.DASHBOARD_NOT_FOUND)
  ensureTenantScope(d)
  await ensureDataScope(d)
  return d
}

export async function create(input: CreateDashboardInput, creatorId: number) {
  return prisma.dashboard.create({
    data: { ...input, creatorId, createBy: 'system', tenantId: getTenantId() } as any,
  })
}

export async function update(id: number, input: UpdateDashboardInput) {
  await getById(id)
  return prisma.dashboard.update({ where: { id }, data: { ...input, updateBy: 'system' } as any })
}

/**
 * 删除: 事务解除图表关联后再删除 (P1 修复)
 */
export async function remove(id: number) {
  await prismaTransaction(async (tx) => {
    const d = await tx.dashboard.findUnique({ where: { id } })
    if (!d) throw BizException.notFound(ErrorCode.DASHBOARD_NOT_FOUND)
    ensureTenantScope(d)
    await ensureDataScope(d)
    await tx.chart.updateMany({ where: { dashboardId: id }, data: { dashboardId: null } })
    await tx.dashboard.update({ where: { id }, data: { deleted: true } })
  })
  logger.info({ id }, '删除仪表板')
}

/**
 * 复制仪表板 (含布局, 不复制图表关联)
 * - 仅复制 dashboard 本身 (名称追加"_副本"后缀, 状态强制为草稿, isPublic=false)
 * - 不复制 charts 关联 (避免误绑定到原数据集外的不存在图表)
 * - layout 字段深拷贝, 避免共享引用
 */
export async function copy(id: number, creatorId: number) {
  const source = await getById(id)
  return prisma.dashboard.create({
    data: {
      name: `${source.name}_副本`,
      description: source.description,
      layout: source.layout ? JSON.parse(JSON.stringify(source.layout)) : undefined,
      status: 0,
      isPublic: false,
      creatorId,
      createBy: 'system',
      tenantId: getTenantId(),
    } as any,
  })
}

/**
 * 收藏/取消收藏 (4.4 新增)
 */
export async function toggleFavorite(dashboardId: number, userId: number) {
  await getById(dashboardId) // ensures exists + scope
  const existing = await prisma.dashboardFavorite.findUnique({
    where: { userId_dashboardId: { userId, dashboardId } },
  })
  if (existing) {
    await prisma.dashboardFavorite.delete({ where: { id: existing.id } })
    return { isFavorited: false }
  }
  await prisma.dashboardFavorite.create({ data: { userId, dashboardId } })
  return { isFavorited: true }
}

export const dashboardService = {
  list,
  getById,
  create,
  update,
  remove,
  copy,
  toggleFavorite,
}
