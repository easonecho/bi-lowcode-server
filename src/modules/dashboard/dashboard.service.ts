/**
 * 仪表板模块 Service
 * P1 修复: 删除时用 $transaction 包裹 (先解除 charts.dashboardId 再删除仪表板)
 */
import { prisma } from '../../config/prisma';
import { BizException } from '../../utils/biz-error';
import { ErrorCode } from '../../constants/error-code';
import { parsePagination, paginate } from '../../utils/paginate';
import { prismaTransaction } from '../../utils/base-service';
import logger from '../../utils/logger';
import { CreateDashboardInput, UpdateDashboardInput } from './dashboard.dto';

const commonInclude = {
  creator: { select: { id: true, username: true, nickname: true } },
  _count: { select: { charts: true } },
};

const detailInclude = {
  ...commonInclude,
  charts: {
    include: { dataset: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
};

export async function list(q: { page?: number; pageSize?: number; keyword?: string; status?: number; isPublic?: boolean }) {
  const { page, pageSize, skip, take } = parsePagination(q);
  const where: any = {};
  if (q.keyword) {
    where.OR = [{ name: { contains: q.keyword } }, { description: { contains: q.keyword } }];
  }
  if (q.status !== undefined) where.status = q.status;
  if (q.isPublic !== undefined) where.isPublic = q.isPublic;
  where.deleted = false;

  return paginate(prisma.dashboard as any, {
    where,
    include: commonInclude,
    orderBy: { createdAt: 'desc' },
    page, pageSize, skip, take,
  });
}

export async function getById(id: number) {
  const d = await prisma.dashboard.findUnique({ where: { id }, include: detailInclude });
  if (!d) throw BizException.notFound(ErrorCode.DASHBOARD_NOT_FOUND);
  if (d.deleted) throw BizException.notFound(ErrorCode.DASHBOARD_NOT_FOUND);
  return d;
}

export async function create(input: CreateDashboardInput, creatorId: number) {
  return prisma.dashboard.create({
    data: { ...input, creatorId, createBy: 'system' } as any,
  });
}

export async function update(id: number, input: UpdateDashboardInput) {
  await getById(id);
  return prisma.dashboard.update({ where: { id }, data: { ...input, updateBy: 'system' } as any });
}

/**
 * 删除: 事务解除图表关联后再删除 (P1 修复)
 */
export async function remove(id: number) {
  await prismaTransaction(async (tx) => {
    const d = await tx.dashboard.findUnique({ where: { id } });
    if (!d) throw BizException.notFound(ErrorCode.DASHBOARD_NOT_FOUND);
    await tx.chart.updateMany({ where: { dashboardId: id }, data: { dashboardId: null } });
    await tx.dashboard.update({ where: { id }, data: { deleted: true } });
  });
  logger.info({ id }, '删除仪表板');
}

export const dashboardService = {
  list, getById, create, update, remove,
};
