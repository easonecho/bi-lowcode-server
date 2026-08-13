/**
 * 图表模块 DTO
 */
import { z } from 'zod';
import { paginationSchema, idParamSchema } from '../../middleware/validate';

const CHART_TYPES = ['bar', 'line', 'pie', 'scatter', 'table', 'gauge', 'number', 'indicator', 'progress', 'rect', 'image', 'text'] as const;

export const listChartSchema = paginationSchema.extend({
  query: paginationSchema.shape.query.extend({
    datasetId: z.coerce.number().int().positive().optional(),
    dashboardId: z.coerce.number().int().positive().optional(),
    type: z.enum(CHART_TYPES).optional(),
  }),
});

export const createChartSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    type: z.enum(CHART_TYPES),
    description: z.string().max(500).optional(),
    config: z.record(z.unknown()).default({}),
    datasetId: z.coerce.number().int().positive(),
    dashboardId: z.coerce.number().int().positive().optional(),
    position: z.record(z.unknown()).optional(),
  }),
});

export const updateChartSchema = idParamSchema.extend({
  body: z
    .object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).nullable().optional(),
      config: z.record(z.unknown()).optional(),
      datasetId: z.coerce.number().int().positive().optional(),
      dashboardId: z.coerce.number().int().positive().nullable().optional(),
      position: z.record(z.unknown()).nullable().optional(),
    })
    .refine((d) => Object.keys(d).length > 0, '至少提供一个字段'),
});

export type CreateChartInput = z.infer<typeof createChartSchema>['body'];
export type UpdateChartInput = z.infer<typeof updateChartSchema>['body'];
