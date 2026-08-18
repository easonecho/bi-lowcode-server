/**
 * 操作日志模块 DTO
 */
import { z } from 'zod'

export const listLogSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  module: z.string().optional(),
  action: z.string().optional(),
  username: z.string().optional(),
  status: z.coerce.number().int().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
})

export type ListLogQuery = z.infer<typeof listLogSchema>
