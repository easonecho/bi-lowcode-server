/**
 * 系统监控模块 Service (P2-4)
 * - 在线用户查询 (基于 online-tracker 内存表)
 * - 系统资源统计 (用户/角色/仪表板/数据集/数据源/图表/在线人数)
 * - 强制踢人下线
 */
import { prisma } from '../../config/prisma'
import { getOnlineUsers, kickUser, getOnlineCount } from '../../utils/online-tracker'
import { getTenantId } from '../../utils/request-context'

/** 系统统计概览 */
export async function getSystemStats() {
  const tenantId = getTenantId()
  const tenantWhere = { tenantId }
  const [
    userCount,
    roleCount,
    dashboardCount,
    datasetCount,
    datasourceCount,
    chartCount,
    onlineCount,
    positionCount,
    taskCount,
    configCount,
  ] = await Promise.all([
    prisma.user.count({ where: { deleted: false, ...tenantWhere } }),
    prisma.role.count(), // role 表为全局共享, 不按租户过滤
    prisma.dashboard.count({ where: { deleted: false, ...tenantWhere } }),
    prisma.dataset.count({ where: tenantWhere }),
    prisma.datasource.count({ where: { deleted: false, ...tenantWhere } }),
    prisma.chart.count({ where: { deleted: false, ...tenantWhere } }),
    Promise.resolve(getOnlineCount()),
    prisma.position.count({ where: tenantWhere }),
    prisma.scheduledTask.count({ where: tenantWhere }),
    prisma.systemConfig.count({ where: tenantWhere }),
  ])

  return {
    users: userCount,
    roles: roleCount,
    dashboards: dashboardCount,
    datasets: datasetCount,
    datasources: datasourceCount,
    charts: chartCount,
    onlineUsers: onlineCount,
    positions: positionCount,
    scheduledTasks: taskCount,
    systemConfigs: configCount,
  }
}

/** 在线用户列表 */
export function listOnlineUsers() {
  return getOnlineUsers()
}

/** 强制踢人下线 */
export function forceLogout(userId: number): boolean {
  return kickUser(userId)
}

/** 当前进程内存信息 (MB) */
export function getProcessMemory() {
  const mem = process.memoryUsage()
  return {
    rss: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
    heapTotal: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
    heapUsed: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
    external: Math.round((mem.external / 1024 / 1024) * 100) / 100,
    uptime: Math.round(process.uptime()),
  }
}

export const monitorService = {
  getSystemStats,
  listOnlineUsers,
  forceLogout,
  getProcessMemory,
}
