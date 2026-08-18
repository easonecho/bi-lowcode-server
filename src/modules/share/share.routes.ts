/**
 * 看板分享模块 Routes
 * - 已登录用户: 管理分享配置 (GET/POST/DELETE /api/dashboards/:id/share)
 * - 公开访问: GET/POST /api/public/dashboards/:token (无需登录)
 */
import Router from '@koa/router'
import { ResponseUtil } from '../../utils/response'
import { validate, idParamSchema } from '../../middleware/validate'
import { requirePermission } from '../../middleware/role'
import { createShareSchema, publicShareSchema, verifyShareSchema } from './share.dto'
import { shareService } from './share.service'

const router = new Router()

// ========== 已登录: 看板分享配置管理 ==========

router.get(
  '/api/dashboards/:id/share',
  requirePermission('dashboard:view'),
  validate(idParamSchema),
  async (ctx) => {
    ctx.body = ResponseUtil.success(await shareService.getShareConfig(ctx.params.id as any))
  },
)

router.post(
  '/api/dashboards/:id/share',
  requirePermission('dashboard:edit'),
  validate(createShareSchema),
  async (ctx) => {
    ctx.body = ResponseUtil.success(
      await shareService.createShare(ctx.params.id as any, ctx.request.body as any),
      '分享链接已生成',
    )
  },
)

router.delete(
  '/api/dashboards/:id/share',
  requirePermission('dashboard:edit'),
  validate(idParamSchema),
  async (ctx) => {
    await shareService.revokeShare(ctx.params.id as any)
    ctx.body = ResponseUtil.success(null, '已取消分享')
  },
)

// ========== 公开访问 (无需登录) ==========

router.get('/api/public/dashboards/:token', validate(publicShareSchema), async (ctx) => {
  try {
    ctx.body = ResponseUtil.success(
      await shareService.getPublicDashboard(ctx.params.token as string),
    )
  } catch (e: any) {
    if (e?.statusCode === 400 && e?.code === 50005) {
      ctx.status = 200
      ctx.body = { code: 0, message: 'success', data: { passwordRequired: true } }
      return
    }
    throw e
  }
})

router.post('/api/public/dashboards/:token', validate(verifyShareSchema), async (ctx) => {
  const body = ctx.request.body as { password?: string }
  ctx.body = ResponseUtil.success(
    await shareService.getPublicDashboard(ctx.params.token as string, body?.password),
  )
})

export default router
