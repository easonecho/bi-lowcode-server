/**
 * 数据字典模块 DTO
 */
import { z } from 'zod'

export const createDictSchema = z.object({
  type: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  description: z.string().max(200).optional(),
  status: z.number().int().default(1),
})

export const updateDictSchema = createDictSchema.partial()

export const createDictItemSchema = z.object({
  dictId: z.number().int(),
  label: z.string().min(1).max(100),
  value: z.string().min(1).max(100),
  sort: z.number().int().default(0),
  status: z.number().int().default(1),
})

export const updateDictItemSchema = createDictItemSchema.partial()

export type CreateDictInput = z.infer<typeof createDictSchema>
export type UpdateDictInput = z.infer<typeof updateDictSchema>
export type CreateDictItemInput = z.infer<typeof createDictItemSchema>
export type UpdateDictItemInput = z.infer<typeof updateDictItemSchema>
