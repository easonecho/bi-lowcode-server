/**
 * 看板分享模块 DTO
 */
import { z } from 'zod'
import { idParamSchema } from '../../middleware/validate'

export const createShareSchema = idParamSchema.extend({
  body: z.object({
    password: z.string().min(1).max(100).optional(),
    expiresInHours: z.coerce
      .number()
      .int()
      .min(1)
      .max(24 * 365)
      .optional(),
  }),
})

export const verifyShareSchema = z.object({
  params: z.object({
    token: z.string().min(1).max(64),
  }),
  body: z.object({
    password: z.string().min(1).max(100).optional(),
  }),
})

export const publicShareSchema = z.object({
  params: z.object({
    token: z.string().min(1).max(64),
  }),
})
