/**
 * ============================================================================
 * 数据集模块 Service
 * P0 修复: 所有执行 SQL 的路径统一经 executeQuery(带只读校验+连接池+超时)
 * P1 修复: 删除时用事务检查关联图表
 * P2 增强:
 *   - 参数化查询: SQL 中 {{paramName}} 占位符, 执行时用参数值替换 (防注入)
 *   - 字段管理: fields 配置支持别名映射、类型转换
 *   - 计算字段: computed + expression 定义虚拟字段
 * ============================================================================
 */

import { BizException } from '../../utils/biz-error'
import { ErrorCode } from '../../constants/error-code'
import { prismaTransaction } from '../../utils/base-service'
import { executeQuery } from '../../utils/db-pool'
import { datasourceService } from '../datasource/datasource.service'
import { prisma } from '../../config/prisma'
import logger from '../../utils/logger'
import {
  CreateDatasetInput,
  UpdateDatasetInput,
  PreviewDatasetInput,
  type FieldDef,
  type ParamDef,
} from './dataset.dto'
import { getTenantId, ensureTenantScope } from '../../utils/request-context'
import { buildDataScopeWhere, ensureDataScope } from '../../utils/data-scope'
import { datasetQueryCache, buildDatasetCacheKey, invalidateDatasetCache } from '../../utils/cache'

function stripVO(ds: any) {
  return ds
}

// ============================================================================
// P2: 参数化查询 - 将 SQL 中的 {{paramName}} 替换为安全值
// ============================================================================
interface ParamValues {
  [key: string]: any
}

/**
 * 将 SQL 中的 {{paramName}} 替换为参数值
 * - 数字类型: 直接替换为数字
 * - 字符串类型: 转义单引号后用引号包裹
 * - 日期类型: 转义后用引号包裹
 * - 未提供值: 使用参数默认值, 无默认值时返回 NULL
 */
function applyParamsToSql(
  sql: string,
  paramValues: ParamValues,
  paramDefs?: ParamDef[],
): { sql: string; values: any[] } {
  // 合并默认值
  const merged: ParamValues = {}
  if (paramDefs && Array.isArray(paramDefs)) {
    for (const def of paramDefs) {
      merged[def.name] = def.defaultValue !== undefined ? def.defaultValue : null
    }
  }
  if (paramValues) {
    Object.assign(merged, paramValues)
  }

  // P2 安全修复: 统一使用 ? 占位符 + values 数组, 杜绝 SQL 注入
  const values: any[] = []
  const finalSql = sql.replace(/\{\{(\w+)\}\}/g, (_match, paramName: string) => {
    const val = merged[paramName]
    if (val === null || val === undefined) {
      values.push(null)
    } else if (typeof val === 'boolean') {
      values.push(val ? 1 : 0)
    } else if (typeof val === 'number' && Number.isFinite(val)) {
      values.push(val)
    } else {
      // 字符串/日期: 直接作为参数值传给 prepared statement
      values.push(val)
    }
    return '?'
  })

  return { sql: finalSql, values }
}

/** 校验必填参数 */
function validateParams(paramValues: ParamValues | undefined, paramDefs?: ParamDef[]) {
  if (!paramDefs || !Array.isArray(paramDefs) || paramDefs.length === 0) return
  for (const def of paramDefs) {
    if (def.required) {
      const val = paramValues?.[def.name]
      if (val === undefined || val === null || val === '') {
        throw new BizException(ErrorCode.PARAM_ERROR, `参数 ${def.name} 是必填项`)
      }
    }
  }
}

// ============================================================================
// P2: 字段管理 - 应用字段配置到查询结果
// ============================================================================

/**
 * 对查询结果行应用字段配置
 * - 别名映射: row[name] -> row[alias]
 * - 类型转换: 将值转为指定类型
 * - 计算字段: 基于 expression 添加虚拟字段
 */
function applyFieldConfig(rows: any[], fieldDefs?: FieldDef[]): { rows: any[]; columns: string[] } {
  if (!fieldDefs || !Array.isArray(fieldDefs) || fieldDefs.length === 0) {
    const columns = rows.length > 0 ? Object.keys(rows[0]) : []
    return { rows, columns }
  }

  const visibleFields = fieldDefs.filter((f) => f.visible !== false)
  const computedFields = fieldDefs.filter((f) => f.computed && f.expression)

  const transformedRows = rows.map((row) => {
    const newRow: any = {}

    // 处理普通字段 (别名映射 + 类型转换)
    for (const f of visibleFields) {
      if (f.computed) continue
      const rawVal = row[f.name]
      const targetKey = f.alias || f.name
      newRow[targetKey] = convertType(rawVal, f.type)
    }

    // 处理计算字段
    for (const f of computedFields) {
      const targetKey = f.alias || f.name
      try {
        newRow[targetKey] = evalComputedField(f.expression!, row)
      } catch {
        newRow[targetKey] = null
      }
    }

    // 保留未配置的字段 (不在 fieldDefs 中的原始字段)
    if (rows.length > 0) {
      const originalKeys = Object.keys(row)
      for (const key of originalKeys) {
        if (
          !Object.prototype.hasOwnProperty.call(newRow, key) &&
          !fieldDefs.find((f) => f.name === key || f.alias === key)
        ) {
          newRow[key] = row[key]
        }
      }
    }

    return newRow
  })

  // 构建列名 (别名优先)
  const columns = visibleFields
    .filter((f) => !f.computed)
    .map((f) => f.alias || f.name)
    .concat(computedFields.map((f) => f.alias || f.name))

  // 合并原始列
  if (rows.length > 0) {
    const originalKeys = Object.keys(rows[0])
    for (const key of originalKeys) {
      if (!columns.includes(key) && !fieldDefs.find((f) => f.name === key || f.alias === key)) {
        columns.push(key)
      }
    }
  }

  return { rows: transformedRows, columns }
}

/** 类型转换 */
function convertType(val: any, type?: string): any {
  if (val === null || val === undefined) return val
  if (!type) return val
  switch (type) {
    case 'number': {
      const n = Number(val)
      return Number.isFinite(n) ? n : null
    }
    case 'string':
      return String(val)
    case 'boolean':
      return Boolean(val) || val === 1 || val === 'true'
    case 'date':
      return val instanceof Date ? val.toISOString().slice(0, 10) : String(val)
    case 'datetime':
      return val instanceof Date ? val.toISOString() : String(val)
    default:
      return val
  }
}

/** 计算字段求值 (安全执行简单表达式) */
function evalComputedField(expression: string, row: any): any {
  // 支持简单算术表达式, 如: {{price}} * {{quantity}}
  // 以及聚合函数: SUM, AVG, MIN, MAX, COUNT
  const expr = expression.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => {
    const v = row[key]
    return typeof v === 'number' ? String(v) : '0'
  })

  // 仅允许数字和运算符
  if (!/^[\d\s+\-*/().,]+$/.test(expr)) {
    throw new Error('Invalid expression')
  }

  const fn = new Function(`return ${expr}`)
  return fn()
}

// ============================================================================
// CRUD
// ============================================================================

export async function list(q: {
  page?: number
  pageSize?: number
  keyword?: string
  datasourceId?: number
}) {
  const { page, pageSize, skip, take } = (await import('../../utils/paginate')).parsePagination(q)

  const where: any = {}
  if (q.keyword) {
    where.OR = [{ name: { contains: q.keyword } }, { description: { contains: q.keyword } }]
  }
  if (q.datasourceId) where.datasourceId = q.datasourceId
  where.deleted = false
  where.tenantId = getTenantId()
  Object.assign(where, await buildDataScopeWhere())

  const mod = await import('../../utils/paginate')
  const result = await mod.paginate(prisma.dataset as any, {
    where,
    include: {
      datasource: { select: { id: true, name: true, type: true } },
      creator: { select: { id: true, username: true, nickname: true } },
      _count: { select: { charts: true } },
    },
    page,
    pageSize,
    skip,
    take,
  })

  return result
}

export async function getById(id: number) {
  const ds = await prisma.dataset.findUnique({
    where: { id },
    include: {
      datasource: { select: { id: true, name: true, type: true } },
      creator: { select: { id: true, username: true, nickname: true } },
      _count: { select: { charts: true } },
    },
  })
  if (!ds) throw BizException.notFound(ErrorCode.DATASET_NOT_FOUND)
  if (ds.deleted) throw BizException.notFound(ErrorCode.DATASET_NOT_FOUND)
  ensureTenantScope(ds)
  await ensureDataScope(ds)
  return stripVO(ds)
}

export async function create(input: CreateDatasetInput, creatorId: number) {
  const tenantId = getTenantId()
  const record = await prisma.dataset.create({
    data: {
      name: input.name,
      description: input.description,
      datasourceId: input.datasourceId,
      sql: input.sql,
      fields: input.fields as any,
      params: input.params as any,
      cacheEnabled: input.cacheEnabled,
      cacheTtl: input.cacheTtl,
      creatorId,
      createBy: 'system',
      tenantId,
    },
  })
  logger.info({ id: record.id }, '创建数据集')
  return stripVO(record)
}

export async function update(id: number, input: UpdateDatasetInput) {
  const tenantId = getTenantId()
  await getById(id)

  // 若改动了 sql / datasourceId / cache 配置 / params -> 清理缓存
  const invalidating =
    input.sql !== undefined ||
    input.datasourceId !== undefined ||
    input.cacheEnabled !== undefined ||
    input.cacheTtl !== undefined ||
    input.params !== undefined

  const updated = await prisma.dataset.update({
    where: { id },
    data: { ...input, updateBy: 'system' } as any,
  })

  if (invalidating) {
    const n = invalidateDatasetCache(tenantId, id)
    logger.debug({ datasetId: id, clearedEntries: n }, '数据集更新, 清理缓存')
  }

  logger.info({ id }, '更新数据集')
  return stripVO(updated)
}

export async function remove(id: number) {
  const tenantId = getTenantId()
  await prismaTransaction(async (tx) => {
    const ds = await tx.dataset.findUnique({
      where: { id },
      include: { _count: { select: { charts: true } } },
    })
    if (!ds) throw BizException.notFound(ErrorCode.DATASET_NOT_FOUND)
    ensureTenantScope(ds)
    await ensureDataScope(ds)
    if (ds._count.charts > 0) {
      throw new BizException(ErrorCode.DATASET_HAS_CHARTS)
    }
    await tx.dataset.update({ where: { id }, data: { deleted: true } })
  })

  const n = invalidateDatasetCache(tenantId, id)
  logger.debug({ datasetId: id, clearedEntries: n }, '数据集删除, 清理缓存')
  logger.info({ id }, '删除数据集')
}

// ============================================================================
// SQL 执行
// ============================================================================

export async function previewSql(input: PreviewDatasetInput, userId: number) {
  const cfg = await datasourceService.getDsConfigForQuery(input.datasourceId)

  // P2: 应用参数化查询 (使用 ? 占位符 + values 数组)
  const paramValues = input.params || {}
  const { sql: paramSql, values: paramVals } = applyParamsToSql(input.sql, paramValues)

  const safeLimit = sanitizeLimit(input.limit)
  const sqlBody = paramSql.trim().replace(/;$/, '')
  const { sql, values } =
    safeLimit !== null
      ? { sql: `${sqlBody} LIMIT ?`, values: [...paramVals, safeLimit] }
      : { sql: sqlBody, values: paramVals.length > 0 ? paramVals : undefined }

  let rows: any[]
  try {
    rows = await executeQuery(cfg, sql, values, true)
  } catch (err: any) {
    logger.warn({ datasourceId: input.datasourceId, userId, err }, '数据集预览执行失败')
    throw new BizException(ErrorCode.DATASET_QUERY_FAILED, configErrorMsg(err))
  }

  const columns = rows.length > 0 ? Object.keys(rows[0]) : []
  return {
    columns,
    rows,
    rowCount: rows.length,
  }
}

/**
 * 执行数据集的保存 SQL — 带 LRU+TTL 缓存
 * P2 增强: 支持参数化查询 (params) + 字段配置应用 (fields)
 */
export async function execute(id: number, limit?: number, paramValues?: ParamValues) {
  const ds = await prisma.dataset.findUnique({
    where: { id },
    include: { datasource: true },
  })
  if (!ds) throw BizException.notFound(ErrorCode.DATASET_NOT_FOUND)
  if (ds.deleted) throw BizException.notFound(ErrorCode.DATASET_NOT_FOUND)
  ensureTenantScope(ds)
  await ensureDataScope(ds)

  // P2: 校验必填参数
  const paramDefs = Array.isArray(ds.params) ? (ds.params as ParamDef[]) : []
  validateParams(paramValues, paramDefs)

  const tenantId = getTenantId()
  // 缓存 key 包含参数值, 不同参数走不同缓存
  const cacheKey = `${buildDatasetCacheKey(tenantId, id, limit)}:${JSON.stringify(paramValues || {})}`

  // 启用缓存且无动态参数 -> 尝试命中
  const hasDynamicParams =
    paramDefs.length > 0 && paramValues && Object.keys(paramValues).length > 0
  if (ds.cacheEnabled && !hasDynamicParams) {
    const cached = datasetQueryCache.get(cacheKey)
    if (cached) {
      logger.debug({ datasetId: id, limit, cacheKey }, '数据集查询缓存命中')
      return cached
    }
  }

  const cfg = await datasourceService.getDsConfigForQuery(ds.datasourceId)

  // P2: 应用参数化查询 (使用 ? 占位符 + values 数组)
  const { sql: paramSql, values: paramVals } = applyParamsToSql(
    ds.sql,
    paramValues || {},
    paramDefs,
  )

  const safeLimit = sanitizeLimit(limit)
  const sqlBody = paramSql.trim().replace(/;$/, '')
  const { sql: finalSql, values } =
    safeLimit !== null
      ? { sql: `${sqlBody} LIMIT ?`, values: [...paramVals, safeLimit] }
      : { sql: sqlBody, values: paramVals.length > 0 ? paramVals : undefined }

  try {
    const rawRows = await executeQuery(cfg, finalSql, values, true)

    // P2: 应用字段配置 (别名/类型转换/计算字段)
    const fieldDefs = Array.isArray(ds.fields) ? (ds.fields as FieldDef[]) : undefined
    const { rows, columns } = applyFieldConfig(rawRows, fieldDefs)

    const result = { columns, rows, rowCount: rows.length }

    // 启用缓存且无动态参数 -> 回填
    if (ds.cacheEnabled && !hasDynamicParams) {
      const ttlMs = Math.max(0, ds.cacheTtl ?? 300) * 1000
      if (ttlMs > 0) {
        datasetQueryCache.set(cacheKey, result, ttlMs)
        logger.debug({ datasetId: id, limit, ttlMs, cacheKey }, '数据集查询缓存回填')
      }
    }

    return result
  } catch (err: any) {
    logger.warn({ datasetId: id, datasourceId: ds.datasourceId, err }, '数据集执行失败')
    throw new BizException(ErrorCode.DATASET_QUERY_FAILED, configErrorMsg(err))
  }
}

function sanitizeLimit(limit: unknown): number | null {
  if (limit === undefined || limit === null) return null
  const n = typeof limit === 'number' ? limit : parseInt(String(limit), 10)
  if (!Number.isFinite(n) || n <= 0) return null
  if (n > 10000) return 10000
  return Math.floor(n)
}

function configErrorMsg(err: any): string | undefined {
  return process.env.NODE_ENV === 'development' ? err.message : undefined
}

export const datasetService = {
  list,
  getById,
  create,
  update,
  remove,
  previewSql,
  execute,
}
