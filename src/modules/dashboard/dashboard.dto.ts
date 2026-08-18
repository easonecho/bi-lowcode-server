/**
 * 仪表板模块 DTO
 */
import { z } from 'zod'
import { paginationSchema, idParamSchema } from '../../middleware/validate'

export const listDashboardSchema = paginationSchema.extend({
  query: paginationSchema.shape.query.extend({
    status: z.coerce.number().int().min(0).max(1).optional(),
    isPublic: z.coerce.boolean().optional(),
    onlyFavorites: z.coerce.boolean().optional(),
    groupId: z.coerce.number().int().optional(), // P2-3: 按分组筛选
    ungrouped: z.coerce.boolean().optional(), // P2-3: 仅未分组
  }),
})

export const createDashboardSchema = z.object({
  body: z.object({
    name: z.string().min(1, '名称不能为空').max(100),
    description: z.string().max(500).optional(),
    layout: z.record(z.unknown()).optional(),
    isPublic: z.coerce.boolean().optional().default(false),
    groupId: z.number().int().nullable().optional(), // P2-3: 创建时指定分组
  }),
})

export const updateDashboardSchema = idParamSchema.extend({
  body: z
    .object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).nullable().optional(),
      layout: z.record(z.unknown()).nullable().optional(),
      status: z.coerce.number().int().min(0).max(1).optional(),
      isPublic: z.coerce.boolean().optional(),
      groupId: z.number().int().nullable().optional(), // P2-3: 移动到分组 (null=移出分组)
    })
    .refine((d) => Object.keys(d).length > 0, '至少提供一个字段'),
})

export type CreateDashboardInput = z.infer<typeof createDashboardSchema>['body']
export type UpdateDashboardInput = z.infer<typeof updateDashboardSchema>['body']
