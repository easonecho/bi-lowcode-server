/**
 * ============================================================================
 * BI 低代码平台 - 外部数据源连接池管理 (多数据库 Adapter 模式)
 * ============================================================================
 * 设计:
 * - 抽象 DbAdapter 接口 (query / testConnection / listTables / describeTable / release)
 * - MysqlAdapter   -> 生产可用 (mysql2)
 * - PostgresAdapter -> 占位 (需安装 `pg`)
 * - SqliteAdapter   -> 占位 (需安装 `better-sqlite3`)
 * - 通过 factory: getAdapter(type) 按类型路由, 避免上层 switch 散落
 *
 * 其它特性:
 * - 按数据源 ID 缓存 adapter 实例
 * - 支持查询超时 (默认 30s, mysql 已实现, pg/sqlite TODO)
 * - 支持只读校验 (全局, 不区分数据库类型)
 * ============================================================================
 */

import mysql, { Pool as MysqlPool, PoolOptions as MysqlPoolOptions } from 'mysql2/promise'
import { decrypt } from './crypto'
import { BizException } from './biz-error'
import { ErrorCode } from '../constants/error-code'
import logger from './logger'

/** 查询超时 (毫秒) */
const QUERY_TIMEOUT = 30_000
/** 连接池大小 */
const CONNECTION_LIMIT = 5
/** 排队超时 (毫秒) */
const QUEUE_TIMEOUT = 10_000

/** 表字段结构 */
export interface TableField {
  name: string
  type: string
  nullable: boolean
  key: string
  defaultValue: string | null
  extra: string
  comment: string | null
}

/** 数据源连接信息 */
export interface DataSourceConfig {
  id: number
  type: string
  host: string
  port: number
  username: string
  password: string // 已解密的明文密码
  database: string
  options?: any
}

// ============================================================================
// DbAdapter 抽象
// ============================================================================
interface DbAdapter {
  readonly type: string

  /** 执行查询, 返回行数组 */
  query<T = any>(sql: string, values?: any[]): Promise<T[]>

  /** 测试连接 (一次性, 不经缓存池) */
  test(ds: Omit<DataSourceConfig, 'id'>): Promise<void>

  /** 列出当前库所有表名 */
  listTables(database: string): Promise<string[]>

  /** 获取表字段结构 */
  describeTable(database: string, table: string): Promise<TableField[]>

  /** 释放底层连接池/连接 */
  release(): Promise<void> | void
}

// ============================================================================
// MySQL Adapter (生产实现)
// ============================================================================
class MysqlAdapter implements DbAdapter {
  readonly type = 'mysql'
  private pool: MysqlPool

  constructor(private ds: DataSourceConfig) {
    const opts: MysqlPoolOptions = {
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
    }
    this.pool = mysql.createPool(opts)
  }

  async query<T = any>(sql: string, values?: any[]): Promise<T[]> {
    const opts: any = { sql, timeout: QUERY_TIMEOUT }
    const [rows] =
      values && values.length > 0
        ? await this.pool.query(opts, values)
        : await this.pool.query(opts)
    return rows as T[]
  }

  static async test(ds: Omit<DataSourceConfig, 'id'>): Promise<void> {
    const conn = await mysql.createConnection({
      host: ds.host,
      port: ds.port,
      user: ds.username,
      password: ds.password,
      connectTimeout: 5_000,
    })
    try {
      await conn.ping()
    } finally {
      await conn.end()
    }
  }

  async test(ds: Omit<DataSourceConfig, 'id'>): Promise<void> {
    return MysqlAdapter.test(ds)
  }

  async listTables(database: string): Promise<string[]> {
    const [rows] = await this.pool.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
      [database],
    )
    return (rows as any[]).map((r) => r.TABLE_NAME)
  }

  async describeTable(database: string, table: string): Promise<TableField[]> {
    const sql =
      'SELECT COLUMN_NAME as `name`, COLUMN_TYPE as `type`, IS_NULLABLE as `nullable`, ' +
      'COLUMN_KEY as `col_key`, COLUMN_DEFAULT as `defaultValue`, EXTRA as `extra`, ' +
      'COLUMN_COMMENT as `comment` ' +
      'FROM INFORMATION_SCHEMA.COLUMNS ' +
      'WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ' +
      'ORDER BY ORDINAL_POSITION'
    const [rows] = await this.pool.query(sql, [database, table])
    return (rows as any[]).map((r) => ({
      name: String(r.name),
      type: String(r.type),
      nullable: String(r.nullable) === 'YES',
      key: String(r.col_key || ''),
      defaultValue:
        r.defaultValue === null || r.defaultValue === undefined ? null : String(r.defaultValue),
      extra: String(r.extra || ''),
      comment: r.comment === null || r.comment === undefined ? null : String(r.comment),
    }))
  }

  async release(): Promise<void> {
    await this.pool.end().catch(() => {})
  }

  /**
   * 判定 mysql 连接级错误 (供外部清理缓存)
   */
  static isConnectionError(err: any): boolean {
    const code = err?.code || ''
    return ['ECONNRESET', 'EPIPE', 'PROTOCOL_CONNECTION_LOST', 'ER_CON_COUNT_ERROR'].includes(code)
  }
}

// ============================================================================
// PostgreSQL Adapter (占位实现)
// ============================================================================
// 要启用 PostgreSQL 支持, 请:
//   1) npm install pg @types/pg
//   2) 取消下面 import pg from 'pg' 注释, 并实现 Pool 调用
//
// import pg from 'pg';

class PostgresAdapter implements DbAdapter {
  readonly type = 'postgresql'

  constructor(ds: DataSourceConfig) {
    // TODO: 使用 pg.Pool(ds: { host, port, user, password, database, max: CONNECTION_LIMIT })
    void ds
    throw notSupported('postgresql')
  }

  query<T = any>(): Promise<T[]> {
    throw notSupported('postgresql')
  }

  async test(): Promise<void> {
    throw notSupported('postgresql')
  }

  static async test(): Promise<void> {
    throw notSupported('postgresql')
  }

  listTables(): Promise<string[]> {
    throw notSupported('postgresql')
  }

  describeTable(): Promise<TableField[]> {
    throw notSupported('postgresql')
  }

  release(): void {
    /* noop */
  }
}

// ============================================================================
// SQLite Adapter (占位实现)
// ============================================================================
// 要启用 SQLite 支持, 请:
//   1) npm install better-sqlite3 @types/better-sqlite3
//   2) 按数据库绝对路径打开: new Database(ds.database)
//
// import Database from 'better-sqlite3';

class SqliteAdapter implements DbAdapter {
  readonly type = 'sqlite'

  constructor(ds: DataSourceConfig) {
    // SQLite 通常不需要 host/port/user/password, database 字段当文件路径
    void ds
    throw notSupported('sqlite')
  }

  query<T = any>(): Promise<T[]> {
    throw notSupported('sqlite')
  }

  async test(): Promise<void> {
    throw notSupported('sqlite')
  }

  static async test(): Promise<void> {
    throw notSupported('sqlite')
  }

  listTables(): Promise<string[]> {
    throw notSupported('sqlite')
    // 参考 SQL:
    //   SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    //   ORDER BY name;
  }

  describeTable(): Promise<TableField[]> {
    throw notSupported('sqlite')
  }

  release(): void {
    /* noop */
  }
}

// ============================================================================
// 通用 helper
// ============================================================================
function notSupported(type: string): BizException {
  const guide: Record<string, string> = {
    postgresql: '请安装 pg 依赖: npm install pg @types/pg 并解除 PostgresAdapter 注释',
    sqlite:
      '请安装 better-sqlite3 依赖: npm install better-sqlite3 @types/better-sqlite3 并解除 SqliteAdapter 注释',
  }
  const message = `数据源类型「${type}」暂未启用。${guide[type] || ''}`
  logger.warn({ type }, message)
  return new BizException(ErrorCode.DATASOURCE_TYPE_NOT_SUPPORTED, message)
}

// ============================================================================
// 缓存层 + 对外导出 API (保持与旧签名一致, 无破坏性)
// ============================================================================

const adapterCache = new Map<number, DbAdapter>()

function createAdapter(ds: DataSourceConfig): DbAdapter {
  switch (ds.type) {
    case 'mysql':
    case 'mysql2':
      return new MysqlAdapter(ds)
    case 'postgres':
    case 'postgresql':
      return new PostgresAdapter(ds)
    case 'sqlite':
    case 'sqlite3':
      return new SqliteAdapter(ds)
    default:
      throw notSupported(ds.type)
  }
}

/**
 * 获取数据源 DbAdapter (带缓存)
 * 历史兼容: 导出仍叫 getPool, 但返回 Adapter (内部调用方可按需要直接用 query)
 */
export function getAdapter(ds: DataSourceConfig): DbAdapter {
  let adapter = adapterCache.get(ds.id)
  if (!adapter) {
    adapter = createAdapter(ds)
    adapterCache.set(ds.id, adapter)
  }
  return adapter
}

/** @deprecated 历史兼容: 旧代码调用 getPool -> 返回的是 mysql Pool。请改用 getAdapter(ds).query() */
export function getPool(ds: DataSourceConfig): MysqlPool {
  if (ds.type !== 'mysql' && ds.type !== 'mysql2') {
    throw notSupported(ds.type)
  }
  const adapter = getAdapter(ds) as unknown as { pool: MysqlPool }
  return adapter.pool
}

/**
 * 执行查询 (带超时 + 只读校验 + 参数化)
 */
export async function executeQuery<T = any>(
  ds: DataSourceConfig,
  sql: string,
  values?: any[] | boolean,
  readonly: boolean = true,
): Promise<T[]> {
  // 兼容旧签名: executeQuery(ds, sql, true/false)
  if (typeof values === 'boolean') {
    readonly = values
    values = undefined
  }

  if (readonly) {
    assertReadonlyQuery(sql)
  }

  const adapter = getAdapter(ds)
  try {
    return await adapter.query<T>(sql, values as any[] | undefined)
  } catch (err: any) {
    if (ds.type === 'mysql' && MysqlAdapter.isConnectionError(err)) {
      releasePool(ds.id)
    }
    throw err
  }
}

/**
 * 测试数据源连接 (不缓存)
 */
export async function testConnection(ds: Omit<DataSourceConfig, 'id'>): Promise<void> {
  switch (ds.type) {
    case 'mysql':
    case 'mysql2':
      return MysqlAdapter.test(ds)
    case 'postgres':
    case 'postgresql':
      return PostgresAdapter.test()
    case 'sqlite':
    case 'sqlite3':
      return SqliteAdapter.test()
    default:
      throw notSupported(ds.type)
  }
}

/**
 * 获取所有表名
 */
export async function getTableNames(ds: DataSourceConfig): Promise<string[]> {
  const adapter = getAdapter(ds)
  return adapter.listTables(ds.database)
}

/**
 * 获取表字段结构
 */
export async function getTableFields(ds: DataSourceConfig, table: string): Promise<TableField[]> {
  const adapter = getAdapter(ds)
  return adapter.describeTable(ds.database, table)
}

/**
 * 释放指定数据源的底层连接
 */
export function releasePool(datasourceId: number): void {
  const adapter = adapterCache.get(datasourceId)
  if (adapter) {
    Promise.resolve(adapter.release()).catch(() => {})
    adapterCache.delete(datasourceId)
  }
}

/**
 * 释放所有连接池 (优雅关闭时调用)
 */
export async function releaseAllPools(): Promise<void> {
  const all = Array.from(adapterCache.values())
  adapterCache.clear()
  await Promise.all(all.map((a) => Promise.resolve(a.release()).catch(() => {})))
}

/**
 * 只读校验: 仅允许 SELECT / WITH 语句
 * 这个校验数据库无关, 放在出口统一做
 */
function assertReadonlyQuery(sql: string): void {
  const trimmed = sql.trim().toUpperCase()
  const withoutComments = trimmed
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '')
    .trim()

  if (!withoutComments.startsWith('SELECT') && !withoutComments.startsWith('WITH')) {
    throw new BizException(ErrorCode.DATASET_SQL_NOT_READONLY)
  }

  const dangerous = /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|EXEC)\b/i
  if (dangerous.test(withoutComments)) {
    throw new BizException(ErrorCode.DATASET_SQL_NOT_READONLY)
  }
}

/**
 * 从加密的密码解密出明文
 */
export function decryptPassword(encrypted: string): string {
  try {
    return decrypt(encrypted)
  } catch {
    return encrypted
  }
}
