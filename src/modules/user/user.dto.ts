/**
 * 用户模块 DTO
 */
import { z } from 'zod';
import { paginationSchema, idParamSchema } from '../../middleware/validate';

export const listUserSchema = paginationSchema.extend({
  query: paginationSchema.shape.query.extend({
    roleId: z.coerce.number().int().positive().optional(),
    status: z.coerce.number().int().min(0).max(1).optional(),
  }),
});

export const createUserSchema = z.object({
  body: z.object({
    username: z.string().min(2).max(50),
    password: z.string().min(6).max(50),
    email: z.string().email().optional(),
    phone: z.string().max(20).optional(),
    nickname: z.string().max(50).optional(),
    avatar: z.string().max(500).optional(),
    roleId: z.coerce.number().int().positive().optional().default(2),
    status: z.coerce.number().int().min(0).max(1).optional().default(1),
  }),
});

export const updateUserSchema = idParamSchema.extend({
  body: z
    .object({
      email: z.string().email().nullable().optional(),
      phone: z.string().max(20).nullable().optional(),
      nickname: z.string().max(50).nullable().optional(),
      avatar: z.string().max(500).nullable().optional(),
      roleId: z.coerce.number().int().positive().optional(),
      status: z.coerce.number().int().min(0).max(1).optional(),
    })
    .refine((d) => Object.keys(d).length > 0, '至少提供一个字段'),
});

export const changeRoleSchema = idParamSchema.extend({
  body: z.object({
    roleId: z.coerce.number().int().positive('角色 ID 无效'),
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
