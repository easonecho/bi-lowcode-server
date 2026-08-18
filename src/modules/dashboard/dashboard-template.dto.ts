/**
 * 仪表板模板模块 DTO (P2-3)
 */
import { z } from 'zod'
import { idParamSchema } from '../../middleware/validate'

export const createDashboardTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1, '名称不能为空').max(100),
    description: z.string().max(500).optional(),
    layout: z.record(z.unknown()).optional(),
    thumbnail: z.string().max(500).optional(),
    category: z.string().max(50).optional(),
    isPublic: z.coerce.boolean().optional().default(true),
  }),
})

export const updateDashboardTemplateSchema = idParamSchema.extend({
  body: z
    .object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).nullable().optional(),
      layout: z.record(z.unknown()).nullable().optional(),
      thumbnail: z.string().max(500).nullable().optional(),
      category: z.string().max(50).nullable().optional(),
      isPublic: z.coerce.boolean().optional(),
    })
    .refine((d) => Object.keys(d).length > 0, '至少提供一个字段'),
})

/** 从已有仪表板保存为模板 (参数名为 dashboardId, 与路由 :dashboardId 对应) */
export const saveAsTemplateSchema = z.object({
  params: z.object({
    dashboardId: z.coerce.number().int().positive(),
  }),
  body: z.object({
    name: z.string().min(1, '模板名称不能为空').max(100),
    description: z.string().max(500).optional(),
    thumbnail: z.string().max(500).optional(),
    category: z.string().max(50).optional(),
    isPublic: z.coerce.boolean().optional().default(true),
  }),
})

/** 从模板创建新仪表板 */
export const applyTemplateSchema = idParamSchema.extend({
  body: z.object({
    name: z.string().min(1, '仪表板名称不能为空').max(100),
    description: z.string().max(500).optional(),
    isPublic: z.coerce.boolean().optional().default(false),
  }),
})

export type CreateDashboardTemplateInput = z.infer<typeof createDashboardTemplateSchema>['body']
export type UpdateDashboardTemplateInput = z.infer<typeof updateDashboardTemplateSchema>['body']
export type SaveAsTemplateInput = z.infer<typeof saveAsTemplateSchema>['body']
export type ApplyTemplateInput = z.infer<typeof applyTemplateSchema>['body']
