/**
 * ============================================================================
 * 数据集模块 Service
 * P0 修复: 所有执行 SQL 的路径统一经 executeQuery(带只读校验+连接池+超时)
 * P1 修复: 删除时用事务检查关联图表
 * ============================================================================
 */

import { BizException } from '../../utils/biz-error';
import { ErrorCode } from '../../constants/error-code';
import { prismaTransaction } from '../../utils/base-service';
import { executeQuery } from '../../utils/db-pool';
import { datasourceService } from '../datasource/datasource.service';
import { prisma } from '../../config/prisma';
import logger from '../../utils/logger';
import { CreateDatasetInput, UpdateDatasetInput, PreviewDatasetInput } from './dataset.dto';

// 基础 CRUD (数据集无敏感字段, 但关联 datasource 信息)
function stripVO(ds: any) {
  return ds;
}

/**
 * 分页列表
 */
export async function list(q: { page?: number; pageSize?: number; keyword?: string; datasourceId?: number }) {
  const { page, pageSize, skip, take } = (await import('../../utils/paginate')).parsePagination(q);

  const where: any = {};
  if (q.keyword) {
    where.OR = [{ name: { contains: q.keyword } }, { description: { contains: q.keyword } }];
  }
  if (q.datasourceId) where.datasourceId = q.datasourceId;
  where.deleted = false;

  const mod = await import('../../utils/paginate');
  const result = await mod.paginate(prisma.dataset as any, {
    where,
    include: {
      datasource: { select: { id: true, name: true, type: true } },
      creator: { select: { id: true, username: true, nickname: true } },
      _count: { select: { charts: true } },
    },
    page, pageSize, skip, take,
  });

  return result;
}

export async function getById(id: number) {
  const ds = await prisma.dataset.findUnique({
    where: { id },
    include: {
      datasource: { select: { id: true, name: true, type: true } },
      creator: { select: { id: true, username: true, nickname: true } },
      _count: { select: { charts: true } },
    },
  });
  if (!ds) throw BizException.notFound(ErrorCode.DATASET_NOT_FOUND);
  if (ds.deleted) throw BizException.notFound(ErrorCode.DATASET_NOT_FOUND);
  return stripVO(ds);
}

export async function create(input: CreateDatasetInput, creatorId: number) {
  const record = await prisma.dataset.create({
    data: {
      name: input.name,
      description: input.description,
      datasourceId: input.datasourceId,
      sql: input.sql,
      fields: input.fields as any,
      cacheEnabled: input.cacheEnabled,
      cacheTtl: input.cacheTtl,
      creatorId,
      createBy: 'system',
    },
  });
  logger.info({ id: record.id }, '创建数据集');
  return stripVO(record);
}

export async function update(id: number, input: UpdateDatasetInput) {
  await getById(id);
  const updated = await prisma.dataset.update({ where: { id }, data: { ...input, updateBy: 'system' } as any });
  logger.info({ id }, '更新数据集');
  return stripVO(updated);
}

/**
 * 删除: 事务中检查关联图表
 */
export async function remove(id: number) {
  await prismaTransaction(async (tx) => {
    const ds = await tx.dataset.findUnique({
      where: { id },
      include: { _count: { select: { charts: true } } },
    });
    if (!ds) throw BizException.notFound(ErrorCode.DATASET_NOT_FOUND);
    if (ds._count.charts > 0) {
      throw new BizException(ErrorCode.DATASET_HAS_CHARTS);
    }
    await tx.dataset.update({ where: { id }, data: { deleted: true } });
  });
  logger.info({ id }, '删除数据集');
}

/**
 * 预览指定 SQL (无数据集 ID, 用于数据集编辑时的预览)
 * P0: 通过 executeQuery 只读执行 + 连接池
 */
export async function previewSql(input: PreviewDatasetInput, userId: number) {
  const cfg = await datasourceService.getDsConfigForQuery(input.datasourceId);

  const sql = input.limit ? `${input.sql.trim().replace(/;$/, '')} LIMIT ${input.limit}` : input.sql;

  let rows: any[];
  try {
    rows = await executeQuery(cfg, sql, true);
  } catch (err: any) {
    logger.warn({ datasourceId: input.datasourceId, userId, err }, '数据集预览执行失败');
    throw new BizException(ErrorCode.DATASET_QUERY_FAILED, configErrorMsg(err));
  }

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  return {
    columns,
    rows,
    rowCount: rows.length,
  };
}

/**
 * 执行数据集的保存 SQL
 */
export async function execute(id: number, limit?: number) {
  const ds = await prisma.dataset.findUnique({
    where: { id },
    include: { datasource: true },
  });
  if (!ds) throw BizException.notFound(ErrorCode.DATASET_NOT_FOUND);
  if (ds.deleted) throw BizException.notFound(ErrorCode.DATASET_NOT_FOUND);

  const cfg = await datasourceService.getDsConfigForQuery(ds.datasourceId);

  const finalSql = limit ? `${ds.sql.trim().replace(/;$/, '')} LIMIT ${limit}` : ds.sql;

  try {
    const rows = await executeQuery(cfg, finalSql, true);
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { columns, rows, rowCount: rows.length };
  } catch (err: any) {
    logger.warn({ datasetId: id, datasourceId: ds.datasourceId, err }, '数据集执行失败');
    throw new BizException(ErrorCode.DATASET_QUERY_FAILED, configErrorMsg(err));
  }
}

function configErrorMsg(err: any): string | undefined {
  return process.env.NODE_ENV === 'development' ? err.message : undefined;
}

export const datasetService = {
  list, getById, create, update, remove,
  previewSql, execute,
};
