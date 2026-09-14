/**
 * ============================================================================
 * 素材管理模块 Routes
 * ============================================================================
 */
import Router from '@koa/router'
// @ts-ignore: @koa/multer 没有类型声明, 运行时正常
import multer from '@koa/multer'
import { ResponseUtil } from '../../utils/response'
import { JwtPayload } from '../../utils/jwt'
import { requirePermission } from '../../middleware/role'
import fs from 'fs'
import { materialService } from './material.service'

const router = new Router({ prefix: '/api/materials' })

// 内存存储: file.buffer (不落盘临时文件, service 层写入最终位置)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB (视频文件较大)
})

/** GET /api/materials 分页列表 */
router.get('/', requirePermission('material:view'), async (ctx) => {
  const r = await materialService.list(ctx.query as any)
  ctx.body = ResponseUtil.paginate(r.list, r.total, r.page, r.pageSize)
})

/** GET /api/materials/:id 详情 */
router.get('/:id', requirePermission('material:view'), async (ctx) => {
  const id = parseInt(ctx.params.id, 10)
  if (isNaN(id)) {
    ctx.status = 400
    ctx.body = ResponseUtil.error('无效的素材 ID', 400)
    return
  }
  ctx.body = ResponseUtil.success(await materialService.getById(id))
})

/** POST /api/materials/upload 上传素材 (multipart/form-data) */
router.post('/upload', requirePermission('material:upload'), upload.single('file'), async (ctx) => {
  const { userId, username } = ctx.state.user as JwtPayload
  if (!ctx.file) {
    ctx.status = 400
    ctx.body = ResponseUtil.error('未上传文件', 400)
    return
  }
  const { name, type, description } = (ctx.request.body || {}) as any
  const material = await materialService.create(ctx.file, userId, username, {
    name,
    type,
    description,
  })
  ctx.body = ResponseUtil.success(material, '上传成功')
})

/** DELETE /api/materials/:id 删除素材 */
router.delete('/:id', requirePermission('material:delete'), async (ctx) => {
  const id = parseInt(ctx.params.id, 10)
  if (isNaN(id)) {
    ctx.status = 400
    ctx.body = ResponseUtil.error('无效的素材 ID', 400)
    return
  }
  await materialService.remove(id)
  ctx.body = ResponseUtil.success(null, '删除成功')
})

/** GET /api/materials/:id/download 下载素材文件 */
router.get('/:id/download', requirePermission('material:view'), async (ctx) => {
  const id = parseInt(ctx.params.id, 10)
  if (isNaN(id)) {
    ctx.status = 400
    ctx.body = ResponseUtil.error('无效的素材 ID', 400)
    return
  }
  const info = await materialService.getFilePath(id)
  const stream = fs.createReadStream(info.filePath)
  ctx.set('Content-Type', info.mimeType)
  ctx.set('Content-Disposition', `attachment; filename="${encodeURIComponent(info.originalName)}"`)
  ctx.body = stream
})

export default router
