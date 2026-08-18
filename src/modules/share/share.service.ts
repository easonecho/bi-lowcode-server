/**
 * 看板分享模块 Service
 * - 生成/取消公开分享链接 (含可选密码 + 可选有效期)
 * - 公开访问通过 token + 密码验证
 */
import { prisma } from '../../config/prisma'
import { BizException } from '../../utils/biz-error'
import { ErrorCode } from '../../constants/error-code'
import { ensureTenantScope } from '../../utils/request-context'
import { ensureDataScope } from '../../utils/data-scope'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const SHARE_TOKEN_BYTES = 24

function generateShareToken(): string {
  return `dash_${crypto.randomBytes(SHARE_TOKEN_BYTES).toString('hex')}`
}

/** 获取看板的分享配置 */
export async function getShareConfig(dashboardId: number) {
  const d = await prisma.dashboard.findUnique({ where: { id: dashboardId } })
  if (!d) throw BizException.notFound(ErrorCode.DASHBOARD_NOT_FOUND)
  ensureTenantScope(d)
  await ensureDataScope(d)

  return {
    shareToken: d.shareToken,
    shareUrl: d.shareToken ? `/share/${d.shareToken}` : null,
    hasPassword: !!d.sharePassword,
    expiresAt: d.shareExpiresAt,
    isShared: !!d.shareToken,
  }
}

/** 创建/更新分享 (幂等: 每次生成新 token) */
export async function createShare(
  dashboardId: number,
  opts: { password?: string; expiresInHours?: number },
) {
  const d = await prisma.dashboard.findUnique({ where: { id: dashboardId } })
  if (!d) throw BizException.notFound(ErrorCode.DASHBOARD_NOT_FOUND)
  ensureTenantScope(d)
  await ensureDataScope(d)

  const token = generateShareToken()
  const hashedPassword = opts.password ? bcrypt.hashSync(opts.password, 10) : null
  const expiresAt = opts.expiresInHours
    ? new Date(Date.now() + opts.expiresInHours * 3600 * 1000)
    : null

  await prisma.dashboard.update({
    where: { id: dashboardId },
    data: {
      shareToken: token,
      sharePassword: hashedPassword,
      shareExpiresAt: expiresAt,
    },
  })

  return {
    shareToken: token,
    shareUrl: `/share/${token}`,
    hasPassword: !!hashedPassword,
    expiresAt: expiresAt,
    isShared: true,
  }
}

/** 取消分享 */
export async function revokeShare(dashboardId: number) {
  const d = await prisma.dashboard.findUnique({ where: { id: dashboardId } })
  if (!d) throw BizException.notFound(ErrorCode.DASHBOARD_NOT_FOUND)
  ensureTenantScope(d)
  await ensureDataScope(d)

  await prisma.dashboard.update({
    where: { id: dashboardId },
    data: {
      shareToken: null,
      sharePassword: null,
      shareExpiresAt: null,
    },
  })
}

/**
 * 公开访问看板 (通过 share token + 可选密码)
 */
export async function getPublicDashboard(token: string, password?: string) {
  const d = await prisma.dashboard.findFirst({
    where: { shareToken: token, deleted: false },
    include: {
      charts: {
        where: { deleted: false },
        include: { dataset: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' as const },
      },
    },
  })

  if (!d) throw BizException.notFound(ErrorCode.DASHBOARD_SHARE_NOT_FOUND)

  // 过期校验
  if (d.shareExpiresAt && d.shareExpiresAt < new Date()) {
    throw new BizException(ErrorCode.DASHBOARD_SHARE_EXPIRED, '分享链接已过期')
  }

  // 密码校验
  if (d.sharePassword) {
    if (!password) {
      throw new BizException(ErrorCode.DASHBOARD_SHARE_PASSWORD_REQUIRED, '请输入访问密码')
    }
    if (!bcrypt.compareSync(password, d.sharePassword)) {
      throw new BizException(ErrorCode.DASHBOARD_SHARE_PASSWORD_INVALID, '访问密码错误')
    }
  }

  return {
    id: d.id,
    name: d.name,
    description: d.description,
    layout: d.layout,
    isPasswordProtected: !!d.sharePassword,
    charts: d.charts.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      config: c.config,
      position: c.position,
      datasetId: c.datasetId,
    })),
  }
}

export const shareService = {
  getShareConfig,
  createShare,
  revokeShare,
  getPublicDashboard,
}
