/**
 * ============================================================================
 * LRU + TTL 内存缓存工具
 * - 基于 Map 实现的简单 LRU: get 时 move-to-end, set 时超出 maxSize 删除 head
 * - 每条记录带 expiresAt, 读取时懒检查过期
 * - 用于数据集查询结果缓存
 * ============================================================================
 */

import logger from './logger'

interface CacheEntry<V> {
  value: V
  expiresAt: number // timestamp ms
}

class LruTtlCache<K, V> {
  private map = new Map<K, CacheEntry<V>>()
  private readonly maxSize: number
  private readonly defaultTtlMs: number
  private readonly name: string

  constructor(options: { maxSize?: number; defaultTtlMs?: number; name?: string } = {}) {
    this.maxSize = options.maxSize ?? 500
    this.defaultTtlMs = options.defaultTtlMs ?? 5 * 60 * 1000
    this.name = options.name ?? 'LruTtlCache'
  }

  set(key: K, value: V, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTtlMs
    const expiresAt = Date.now() + ttl

    if (this.map.has(key)) {
      this.map.delete(key)
    }

    this.map.set(key, { value, expiresAt })

    if (this.map.size > this.maxSize) {
      const headKey = this.map.keys().next().value
      if (headKey !== undefined) {
        this.map.delete(headKey)
      }
    }
  }

  get(key: K): V | undefined {
    const entry = this.map.get(key)
    if (!entry) return undefined

    if (entry.expiresAt <= Date.now()) {
      this.map.delete(key)
      return undefined
    }

    this.map.delete(key)
    this.map.set(key, entry)
    return entry.value
  }

  delete(key: K): boolean {
    return this.map.delete(key)
  }

  deleteByPrefix(prefix: string): number {
    let count = 0
    for (const k of this.map.keys()) {
      if (typeof k === 'string' && k.startsWith(prefix)) {
        this.map.delete(k)
        count++
      }
    }
    if (count > 0) {
      logger.debug({ cache: this.name, prefix, count }, '缓存按前缀清理')
    }
    return count
  }

  clear(): void {
    this.map.clear()
  }

  get size(): number {
    return this.map.size
  }

  purgeExpired(): number {
    const now = Date.now()
    let count = 0
    for (const [k, v] of this.map.entries()) {
      if (v.expiresAt <= now) {
        this.map.delete(k)
        count++
      }
    }
    if (count > 0) {
      logger.debug({ cache: this.name, count }, '过期缓存已清理')
    }
    return count
  }
}

export const datasetQueryCache = new LruTtlCache<
  string,
  { columns: string[]; rows: any[]; rowCount: number }
>({
  maxSize: 300,
  defaultTtlMs: 5 * 60 * 1000,
  name: 'DatasetQueryCache',
})

export function buildDatasetCacheKey(tenantId: number, datasetId: number, limit?: number): string {
  return `ds:${tenantId}:${datasetId}:${limit ?? 'nolimit'}`
}

export function invalidateDatasetCache(tenantId: number, datasetId: number): number {
  return datasetQueryCache.deleteByPrefix(`ds:${tenantId}:${datasetId}:`)
}

if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    datasetQueryCache.purgeExpired()
  }, 60 * 1000)
  if (typeof timer.unref === 'function') timer.unref()
}
