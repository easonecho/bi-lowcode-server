/**
 * 系统配置模块 DTO (P2-4)
 */
import { z } from 'zod'

export const createSystemConfigSchema = z.object({
  body: z.object({
    configKey: z.string().min(1).max(100),
    configName: z.string().min(1).max(100),
    configValue: z.string().optional().nullable(),
    configType: z.enum(['string', 'number', 'boolean', 'json']).default('string'),
    description: z.string().max(500).optional(),
    sort: z.number().int().default(0),
  }),
})

export const updateSystemConfigSchema = z.object({
  body: z.object({
    configKey: z.string().min(1).max(100).optional(),
    configName: z.string().min(1).max(100).optional(),
    configValue: z.string().optional().nullable(),
    configType: z.enum(['string', 'number', 'boolean', 'json']).optional(),
    description: z.string().max(500).optional(),
    sort: z.number().int().optional(),
  }),
})

export type CreateSystemConfigInput = z.infer<typeof createSystemConfigSchema>['body']
export type UpdateSystemConfigInput = z.infer<typeof updateSystemConfigSchema>['body']
