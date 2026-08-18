/**
 * 图表模块 Service
 * 含 P0: data() 通过数据集服务取数据 (连接池 + 只读)
 */
import { prisma } from '../../config/prisma'
import { BizException } from '../../utils/biz-error'
import { ErrorCode } from '../../constants/error-code'
import { parsePagination, paginate } from '../../utils/paginate'
import { datasetService } from '../dataset/dataset.service'
import logger from '../../utils/logger'
import { CreateChartInput, UpdateChartInput } from './chart.dto'
import { getTenantId, ensureTenantScope } from '../../utils/request-context'
import { buildDataScopeWhere, ensureDataScope } from '../../utils/data-scope'

const commonInclude = {
  dataset: { select: { id: true, name: true } },
  dashboard: { select: { id: true, name: true } },
}

export async function list(q: {
  page?: number
  pageSize?: number
  keyword?: string
  datasetId?: number
  dashboardId?: number
  type?: string
}) {
  const { page, pageSize, skip, take } = parsePagination(q)
  const where: any = {}
  if (q.keyword)
    where.OR = [{ name: { contains: q.keyword } }, { description: { contains: q.keyword } }]
  if (q.datasetId) where.datasetId = q.datasetId
  if (q.dashboardId) where.dashboardId = q.dashboardId
  if (q.type) where.type = q.type
  where.deleted = false
  where.tenantId = getTenantId()
  Object.assign(where, await buildDataScopeWhere())

  return paginate(prisma.chart as any, {
    where,
    include: commonInclude,
    orderBy: { createdAt: 'desc' },
    page,
    pageSize,
    skip,
    take,
  })
}

export async function getById(id: number) {
  const c = await prisma.chart.findUnique({ where: { id }, include: commonInclude })
  if (!c) throw BizException.notFound(ErrorCode.CHART_NOT_FOUND)
  if (c.deleted) throw BizException.notFound(ErrorCode.CHART_NOT_FOUND)
  ensureTenantScope(c)
  await ensureDataScope(c)
  return c
}

export async function create(input: CreateChartInput, creatorId: number) {
  return prisma.chart.create({
    data: { ...input, creatorId, createBy: 'system', tenantId: getTenantId() } as any,
    include: commonInclude,
  })
}

export async function update(id: number, input: UpdateChartInput) {
  await getById(id)
  return prisma.chart.update({
    where: { id },
    data: { ...input, updateBy: 'system' } as any,
    include: commonInclude,
  })
}

export async function remove(id: number) {
  await getById(id)
  await prisma.chart.update({ where: { id }, data: { deleted: true } })
  logger.info({ id }, '删除图表')
}

/**
 * 执行图表数据查询
 * 通过关联 dataset 取真实数据 (连接池 + 只读 + 超时)
 */
export async function queryData(id: number, limit: number = 5000) {
  const chart = await getById(id)
  const result = await datasetService.execute((chart as any).datasetId, limit)
  return {
    chart: { id: chart.id, name: chart.name, type: chart.type, config: (chart as any).config },
    ...result,
  }
}

export const chartService = {
  list,
  getById,
  create,
  update,
  remove,
  queryData,
}
