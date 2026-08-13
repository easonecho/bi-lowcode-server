/**
 * ============================================================================
 * BI 低代码平台 - 分页查询工具
 * ============================================================================
 * 抽取重复的分页查询逻辑 (原 5 个模块各自重复实现)
 * 参考 jvs-starter-database 的分页封装思想
 * ============================================================================
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

/** 分页查询参数 */
export interface PageQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

/** 分页查询结果 */
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 最大每页条数, 防止恶意大分页拖垮数据库 */
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 10;

/**
 * 解析分页参数, 保证合法性
 */
export function parsePagination(query: PageQuery): { page: number; pageSize: number; skip: number; take: number } {
  const page = Math.max(1, parseInt(String(query.page)) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(String(query.pageSize)) || DEFAULT_PAGE_SIZE));
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

/**
 * 通用分页查询 (封装 findMany + count 并行)
 *
 * @example
 * const result = await paginate(prisma.user, {
 *   where: { status: 1 },
 *   include: { role: true },
 *   page: 1,
 *   pageSize: 10,
 * });
 */
export async function paginate<T extends keyof PrismaDelegateMap>(
  model: PrismaDelegateMap[T],
  options: {
    where?: any;
    include?: any;
    select?: any;
    orderBy?: any;
    page?: number;
    pageSize?: number;
    /** 传了 skip/take 时直接使用 (避免重复解析) */
    skip?: number;
    take?: number;
  }
): Promise<PageResult<any>> {
  const { page, pageSize, skip, take } = options.skip !== undefined && options.take !== undefined
    ? {
        page: options.page ?? Math.floor(options.skip! / options.take!) + 1,
        pageSize: options.pageSize ?? options.take!,
        skip: options.skip,
        take: options.take,
      }
    : parsePagination(options);

  const [list, total] = await Promise.all([
    (model as any).findMany({
      where: options.where,
      include: options.include,
      select: options.select,
      orderBy: options.orderBy || { createdAt: 'desc' },
      skip,
      take,
    }),
    (model as any).count({ where: options.where }),
  ]);

  return {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Prisma 代理类型映射 (用于类型安全)
 */
interface PrismaDelegateMap {
  user: typeof prisma.user;
  role: typeof prisma.role;
  datasource: typeof prisma.datasource;
  dataset: typeof prisma.dataset;
  dashboard: typeof prisma.dashboard;
  chart: typeof prisma.chart;
}
