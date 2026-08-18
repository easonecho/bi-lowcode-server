/**
 * 仪表板分组模块 DTO (P2-3)
 */
import { z } from 'zod'
import { idParamSchema } from '../../middleware/validate'

export const createDashboardGroupSchema = z.object({
  body: z.object({
    name: z.string().min(1, '名称不能为空').max(100),
    description: z.string().max(500).optional(),
    sort: z.number().int().optional().default(0),
  }),
})

export const updateDashboardGroupSchema = idParamSchema.extend({
  body: z
    .object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).nullable().optional(),
      sort: z.number().int().optional(),
    })
    .refine((d) => Object.keys(d).length > 0, '至少提供一个字段'),
})

export type CreateDashboardGroupInput = z.infer<typeof createDashboardGroupSchema>['body']
export type UpdateDashboardGroupInput = z.infer<typeof updateDashboardGroupSchema>['body']
