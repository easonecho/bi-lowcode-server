/**
 * ============================================================================
 * BI 低代码平台 - 请求参数校验中间件
 * ============================================================================
 * 使用 zod 进行请求参数校验, 消除手写 if 判断和 as any
 * 参考 jvs-demo-mgr 中提到的 BeanValidator 思想
 *
 * 用法:
 *   const loginSchema = z.object({ body: z.object({ username: z.string().min(1) }) })
 *   router.post('/login', validate(loginSchema), authController.login)
 * ============================================================================
 */

import { Context, Next } from 'koa'
import { ZodSchema, z } from 'zod'
import { BizException } from '../utils/biz-error'

/**
 * 校验请求参数
 * 支持 body / query / params 三个位置
 */
export function validate(schema: ZodSchema) {
  return async (ctx: Context, next: Next): Promise<void> => {
    const input = {
      body: ctx.request.body,
      query: ctx.query,
      params: ctx.params,
    }

    const result = schema.safeParse(input)

    if (!result.success) {
      // 提取第一个错误信息
      const firstError = result.error.issues[0]
      const message = firstError
        ? `${firstError.path.join('.')}: ${firstError.message}`
        : '参数校验失败'

      throw BizException.paramError(message)
    }

    // 将校验后的数据写回 ctx (zod 会做类型转换和默认值填充)
    if (result.data.body) ctx.request.body = result.data.body
    if (result.data.query) {
      ctx.state.validatedQuery = result.data.query // 保存原始校验结果 (boolean/number 不被 Koa sp.stringify 丢失)
      ctx.query = result.data.query
    }
    if (result.data.params) ctx.params = result.data.params

    await next()
  }
}

/**
 * 构建分页查询 schema (复用)
 */
export const paginationSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
    keyword: z.string().optional(),
  }),
})

/**
 * ID 参数 schema (复用)
 */
export const idParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
})
