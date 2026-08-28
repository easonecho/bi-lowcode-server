/**
 * 仪表板模板模块 Service (P2-3)
 * - 模板 CRUD (租户隔离 + 逻辑删除)
 * - isSystem 字段区分预置模板与用户模板
 *   - 预置模板 (isSystem=true): 仅允许 apply, 不允许 update/remove
 *   - 用户模板 (isSystem=false): 完整 CRUD
 * - saveAsTemplate: 将已有仪表板布局保存为用户模板 (isSystem=false)
 * - applyTemplate: 基于模板创建新仪表板 (复制 layout, 不复制图表关联)
 */
import { prisma } from '../../config/prisma'
import { BizException } from '../../utils/biz-error'
import { ErrorCode } from '../../constants/error-code'
import { getTenantId, ensureTenantScope } from '../../utils/request-context'
import type {
  CreateDashboardTemplateInput,
  UpdateDashboardTemplateInput,
  SaveAsTemplateInput,
  ApplyTemplateInput,
} from './dashboard-template.dto'

/**
 * 查询模板列表
 * @param category 分类过滤 (可选)
 * @param isSystem 是否系统预置模板过滤 (可选, true=仅预置, false=仅用户, undefined=全部)
 */
export async function list(category?: string, isSystem?: boolean) {
  const where: any = { deleted: false, tenantId: getTenantId() }
  if (category) where.category = category
  if (isSystem !== undefined) where.isSystem = isSystem
  return prisma.dashboardTemplate.findMany({
    where,
    include: {
      creator: { select: { id: true, username: true, nickname: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getById(id: number) {
  const t = await prisma.dashboardTemplate.findUnique({
    where: { id },
    include: { creator: { select: { id: true, username: true, nickname: true } } },
  })
  if (!t || t.deleted) throw BizException.notFound(ErrorCode.DASHBOARD_TEMPLATE_NOT_FOUND)
  ensureTenantScope(t)
  return t
}

export async function create(input: CreateDashboardTemplateInput, creatorId: number) {
  const tenantId = getTenantId()
  await ensureUniqueName(input.name, tenantId)
  return prisma.dashboardTemplate.create({
    data: { ...input, creatorId, createBy: 'system', tenantId } as any,
  })
}

export async function update(id: number, input: UpdateDashboardTemplateInput) {
  const t = await getById(id)
  // 🔒 预置模板禁止修改 (保护系统原始数据)，但允许更新缩略图快照
  if (t.isSystem) {
    if (input.thumbnail !== undefined) {
      return prisma.dashboardTemplate.update({
        where: { id },
        data: { thumbnail: input.thumbnail, updateBy: 'system' } as any,
      })
    }
    throw new BizException(ErrorCode.DASHBOARD_TEMPLATE_IS_SYSTEM, '系统预置模板不可修改')
  }
  if (input.name) {
    const tenantId = getTenantId()
    const exists = await prisma.dashboardTemplate.findFirst({
      where: { name: input.name, deleted: false, tenantId, NOT: { id } },
    })
    if (exists) throw new BizException(ErrorCode.DASHBOARD_TEMPLATE_NAME_EXISTS, '模板名称已存在')
  }
  return prisma.dashboardTemplate.update({
    where: { id },
    data: { ...input, updateBy: 'system' } as any,
  })
}

export async function remove(id: number) {
  const t = await getById(id)
  // 🔒 预置模板禁止删除 (保护系统原始数据)
  if (t.isSystem) {
    throw new BizException(ErrorCode.DASHBOARD_TEMPLATE_IS_SYSTEM, '系统预置模板不可删除')
  }
  await prisma.dashboardTemplate.update({ where: { id }, data: { deleted: true } })
}

/**
 * 从已有仪表板保存为模板 (仅保存 layout, 不复制图表关联)
 * 始终生成用户模板 (isSystem=false)
 */
export async function saveAsTemplate(
  dashboardId: number,
  input: SaveAsTemplateInput,
  creatorId: number,
) {
  const d = await prisma.dashboard.findUnique({ where: { id: dashboardId } })
  if (!d || d.deleted) throw BizException.notFound(ErrorCode.DASHBOARD_NOT_FOUND)
  ensureTenantScope(d)

  const tenantId = getTenantId()
  await ensureUniqueName(input.name, tenantId)

  return prisma.dashboardTemplate.create({
    data: {
      name: input.name,
      description: input.description,
      layout: d.layout ? JSON.parse(JSON.stringify(d.layout)) : undefined,
      thumbnail: input.thumbnail,
      category: input.category,
      isPublic: input.isPublic ?? true,
      isSystem: false, // 🔑 saveAsTemplate 始终生成用户模板
      creatorId,
      createBy: 'system',
      tenantId,
    } as any,
  })
}

/**
 * 基于模板创建新仪表板
 * - 复制 layout (深拷贝), 状态强制为草稿, isPublic 由调用方决定
 * - 不复制图表关联 (模板仅保留布局结构)
 * - 系统预置模板与用户模板均可被 apply
 */
export async function applyTemplate(
  templateId: number,
  input: ApplyTemplateInput,
  creatorId: number,
) {
  const tpl = await getById(templateId)
  const tenantId = getTenantId()
  return prisma.dashboard.create({
    data: {
      name: input.name,
      description: input.description,
      layout: tpl.layout ? JSON.parse(JSON.stringify(tpl.layout)) : undefined,
      status: 0, // 草稿
      isPublic: input.isPublic ?? false,
      creatorId,
      createBy: 'system',
      tenantId,
    } as any,
  })
}

async function ensureUniqueName(name: string, tenantId: number) {
  const exists = await prisma.dashboardTemplate.findFirst({
    where: { name, deleted: false, tenantId },
  })
  if (exists) throw new BizException(ErrorCode.DASHBOARD_TEMPLATE_NAME_EXISTS, '模板名称已存在')
}

export const dashboardTemplateService = {
  list,
  getById,
  create,
  update,
  remove,
  saveAsTemplate,
  applyTemplate,
}
