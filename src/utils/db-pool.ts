/**
 * ============================================================================
 * BI 低代码平台 - 外部数据源连接池管理
 * ============================================================================
 * 替代原来每次查询都 mysql.createConnection + end 的低效模式
 * 参考 jvs-starter-database 的连接池思想
 *
 * 特性:
 * - 按数据源 ID 缓存连接池, 避免重复创建
 * - 支持查询超时 (默认 30s)
 * - 支持只读校验 (仅允许 SELECT)
 * - 支持连接池配置 (connectionLimit, queueTimeout)
 * ============================================================================
 */

import mysql, { Pool, PoolOptions } from 'mysql2/promise';
import { decrypt } from './crypto';
import { BizException } from './biz-error';
import { ErrorCode } from '../constants/error-code';

/** 查询超时 (毫秒) */
const QUERY_TIMEOUT = 30_000;
/** 连接池大小 */
const CONNECTION_LIMIT = 5;
/** 排队超时 (毫秒) */
const QUEUE_TIMEOUT = 10_000;

/** 数据源连接信息 */
export interface DataSourceConfig {
  id: number;
  type: string;
  host: string;
  port: number;
  username: string;
  password: string; // 已解密的明文密码
  database: string;
  options?: any;
}

/** 连接池缓存: dataSourceId -> Pool */
const poolCache = new Map<number, Pool>();

/**
 * 获取数据源连接池 (带缓存)
 */
export function getPool(ds: DataSourceConfig): Pool {
  // 仅支持 MySQL
  if (ds.type !== 'mysql') {
    throw new BizException(ErrorCode.DATASOURCE_TYPE_NOT_SUPPORTED, `暂不支持数据源类型: ${ds.type}`);
  }

  let pool = poolCache.get(ds.id);
  if (pool) {
    return pool;
  }

  const poolOptions: PoolOptions = {
    host: ds.host,
    port: ds.port,
    user: ds.username,
    password: ds.password,
    database: ds.database,
    connectionLimit: CONNECTION_LIMIT,
    queueTimeout: QUEUE_TIMEOUT,
    connectTimeout: 5_000,
    charset: 'utf8mb4',
    ...ds.options,
  };

  pool = mysql.createPool(poolOptions);
  poolCache.set(ds.id, pool);
  return pool;
}

/**
 * 执行查询 (带超时 + 只读校验)
 * @param ds 数据源配置
 * @param sql SQL 语句
 * @param readonly 是否强制只读 (默认 true, 禁止 DML/DDL)
 */
export async function executeQuery<T = any>(
  ds: DataSourceConfig,
  sql: string,
  readonly: boolean = true
): Promise<T[]> {
  if (readonly) {
    assertReadonlyQuery(sql);
  }

  const pool = getPool(ds);
  try {
    const [rows] = await pool.query({ sql, timeout: QUERY_TIMEOUT });
    return rows as T[];
  } catch (err: any) {
    // 连接级错误, 清除缓存的连接池
    if (isConnectionError(err)) {
      releasePool(ds.id);
    }
    throw err;
  }
}

/**
 * 测试数据源连接 (不缓存)
 */
export async function testConnection(ds: Omit<DataSourceConfig, 'id'>): Promise<void> {
  if (ds.type !== 'mysql') {
    throw new BizException(ErrorCode.DATASOURCE_TYPE_NOT_SUPPORTED, `暂不支持数据源类型: ${ds.type}`);
  }

  const conn = await mysql.createConnection({
    host: ds.host,
    port: ds.port,
    user: ds.username,
    password: ds.password,
    connectTimeout: 5_000,
  });

  try {
    await conn.ping();
  } finally {
    await conn.end();
  }
}

/**
 * 获取所有表名
 */
export async function getTableNames(ds: DataSourceConfig): Promise<string[]> {
  const pool = getPool(ds);
  const [rows] = await pool.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
    [ds.database]
  );
  return (rows as any[]).map((r) => r.TABLE_NAME);
}

/**
 * 释放指定数据源的连接池
 */
export function releasePool(datasourceId: number): void {
  const pool = poolCache.get(datasourceId);
  if (pool) {
    pool.end().catch(() => {});
    poolCache.delete(datasourceId);
  }
}

/**
 * 释放所有连接池 (优雅关闭时调用)
 */
export async function releaseAllPools(): Promise<void> {
  const pools = Array.from(poolCache.values());
  poolCache.clear();
  await Promise.all(pools.map((p) => p.end().catch(() => {})));
}

/**
 * 只读校验: 仅允许 SELECT 语句
 */
function assertReadonlyQuery(sql: string): void {
  const trimmed = sql.trim().toUpperCase();
  // 移除 SQL 注释和前导空格
  const withoutComments = trimmed.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '').trim();

  if (!withoutComments.startsWith('SELECT') && !withoutComments.startsWith('WITH')) {
    throw new BizException(ErrorCode.DATASET_SQL_NOT_READONLY);
  }

  // 检查危险关键字 (在子语句中)
  const dangerous = /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|EXEC)\b/i;
  if (dangerous.test(withoutComments)) {
    throw new BizException(ErrorCode.DATASET_SQL_NOT_READONLY);
  }
}

/**
 * 判断是否为连接级错误
 */
function isConnectionError(err: any): boolean {
  const code = err?.code || '';
  return ['ECONNRESET', 'EPIPE', 'PROTOCOL_CONNECTION_LOST', 'ER_CON_COUNT_ERROR'].includes(code);
}

/**
 * 从加密的密码解密出明文 (供 service 层调用)
 */
export function decryptPassword(encrypted: string): string {
  try {
    return decrypt(encrypted);
  } catch {
    // 兼容旧数据: 如果不是加密格式, 返回原值
    return encrypted;
  }
}
