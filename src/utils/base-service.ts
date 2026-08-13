/**
 * ============================================================================
 * BI 低代码平台 - 通用 CRUD 服务工厂
 * ============================================================================
 * 参考 jvs-starter-database 思想，抽象 5 个模块重复的 CRUD 模板代码
 * 消除: 分页查询 (findMany + count)、更新 pickDefined、ID 解析、404 检查
 *
 * 用法:
 *   const userBaseCrud = createBaseCrud(prisma.user, { name: '用户', notFoundCode: ErrorCode.USER_NOT_FOUND });
 *   const list = await userBaseCrud.list({ ...query, include: { role: true } });
 * ============================================================================
 */

import { BizException } from './biz-error';
import { paginate, parsePagination } from './paginate';
import logger from './logger';
import type { Prisma } from '@prisma/client';

export interface BaseCrudOptions {
  /** 资源中文名 (用于错误消息) */
  name: string;
  /** 资源不存在错误码 */
  notFoundCode: number;
  /** 创建前要隐藏的字段 (响应不返回, 如 password) */
  sensitiveFields?: string[];
  /** 默认排序 */
  defaultOrderBy?: any;
}

export interface BaseListParams extends PageQuery {
  where?: any;
  include?: any;
  select?: any;
  orderBy?: any;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

/**
 * 从对象中挑选已定义的字段 (更新用)
 */
export function pickDefined<T extends object>(obj: T, keys: (keyof T)[]): Partial<T> {
  const result: Partial<T> = {};
  for (const k of keys) {
    if (obj[k] !== undefined) {
      result[k] = obj[k];
    }
  }
  return result;
}

/**
 * 创建一个资源的基础 CRUD 服务
 */
export function createBaseCrud<
  TModel extends { id: number },
  TCreateInput = any,
  TUpdateInput = any,
>(model: any, options: BaseCrudOptions) {
  const { name, notFoundCode, sensitiveFields = [], defaultOrderBy = { createdAt: 'desc' } } = options;

  /**
   * 隐藏敏感字段 (适用于单个对象或数组)
   */
  function stripSensitive(obj: any): any {
    if (!obj) return obj;
    if (Array.isArray(obj)) return obj.map(stripSensitive);
    if (typeof obj !== 'object') return obj;
    const copy = { ...obj };
    for (const f of sensitiveFields) delete copy[f];
    return copy;
  }

  /**
   * 列表 (分页)
   */
  async function list(params: BaseListParams) {
    const { page, pageSize, skip, take } = parsePagination(params);
    const result = await paginate(model as any, {
      where: params.where,
      include: params.include,
      select: params.select,
      orderBy: params.orderBy || defaultOrderBy,
      page,
      pageSize,
      skip,
      take,
    });

    return {
      list: stripSensitive(result.list),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    };
  }

  /**
   * 根据 ID 查找, 不存在则抛 404
   */
  async function getById(id: number, opts?: { include?: any; select?: any }): Promise<TModel> {
    const record = await model.findUnique({
      where: { id },
      include: opts?.include,
      select: opts?.select,
    });
    if (!record) {
      throw new BizException(notFoundCode, `${name}不存在`, 404);
    }
    return stripSensitive(record) as TModel;
  }

  /**
   * 创建记录
   */
  async function create(data: TCreateInput, extras: Record<string, any> = {}): Promise<TModel> {
    const record = await model.create({
      data: { ...(data as any), ...extras },
    });
    logger.info({ id: record.id }, `创建${name}`);
    return stripSensitive(record) as TModel;
  }

  /**
   * 更新记录 (只更新已定义的字段)
   */
  async function update(
    id: number,
    data: TUpdateInput,
    opts?: { include?: any; select?: any }
  ): Promise<TModel> {
    // 先校验存在 (抛 404)
    await getById(id);

    const record = await model.update({
      where: { id },
      data,
      include: opts?.include,
      select: opts?.select,
    });
    logger.info({ id }, `更新${name}`);
    return stripSensitive(record) as TModel;
  }

  /**
   * 删除记录 (可自定义删除前校验)
   */
  async function remove(id: number, preCheck?: (record: any) => Promise<void> | void): Promise<void> {
    await prismaTransaction(async (tx: any) => {
      // Prisma 无法直接用 model 反查 tx 上对应委托; 改为显式 find/delete
      const record = await tx[modelName(model)].findUnique({ where: { id } });
      if (!record) {
        throw new BizException(notFoundCode, `${name}不存在`, 404);
      }

      if (preCheck) {
        await preCheck(record);
      }

      await tx[modelName(model)].delete({ where: { id } });
    });

    logger.info({ id }, `删除${name}`);
  }

  return {
    list,
    getById,
    create,
    update,
    remove,
    stripSensitive,
  };
}

/**
 * 在 Prisma 事务中执行回调
 * 导出为独立方法, 便于任意 Service 使用
 */
export async function prismaTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
  // 延迟导入避免循环依赖
  const { prisma } = await import('../config/prisma');
  return prisma.$transaction(fn);
}

/**
 * 从 model 中提取表名 (如 prisma.user → 'user', prisma.dataSource → 'dataSource')
 * 用于在 $transaction 中动态访问 tx 的委托
 */
function modelName(model: any): string {
  // Prisma delegate 有内部标识; 启发式: 尝试访问私有属性或构造函数 name
  // 简化: 调用方通过 createBaseCrud 的 options 传入 modelName
  // 此处为兜底实现, 实际使用时请传入 modelName
  return (model as any)._modelName || '';
}

/**
 * 重写: 带 modelName 参数的版本 (解决 tx 委托访问问题)
 */
export function createBaseCrudV2<
  TModel extends { id: number },
  TCreateInput = any,
  TUpdateInput = any,
>(model: any, options: BaseCrudOptions & { modelName: string }) {
  const base = createBaseCrud<TModel, TCreateInput, TUpdateInput>(model, options);
  const { modelName: mName, notFoundCode, name: cnName } = options;

  return {
    ...base,

    /** 带事务的删除 (可访问 tx[mName]) */
    async removeTx(id: number, preCheck?: (tx: any, record: any) => Promise<void> | void) {
      return prismaTransaction(async (tx) => {
        const record = await tx[mName].findUnique({ where: { id } });
        if (!record) {
          throw new BizException(notFoundCode, `${cnName}不存在`, 404);
        }
        if (preCheck) await preCheck(tx, record);
        await tx[mName].delete({ where: { id } });
      });
    },
  };
}
