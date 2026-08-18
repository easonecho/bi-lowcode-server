/**
 * 定时任务模块 DTO (P2-4)
 */
import { z } from 'zod'

export const createScheduledTaskSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    cron: z.string().min(1).max(50),
    handler: z.string().min(1).max(200),
    params: z.record(z.any()).optional(),
    status: z.number().int().default(1),
    description: z.string().max(500).optional(),
  }),
})

export const updateScheduledTaskSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    cron: z.string().min(1).max(50).optional(),
    handler: z.string().min(1).max(200).optional(),
    params: z.record(z.any()).optional(),
    status: z.number().int().optional(),
    description: z.string().max(500).optional(),
  }),
})

export type CreateScheduledTaskInput = z.infer<typeof createScheduledTaskSchema>['body']
export type UpdateScheduledTaskInput = z.infer<typeof updateScheduledTaskSchema>['body']
