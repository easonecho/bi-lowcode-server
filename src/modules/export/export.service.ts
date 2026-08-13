/**
 * 数据导出模块 Service
 * P0/P1 修复: 用数据集服务取数据 (连接池 + 只读 + 超时 + 密码解密)
 * 支持 CSV 和 JSON 两种格式 (Excel 需要 xlsx 包, 保持 CSV/JSON 轻量)
 */
import { BizException } from '../../utils/biz-error';
import { ErrorCode } from '../../constants/error-code';
import { datasetService } from '../dataset/dataset.service';
import { chartService } from '../chart/chart.service';
import logger from '../../utils/logger';

/** 导出文件类型 */
export type ExportFormat = 'csv' | 'json';

/** 导出结果 (用于路由层设置响应头) */
export interface ExportResult {
  filename: string;
  contentType: string;
  body: string;
}

function rowsToCsv(columns: string[], rows: any[]): string {
  const escape = (v: any): string => {
    if (v === null || v === undefined) return '';
    let s = typeof v === 'string' ? v : String(v);
    if (/[",\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const header = columns.map(escape).join(',');
  const lines = rows.map((row) => columns.map((c) => escape(row[c])).join(','));
  // BOM 头保证 Excel 识别 UTF-8
  return '\uFEFF' + [header, ...lines].join('\n');
}

function buildFilename(name: string, fmt: ExportFormat, custom?: string): string {
  const safe = (custom || name || 'export').replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
  const stamp = new Date().toISOString().slice(0, 10);
  return `${safe}_${stamp}.${fmt}`;
}

/** 导出数据集 */
export async function exportDataset(
  datasetId: number,
  format: ExportFormat,
  opts?: { limit?: number; filename?: string }
): Promise<ExportResult> {
  const dataset = await datasetService.getById(datasetId);
  const { columns, rows } = await datasetService.execute(datasetId, opts?.limit || 50000);

  let body: string;
  let contentType: string;

  if (format === 'csv') {
    body = rowsToCsv(columns, rows);
    contentType = 'text/csv; charset=utf-8';
  } else {
    body = JSON.stringify({ columns, rows }, null, 2);
    contentType = 'application/json; charset=utf-8';
  }

  logger.info({ datasetId, format, rows: rows.length }, '导出数据集');

  return {
    filename: buildFilename((dataset as any).name || 'dataset', format, opts?.filename),
    contentType,
    body,
  };
}

/** 导出图表 */
export async function exportChart(
  chartId: number,
  format: ExportFormat,
  opts?: { limit?: number; filename?: string }
): Promise<ExportResult> {
  const chart = await chartService.getById(chartId);
  const result = await chartService.queryData(chartId, opts?.limit || 10000);
  const { columns, rows } = result as any;

  if (!columns || !rows) {
    throw new BizException(ErrorCode.EXPORT_FAILED, '图表数据为空, 无法导出');
  }

  let body: string;
  let contentType: string;

  if (format === 'csv') {
    body = rowsToCsv(columns, rows);
    contentType = 'text/csv; charset=utf-8';
  } else {
    body = JSON.stringify({ chart: result.chart, columns, rows }, null, 2);
    contentType = 'application/json; charset=utf-8';
  }

  logger.info({ chartId, format, rows: rows.length }, '导出图表');

  return {
    filename: buildFilename((chart as any).name || 'chart', format, opts?.filename),
    contentType,
    body,
  };
}

export const exportService = {
  exportDataset,
  exportChart,
};
