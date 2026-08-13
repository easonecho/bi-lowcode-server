/**
 * 数据导出模块 DTO
 */
import { z } from 'zod';
import { idParamSchema } from '../../middleware/validate';

export const exportDatasetSchema = idParamSchema.extend({
  body: z
    .object({
      limit: z.coerce.number().int().min(1).max(100000).optional().default(50000),
      filename: z.string().max(255).optional(),
    })
    .optional(),
});

export const exportChartSchema = idParamSchema.extend({
  body: z
    .object({
      limit: z.coerce.number().int().min(1).max(50000).optional().default(10000),
      filename: z.string().max(255).optional(),
    })
    .optional(),
});
