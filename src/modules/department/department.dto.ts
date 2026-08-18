/**
 * 部门模块 DTO
 */
import { z } from 'zod'
import { paginationSchema, idParamSchema } from '../../middleware/validate'

export const listDepartmentSchema = paginationSchema.extend({
  query: paginationSchema.shape.query.extend({
    keyword: z.string().max(100).optional(),
    parentId: z.coerce.number().int().min(0).optional(),
    status: z.coerce.number().int().min(0).max(1).optional(),
  }),
})

export const createDepartmentSchema = z.object({
  body: z.object({
    name: z.string().min(1, '部门名称不能为空').max(100),
    code: z.string().max(50).optional(),
    parentId: z.coerce.number().int().positive().optional(),
    sort: z.coerce.number().int().optional().default(0),
    leaderId: z.coerce.number().int().positive().optional(),
    status: z.coerce.number().int().min(0).max(1).optional().default(1),
  }),
})

export const updateDepartmentSchema = idParamSchema.extend({
  body: z
    .object({
      name: z.string().min(1).max(100).optional(),
      code: z.string().max(50).nullable().optional(),
      parentId: z.coerce.number().int().positive().nullable().optional(),
      sort: z.coerce.number().int().optional(),
      leaderId: z.coerce.number().int().positive().nullable().optional(),
      status: z.coerce.number().int().min(0).max(1).optional(),
    })
    .refine((d) => Object.keys(d).length > 0, '至少提供一个字段'),
})

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>['body']
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>['body']
