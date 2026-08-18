/**
 * ============================================================================
 * 数据集模块 DTO
 * P2 增强: 添加参数化查询 (params) + 字段配置 (fields 增强)
 * ============================================================================
 */

import { z } from 'zod'
import { paginationSchema, idParamSchema } from '../../middleware/validate'

/** 参数定义 (参数化查询) */
export const paramDefSchema = z.object({
  name: z.string().min(1).max(50),
  label: z.string().max(100).optional(),
  type: z.enum(['string', 'number', 'date', 'datetime', 'boolean']),
  defaultValue: z.any().optional(),
  required: z.boolean().optional().default(false),
})

/** 字段配置 (别名/类型/计算字段) */
export const fieldDefSchema = z.object({
  name: z.string().min(1).max(100),
  alias: z.string().max(100).optional(),
  type: z.enum(['string', 'number', 'date', 'datetime', 'boolean']).optional(),
  visible: z.boolean().optional().default(true),
  computed: z.boolean().optional().default(false),
  expression: z.string().optional(),
  format: z.string().optional(),
})

export const listDatasetSchema = paginationSchema.extend({
  query: paginationSchema.shape.query.extend({
    datasourceId: z.coerce.number().int().positive().optional(),
  }),
})

export const createDatasetSchema = z.object({
  body: z.object({
    name: z.string().min(1, '名称不能为空').max(100),
    description: z.string().max(500).optional(),
    datasourceId: z.coerce.number().int().positive('数据源 ID 无效'),
    sql: z.string().min(1, 'SQL 不能为空'),
    fields: z.array(fieldDefSchema).optional(),
    params: z.array(paramDefSchema).optional(),
    cacheEnabled: z.coerce.boolean().optional(),
    cacheTtl: z.coerce.number().int().min(0).optional(),
  }),
})

export const updateDatasetSchema = idParamSchema.extend({
  body: z
    .object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      datasourceId: z.coerce.number().int().positive().optional(),
      sql: z.string().min(1).optional(),
      fields: z.array(fieldDefSchema).optional(),
      params: z.array(paramDefSchema).optional(),
      cacheEnabled: z.coerce.boolean().optional(),
      cacheTtl: z.coerce.number().int().min(0).optional(),
    })
    .refine((d) => Object.keys(d).length > 0, '至少提供一个字段'),
})

export const previewDatasetSchema = z.object({
  body: z.object({
    sql: z.string().min(1, 'SQL 不能为空'),
    datasourceId: z.coerce.number().int().positive(),
    limit: z.coerce.number().int().min(1).max(500).optional().default(100),
    params: z.record(z.string(), z.any()).optional(),
  }),
})

export const executeDatasetSchema = idParamSchema.extend({
  body: z
    .object({
      limit: z.coerce.number().int().min(0).max(1000000).optional(),
      params: z.record(z.string(), z.any()).optional(),
    })
    .optional(),
})

export type CreateDatasetInput = z.infer<typeof createDatasetSchema>['body']
export type UpdateDatasetInput = z.infer<typeof updateDatasetSchema>['body']
export type PreviewDatasetInput = z.infer<typeof previewDatasetSchema>['body']
export type ParamDef = z.infer<typeof paramDefSchema>
export type FieldDef = z.infer<typeof fieldDefSchema>
