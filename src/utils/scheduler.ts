/**
 * ============================================================================
 * BI 低代码平台 - 定时任务调度器 (P2-4 增强)
 * ============================================================================
 * 基于 setInterval 的轻量级 cron 调度器, 每分钟检查一次数据库中 status=1 的任务。
 *
 * 设计取舍:
 *   - 不依赖 node-cron/agenda 等第三方库, 减少依赖。
 *   - 仅支持标准 5 段 cron 表达式 (分 时 日 月 周)。
 *   - 单进程方案, 多实例场景需加分布式锁。
 *   - handler 为字符串, 仅记录日志表示执行了; 实际业务需注册 handler 注册表。
 * ============================================================================
 */
import { prisma } from '../config/prisma'
import logger from './logger'

let timer: NodeJS.Timeout | null = null

/** 简易 cron 匹配: 检查当前时间是否匹配 cron 表达式 */
function matchCron(cron: string, date: Date): boolean {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return false
  const [min, hour, day, month, weekday] = parts
  const m = date.getMinutes()
  const h = date.getHours()
  const d = date.getDate()
  const mon = date.getMonth() + 1
  const w = date.getDay()

  function match(expr: string, val: number): boolean {
    if (expr === '*') return true
    // 处理逗号分隔
    for (const e of expr.split(',')) {
      // 处理步长 */
      if (e.includes('/')) {
        const [base, step] = e.split('/')
        const stepNum = Number(step)
        if (base === '*' && stepNum > 0) {
          if (val % stepNum === 0) return true
        }
        continue
      }
      // 处理区间
      if (e.includes('-')) {
        const [lo, hi] = e.split('-').map(Number)
        if (val >= lo && val <= hi) return true
        continue
      }
      // 纯数字
      if (Number(e) === val) return true
    }
    return false
  }

  return match(min, m) && match(hour, h) && match(day, d) && match(month, mon) && match(weekday, w)
}

/** 检查并执行到期任务 */
async function checkAndRun(): Promise<void> {
  try {
    const tasks = await prisma.scheduledTask.findMany({
      where: { status: 1 },
    })
    const now = new Date()
    for (const task of tasks) {
      if (!matchCron(task.cron, now)) continue
      try {
        const result = `自动调度执行: ${task.handler}`
        await prisma.scheduledTask.update({
          where: { id: task.id },
          data: { lastRunAt: now, lastResult: result },
        })
        logger.info(
          { taskId: task.id, handler: task.handler, tenantId: task.tenantId },
          '定时任务自动执行',
        )
      } catch (e) {
        logger.error({ taskId: task.id, err: e }, '定时任务执行失败')
      }
    }
  } catch (e) {
    logger.error({ err: e }, '定时任务调度器检查失败')
  }
}

/** 启动调度器 */
export function startScheduler(): void {
  if (timer) return
  // 每分钟检查一次
  timer = setInterval(() => {
    checkAndRun().catch((e) => logger.error({ err: e }, '调度器异常'))
  }, 60_000)
  logger.info('定时任务调度器已启动 (每 60 秒检查一次)')
}

/** 停止调度器 */
export function stopScheduler(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
    logger.info('定时任务调度器已停止')
  }
}
