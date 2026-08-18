/**
 * 岗位管理模块 DTO (P2-4)
 */
import { z } from 'zod'

export const createPositionSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    code: z.string().min(1).max(100),
    sort: z.number().int().default(0),
    status: z.number().int().default(1),
    description: z.string().max(500).optional(),
  }),
})

export const updatePositionSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    code: z.string().min(1).max(100).optional(),
    sort: z.number().int().optional(),
    status: z.number().int().optional(),
    description: z.string().max(500).optional(),
  }),
})

export type CreatePositionInput = z.infer<typeof createPositionSchema>['body']
export type UpdatePositionInput = z.infer<typeof updatePositionSchema>['body']
