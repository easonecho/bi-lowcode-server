/**
 * 角色模块 DTO
 */
import { z } from 'zod'
import { paginationSchema, idParamSchema } from '../../middleware/validate'

const DS_TYPES = ['all', 'oneself', 'subordinate', 'custom'] as const

export const listRoleSchema = paginationSchema.extend({
  query: paginationSchema.shape.query.extend({
    keyword: z.string().max(100).optional(),
    dsType: z.enum(DS_TYPES).optional(),
  }),
})

export const createRoleSchema = z.object({
  body: z.object({
    name: z.string().min(1, '名称不能为空').max(50),
    code: z.string().min(1, '编码不能为空').max(50),
    description: z.string().max(200).optional(),
    permissions: z.array(z.string()).optional(),
    dsType: z.enum(DS_TYPES).optional().default('all'),
  }),
})

export const updateRoleSchema = idParamSchema.extend({
  body: z
    .object({
      name: z.string().min(1).max(50).optional(),
      description: z.string().max(200).nullable().optional(),
      permissions: z.array(z.string()).nullable().optional(),
      dsType: z.enum(DS_TYPES).optional(),
    })
    .refine((d) => Object.keys(d).length > 0, '至少提供一个字段'),
})

export type CreateRoleInput = z.infer<typeof createRoleSchema>['body']
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>['body']
