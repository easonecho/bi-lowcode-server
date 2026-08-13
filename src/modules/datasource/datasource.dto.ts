/**
 * ============================================================================
 * BI 低代码平台 - 数据源模块 DTO (zod schema 定义)
 * ============================================================================
 * 定义数据源 CRUD 接口的请求参数校验规则
 * ============================================================================
 */

import { z } from 'zod';
import { paginationSchema, idParamSchema } from '../../middleware/validate';

/**
 * 列表查询 schema
 * Query: { page, pageSize, keyword?, type? }
 */
export const listDatasourceSchema = paginationSchema.extend({
  query: paginationSchema.shape.query.extend({
    type: z.enum(['mysql', 'postgresql', 'mongodb']).optional(),
  }),
});

/**
 * 创建数据源 schema
 * Body: { name, type, host, port, username, password, database, description? }
 */
export const createDatasourceSchema = z.object({
  body: z.object({
    name: z.string().min(1, '名称不能为空').max(100, '名称最多 100 字符'),
    type: z.enum(['mysql', 'postgresql', 'mongodb'], {
      required_error: '请选择数据源类型',
    }),
    host: z.string().min(1, '主机地址不能为空').max(255, '主机地址过长'),
    port: z.coerce.number().int().min(1, '端口最小 1').max(65535, '端口最大 65535'),
    username: z.string().min(1, '用户名不能为空').max(100, '用户名过长'),
    password: z.string().min(1, '密码不能为空').max(255, '密码过长'),
    database: z.string().min(1, '数据库名不能为空').max(100, '数据库名过长'),
    description: z.string().max(500, '描述最多 500 字符').optional(),
    options: z.record(z.unknown()).optional(),
  }),
});

/**
 * 更新数据源 schema
 * Body: 所有字段可选
 */
export const updateDatasourceSchema = idParamSchema.extend({
  body: z
    .object({
      name: z.string().min(1).max(100).optional(),
      host: z.string().min(1).max(255).optional(),
      port: z.coerce.number().int().min(1).max(65535).optional(),
      username: z.string().min(1).max(100).optional(),
      password: z.string().min(1).max(255).optional(),
      database: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      status: z.coerce.number().int().min(0).max(1).optional(),
      options: z.record(z.unknown()).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: '至少提供一个字段用于更新',
    }),
});

/** 请求体类型 */
export type CreateDatasourceInput = z.infer<typeof createDatasourceSchema>['body'];
export type UpdateDatasourceInput = z.infer<typeof updateDatasourceSchema>['body'];
