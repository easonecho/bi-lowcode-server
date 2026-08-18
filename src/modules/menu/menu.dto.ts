/**
 * 菜单模块 DTO
 */
import { z } from 'zod'

export const listMenuSchema = z.object({
  query: z.object({
    keyword: z.string().optional(),
    status: z.union([z.string(), z.number()]).optional(),
  }),
})

export const createMenuSchema = z.object({
  body: z.object({
    name: z.string().min(1, '菜单名称不能为空').max(50),
    parentId: z.number().int().min(0).default(0),
    orderNum: z.number().int().min(0).default(0),
    path: z.string().max(200).optional().nullable(),
    component: z.string().max(255).optional().nullable(),
    query: z.string().max(255).optional().nullable(),
    isFrame: z.boolean().default(false),
    isCache: z.boolean().default(true),
    menuType: z.enum(['M', 'C', 'F']).default('C'),
    visible: z.boolean().default(true),
    status: z.number().int().default(1),
    perms: z.string().max(100).optional().nullable(),
    icon: z.string().max(100).default('#'),
  }),
})

export const updateMenuSchema = z.object({
  body: createMenuSchema.shape.body.partial(),
})

export type CreateMenuInput = z.infer<typeof createMenuSchema>['body']
export type UpdateMenuInput = z.infer<typeof updateMenuSchema>['body']
