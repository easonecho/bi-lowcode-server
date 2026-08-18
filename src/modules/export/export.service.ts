/**
 * 数据导出模块 Service (P1: 新增 xlsx 格式)
 * 支持 CSV / JSON / Excel(xlsx) 三种格式
 */
import { BizException } from '../../utils/biz-error'
import { ErrorCode } from '../../constants/error-code'
import { datasetService } from '../dataset/dataset.service'
import { chartService } from '../chart/chart.service'
import logger from '../../utils/logger'
import ExcelJS from 'exceljs'

/** 导出文件类型 */
export type ExportFormat = 'csv' | 'json' | 'xlsx'

/** 导出结果 */
export interface ExportResult {
  filename: string
  contentType: string
  body: string | Buffer
}

function rowsToCsv(columns: string[], rows: any[]): string {
  const escape = (v: any): string => {
    if (v === null || v === undefined) return ''
    let s = typeof v === 'string' ? v : String(v)
    if (/[",\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
    return s
  }
  const header = columns.map(escape).join(',')
  const lines = rows.map((row) => columns.map((c) => escape(row[c])).join(','))
  return `\uFEFF${[header, ...lines].join('\n')}`
}

async function rowsToXlsx(columns: string[], rows: any[], sheetName = 'Sheet1'): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(sheetName)
  // 表头
  ws.columns = columns.map((col) => ({
    header: col,
    key: col,
    width: Math.max(col.length * 2, 12),
  }))
  // 表头样式
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E7FF' },
  }
  // 数据行
  for (const row of rows) {
    const r = ws.addRow(row)
    // 自动类型: 数字右对齐
    r.eachCell((cell) => {
      if (typeof cell.value === 'number') {
        cell.alignment = { horizontal: 'right' }
      }
    })
  }
  // 边框
  ws.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      }
    })
  })
  return (await wb.xlsx.writeBuffer()) as unknown as Buffer
}

function buildFilename(name: string, fmt: ExportFormat, custom?: string): string {
  const safe = (custom || name || 'export').replace(/[^\w\u4e00-\u9fa5-]+/g, '_')
  const stamp = new Date().toISOString().slice(0, 10)
  return `${safe}_${stamp}.${fmt}`
}

/** 导出数据集 */
export async function exportDataset(
  datasetId: number,
  format: ExportFormat,
  opts?: { limit?: number; filename?: string },
): Promise<ExportResult> {
  const dataset = await datasetService.getById(datasetId)
  const { columns, rows } = await datasetService.execute(datasetId, opts?.limit || 50000)

  let body: string | Buffer
  let contentType: string

  if (format === 'csv') {
    body = rowsToCsv(columns, rows)
    contentType = 'text/csv; charset=utf-8'
  } else if (format === 'json') {
    body = JSON.stringify({ columns, rows }, null, 2)
    contentType = 'application/json; charset=utf-8'
  } else {
    body = await rowsToXlsx(columns, rows, (dataset as any).name || '数据集')
    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }

  logger.info({ datasetId, format, rows: rows.length }, '导出数据集')
  return {
    filename: buildFilename((dataset as any).name || 'dataset', format, opts?.filename),
    contentType,
    body,
  }
}

/** 导出图表 */
export async function exportChart(
  chartId: number,
  format: ExportFormat,
  opts?: { limit?: number; filename?: string },
): Promise<ExportResult> {
  const chart = await chartService.getById(chartId)
  const result = await chartService.queryData(chartId, opts?.limit || 10000)
  const { columns, rows } = result as any

  if (!columns || !rows) {
    throw new BizException(ErrorCode.EXPORT_FAILED, '图表数据为空, 无法导出')
  }

  let body: string | Buffer
  let contentType: string

  if (format === 'csv') {
    body = rowsToCsv(columns, rows)
    contentType = 'text/csv; charset=utf-8'
  } else if (format === 'json') {
    body = JSON.stringify({ chart: result.chart, columns, rows }, null, 2)
    contentType = 'application/json; charset=utf-8'
  } else {
    body = await rowsToXlsx(columns, rows, (chart as any).name || '图表')
    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }

  logger.info({ chartId, format, rows: rows.length }, '导出图表')
  return {
    filename: buildFilename((chart as any).name || 'chart', format, opts?.filename),
    contentType,
    body,
  }
}

export const exportService = {
  exportDataset,
  exportChart,
}
