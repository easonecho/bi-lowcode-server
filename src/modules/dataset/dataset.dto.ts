/**
 * ============================================================================
 * 数据集模块 DTO
 * ============================================================================
 */

import { z } from 'zod';
import { paginationSchema, idParamSchema } from '../../middleware/validate';

export const listDatasetSchema = paginationSchema.extend({
  query: paginationSchema.shape.query.extend({
    datasourceId: z.coerce.number().int().positive().optional(),
  }),
});

export const createDatasetSchema = z.object({
  body: z.object({
    name: z.string().min(1, '名称不能为空').max(100),
    description: z.string().max(500).optional(),
    datasourceId: z.coerce.number().int().positive('数据源 ID 无效'),
    sql: z.string().min(1, 'SQL 不能为空'),
    fields: z.array(z.unknown()).optional(),
    cacheEnabled: z.coerce.boolean().optional(),
    cacheTtl: z.coerce.number().int().min(0).optional(),
  }),
});

export const updateDatasetSchema = idParamSchema.extend({
  body: z
    .object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      datasourceId: z.coerce.number().int().positive().optional(),
      sql: z.string().min(1).optional(),
      fields: z.array(z.unknown()).optional(),
      cacheEnabled: z.coerce.boolean().optional(),
      cacheTtl: z.coerce.number().int().min(0).optional(),
    })
    .refine((d) => Object.keys(d).length > 0, '至少提供一个字段'),
});

export const previewDatasetSchema = z.object({
  body: z.object({
    sql: z.string().min(1, 'SQL 不能为空'),
    datasourceId: z.coerce.number().int().positive(),
    limit: z.coerce.number().int().min(1).max(500).optional().default(100),
  }),
});

export const executeDatasetSchema = idParamSchema.extend({
  body: z.object({
    limit: z.coerce.number().int().min(1).max(10000).optional().default(1000),
  }).optional(),
});

export type CreateDatasetInput = z.infer<typeof createDatasetSchema>['body'];
export type UpdateDatasetInput = z.infer<typeof updateDatasetSchema>['body'];
export type PreviewDatasetInput = z.infer<typeof previewDatasetSchema>['body'];
