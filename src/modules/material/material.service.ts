/**
 * ============================================================================
 * 素材管理模块 Service
 * 视频/图片/装饰边框等大屏素材的上传、列表、删除、下载
 * ============================================================================
 */
import path from 'path'
import fs from 'fs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/** 素材存储根目录 (项目根 / uploads) */
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads')

/** 素材访问基址 (拼接完整 URL, 避免 /uploads 相对路径在前端 dev server 无法加载) */
const ASSET_BASE_URL = (process.env.ASSET_BASE_URL ?? '').replace(/\/$/, '')

/**
 * 🔑 将 Material 的 url/thumbnail 拼成完整 URL 返回给前端.
 * 数据库存储相对路径 (/uploads/xxx.mp4), 返回时拼 ASSET_BASE_URL 前缀,
 * 这样前端 <img>/<video> 标签可直接加载, 不依赖 vite proxy 代理 /uploads.
 */
function toDTO(m: any) {
  if (!m) return m
  const out = { ...m }
  if (out.url && typeof out.url === 'string' && out.url.startsWith('/')) {
    out.url = ASSET_BASE_URL ? ASSET_BASE_URL + out.url : out.url
  }
  if (out.thumbnail && typeof out.thumbnail === 'string' && out.thumbnail.startsWith('/')) {
    out.thumbnail = ASSET_BASE_URL ? ASSET_BASE_URL + out.thumbnail : out.thumbnail
  }
  return out
}

/** 确保上传目录存在 */
function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  }
}

/** 根据 MIME 推断素材分类 */
function inferType(mimeType: string, originalName: string): string {
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('image/')) return 'image'
  // SVG 视为装饰素材 (边框/角标等矢量装饰)
  if (mimeType.includes('svg') || originalName.toLowerCase().endsWith('.svg')) return 'decor'
  return 'decor'
}

/** 生成唯一文件名: 时间戳-随机串.扩展名 */
function genFileName(originalName: string): string {
  const ext = path.extname(originalName)
  const ts = Date.now()
  const rand = Math.random().toString(36).slice(2, 8)
  return `${ts}-${rand}${ext}`
}

export const materialService = {
  /** 分页列表 (支持 type 筛选 + 关键词搜索) */
  async list(query: { page?: string; pageSize?: string; type?: string; keyword?: string }) {
    const page = Math.max(1, parseInt(query.page || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '20', 10)))
    const where: any = { deleted: false }
    if (query.type && ['video', 'image', 'decor'].includes(query.type)) {
      where.type = query.type
    }
    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword } },
        { originalName: { contains: query.keyword } },
      ]
    }
    const [list, total] = await Promise.all([
      prisma.material.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.material.count({ where }),
    ])
    return { list: list.map(toDTO), total, page, pageSize }
  },

  /** 详情 */
  async getById(id: number) {
    const material = await prisma.material.findFirst({
      where: { id, deleted: false },
    })
    if (!material) {
      const e: any = new Error('素材不存在')
      e.status = 404
      throw e
    }
    return toDTO(material)
  },

  /** 创建 (上传文件后调用) */
  async create(
    file: any,
    userId: number,
    username: string,
    opts: { name?: string; type?: string; description?: string },
  ) {
    ensureUploadDir()
    const fileName = genFileName(file.originalname)
    const targetPath = path.join(UPLOAD_DIR, fileName)
    // koa-multer 用 dest 时 file.path 已是最终路径; 用 memoryStorage 时 file.buffer 需写入
    if (file.buffer) {
      fs.writeFileSync(targetPath, file.buffer)
    } else if (file.path && fs.existsSync(file.path)) {
      // dest 模式: 文件已在临时目录, 移动到目标
      const tmp = file.path
      fs.renameSync(tmp, targetPath)
    }
    const mimeType = file.mimetype || 'application/octet-stream'
    const type = opts.type || inferType(mimeType, file.originalname)
    const url = `/uploads/${fileName}`
    // 图片素材: 缩略图 = 自身 url; 其他暂无缩略图
    const thumbnail = type === 'image' ? url : null

    const material = await prisma.material.create({
      data: {
        name: opts.name || file.originalname,
        type,
        fileName,
        originalName: file.originalname,
        mimeType,
        size: file.size || 0,
        url,
        thumbnail,
        description: opts.description || null,
        creatorId: userId,
        tenantId: 1,
        createBy: username,
      },
    })
    return toDTO(material)
  },

  /** 逻辑删除 + 物理删除文件 */
  async remove(id: number) {
    const material = await prisma.material.findFirst({ where: { id, deleted: false } })
    if (!material) {
      const e: any = new Error('素材不存在')
      e.status = 404
      throw e
    }
    // 逻辑删除记录
    await prisma.material.update({
      where: { id },
      data: { deleted: true },
    })
    // 物理删除文件
    const filePath = path.join(UPLOAD_DIR, material.fileName)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    return true
  },

  /** 下载: 返回文件绝对路径 */
  async getFilePath(
    id: number,
  ): Promise<{ filePath: string; originalName: string; mimeType: string }> {
    const material = await prisma.material.findFirst({ where: { id, deleted: false } })
    if (!material) {
      const e: any = new Error('素材不存在')
      e.status = 404
      throw e
    }
    const filePath = path.join(UPLOAD_DIR, material.fileName)
    if (!fs.existsSync(filePath)) {
      const e: any = new Error('素材文件已丢失')
      e.status = 404
      throw e
    }
    return { filePath, originalName: material.originalName, mimeType: material.mimeType }
  },
}
