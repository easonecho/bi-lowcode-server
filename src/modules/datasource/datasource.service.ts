/**
 * ============================================================================
 * BI 低代码平台 - 数据源模块业务逻辑层 (Service)
 * ============================================================================
 * P0 修复项:
 *  - 数据源密码使用 AES-256-GCM 加密存储, 不再明文保存
 *  - 使用连接池 (getPool/executeQuery) 替代每次新建连接
 *  - 执行 SQL 前增加只读校验
 * ============================================================================
 */

import { prisma } from '../../config/prisma';
import { BizException } from '../../utils/biz-error';
import { ErrorCode } from '../../constants/error-code';
import { encrypt, decrypt, isEncrypted } from '../../utils/crypto';
import {
  getPool,
  executeQuery,
  testConnection,
  getTableNames,
  releasePool,
  decryptPassword,
  type DataSourceConfig,
} from '../../utils/db-pool';
import { paginate, parsePagination } from '../../utils/paginate';
import { CreateDatasourceInput, UpdateDatasourceInput } from './datasource.dto';

/** 响应中携带的数据源信息 (已排除/屏蔽密码) */
interface DatasourceVO {
  id: number;
  name: string;
  type: string;
  host: string;
  port: number;
  username: string;
  database: string;
  options?: unknown;
  status: number;
  description?: string | null;
  creatorId: number;
  createdAt: Date;
  updatedAt: Date;
  creator?: unknown;
  datasets?: unknown;
}

/** 将 DB 记录转换为 VO (保证 password 不出现在响应中) */
function toVO(ds: any): DatasourceVO {
  const { password, ...rest } = ds;
  // 保持字段顺序
  return rest as DatasourceVO;
}

/**
 * 根据记录构建连接配置 (负责解密密码)
 */
function buildDsConfig(ds: { id: number; type: string; host: string; port: number; username: string; password: string; database: string; options?: any }): DataSourceConfig {
  return {
    id: ds.id,
    type: ds.type,
    host: ds.host,
    port: ds.port,
    username: ds.username,
    password: decryptPassword(ds.password),
    database: ds.database,
    options: ds.options,
  };
}

/**
 * 列表查询 (分页)
 */
export async function list(query: { page?: number; pageSize?: number; keyword?: string; type?: string }) {
  const { page, pageSize, skip, take } = parsePagination(query);

  const where: any = {};
  if (query.keyword) {
    where.OR = [
      { name: { contains: query.keyword } },
      { host: { contains: query.keyword } },
      { database: { contains: query.keyword } },
    ];
  }
  if (query.type) where.type = query.type;
  where.deleted = false;

  const result = await paginate(prisma.datasource as any, {
    where,
    include: {
      creator: { select: { id: true, username: true, nickname: true } },
      _count: { select: { datasets: true } },
    },
    orderBy: { createdAt: 'desc' },
    page,
    pageSize,
    skip,
    take,
  });

  return {
    list: result.list.map((ds: any) => toVO(ds)),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
  };
}

/**
 * 详情查询
 */
export async function getById(id: number) {
  const ds = await prisma.datasource.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, username: true, nickname: true } },
      _count: { select: { datasets: true } },
    },
  });
  if (!ds) throw new BizException(ErrorCode.DATASOURCE_NOT_FOUND, undefined, 404);
  if (ds.deleted) throw new BizException(ErrorCode.DATASOURCE_NOT_FOUND, undefined, 404);
  return toVO(ds);
}

/**
 * 创建数据源
 * P0 修复: 密码使用 AES-256-GCM 加密后保存
 */
export async function create(input: CreateDatasourceInput, creatorId: number) {
  const encryptedPassword = encrypt(input.password);

  const ds = await prisma.datasource.create({
    data: {
      name: input.name,
      type: input.type,
      host: input.host,
      port: input.port,
      username: input.username,
      password: encryptedPassword,
      database: input.database,
      description: input.description,
      options: input.options as any,
      creatorId,
      createBy: 'system',
    },
  });

  return toVO(ds);
}

/**
 * 更新数据源
 * - 如果密码字段发生变化, 重新加密
 * - 更新成功后, 清除该数据源的连接池缓存 (配置可能变更)
 */
export async function update(id: number, input: UpdateDatasourceInput) {
  const data: any = { ...input, updateBy: 'system' };

  if (input.password) {
    data.password = encrypt(input.password);
  }

  const updated = await prisma.datasource.update({ where: { id }, data });

  // 清除连接池缓存 (配置已变更)
  releasePool(id);

  return toVO(updated);
}

/**
 * 删除数据源 (需保证无关联数据集)
 */
export async function remove(id: number) {
  // 使用 $transaction 保证检查 + 删除的原子性
  await prisma.$transaction(async (tx: any) => {
    const ds = await tx.datasource.findUnique({
      where: { id },
      include: { _count: { select: { datasets: true } } },
    });

    if (!ds) throw new BizException(ErrorCode.DATASOURCE_NOT_FOUND, undefined, 404);
    if (ds._count.datasets > 0) {
      throw new BizException(ErrorCode.DATASOURCE_HAS_DATASETS);
    }

    await tx.datasource.update({ where: { id }, data: { deleted: true } });
  });

  releasePool(id);
}

/**
 * 测试连接
 * P0 修复: 使用 testConnection 工具函数替代新建单连接
 */
export async function test(id: number) {
  const ds = await prisma.datasource.findUnique({ where: { id } });
  if (!ds) throw new BizException(ErrorCode.DATASOURCE_NOT_FOUND, undefined, 404);
  if (ds.deleted) throw new BizException(ErrorCode.DATASOURCE_NOT_FOUND, undefined, 404);

  const cfg = buildDsConfig(ds);

  try {
    await testConnection({
      type: cfg.type,
      host: cfg.host,
      port: cfg.port,
      username: cfg.username,
      password: cfg.password,
      database: cfg.database,
    });
  } catch (err) {
    // 标记为未连接
    await prisma.datasource.update({ where: { id }, data: { status: 0 } });
    throw new BizException(
      ErrorCode.DATASOURCE_CONNECT_FAILED,
      err instanceof Error ? err.message : undefined
    );
  }

  // 连接成功: 更新状态并返回表列表
  const pool = getPool(cfg);
  const tables = await getTableNames(cfg);
  await prisma.datasource.update({ where: { id }, data: { status: 1 } });

  return {
    connected: true,
    tables,
    tableCount: tables.length,
  };
}

/**
 * 获取数据源的表列表
 */
export async function listTables(id: number) {
  const ds = await prisma.datasource.findUnique({ where: { id } });
  if (!ds) throw new BizException(ErrorCode.DATASOURCE_NOT_FOUND, undefined, 404);
  if (ds.deleted) throw new BizException(ErrorCode.DATASOURCE_NOT_FOUND, undefined, 404);

  const cfg = buildDsConfig(ds);
  return getTableNames(cfg);
}

/**
 * 导出: 供数据集/图表模块使用的辅助方法
 * 通过数据源 ID 获取可直接执行 SQL 的数据库连接配置 (已解密密码)
 */
export async function getDsConfigForQuery(id: number): Promise<DataSourceConfig> {
  const ds = await prisma.datasource.findUnique({ where: { id } });
  if (!ds) throw new BizException(ErrorCode.DATASOURCE_NOT_FOUND, undefined, 404);
  if (ds.deleted) throw new BizException(ErrorCode.DATASOURCE_NOT_FOUND, undefined, 404);
  return buildDsConfig(ds);
}

export const datasourceService = {
  list,
  getById,
  create,
  update,
  remove,
  test,
  listTables,
  getDsConfigForQuery,
};
