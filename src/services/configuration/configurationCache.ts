/**
 * Configuration Cache Service
 * Provides Map-based caching with TTL for configuration data
 * Improves performance by caching frequently accessed configurations
 */

import type { CacheEntry, CacheStatistics, ConfigurationData } from './types'

/**
 * Configuration Cache Service
 */
export class ConfigurationCache {
  private static cache = new Map<string, CacheEntry<ConfigurationData>>()
  private static statistics: CacheStatistics = {
    hits: 0,
    misses: 0,
    size: 0,
    hitRate: 0,
    totalOperations: 0
  }

  // Default TTL: 5 minutes
  private static readonly DEFAULT_TTL = 5 * 60 * 1000
  private static readonly MAX_CACHE_SIZE = 1000
  private static readonly CLEANUP_INTERVAL = 60 * 1000 // 1 minute

  // Start cleanup interval
  private static cleanupTimer: NodeJS.Timeout | null = null

  /**
   * Initialize the cache service
   */
  static initialize(): void {
    if (!this.cleanupTimer) {
      this.cleanupTimer = setInterval(() => {
        this.cleanupExpired()
      }, this.CLEANUP_INTERVAL)
    }
  }

  /**
   * Shutdown the cache service
   */
  static shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.clear()
  }

  /**
   * Generate cache key for user and category
   * @param userId - User ID
   * @param category - Configuration category
   * @returns Cache key string
   */
  private static generateKey(userId: string, category: string): string {
    return `${userId}:${category}`
  }

  /**
   * Check if cache entry is expired
   * @param entry - Cache entry to check
   * @returns True if expired, false otherwise
   */
  private static isExpired(entry: CacheEntry<ConfigurationData>): boolean {
    return Date.now() > (entry.timestamp + entry.ttl)
  }

  /**
   * Get configuration from cache
   * @param userId - User ID
   * @param category - Configuration category
   * @returns Cached configuration data or null if not found/expired
   */
  static get(userId: string, category: string): ConfigurationData | null {
    const key = this.generateKey(userId, category)
    const entry = this.cache.get(key)

    this.statistics.totalOperations++

    if (!entry) {
      this.statistics.misses++
      this.updateHitRate()
      return null
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key)
      this.statistics.misses++
      this.statistics.size = this.cache.size
      this.updateHitRate()
      return null
    }

    this.statistics.hits++
    this.updateHitRate()
    return entry.data
  }

  /**
   * Set configuration in cache
   * @param userId - User ID
   * @param category - Configuration category
   * @param data - Configuration data to cache
   * @param ttl - Time to live in milliseconds (optional)
   */
  static set(
    userId: string, 
    category: string, 
    data: ConfigurationData, 
    ttl: number = this.DEFAULT_TTL
  ): void {
    const key = this.generateKey(userId, category)

    // Check cache size limit
    if (this.cache.size >= this.MAX_CACHE_SIZE && !this.cache.has(key)) {
      // Remove oldest entries if cache is full
      this.evictOldest()
    }

    const entry: CacheEntry<ConfigurationData> = {
      data,
      timestamp: Date.now(),
      ttl,
      key
    }

    this.cache.set(key, entry)
    this.statistics.size = this.cache.size
  }

  /**
   * Remove configuration from cache
   * @param userId - User ID
   * @param category - Configuration category
   * @returns True if entry was removed, false if not found
   */
  static delete(userId: string, category: string): boolean {
    const key = this.generateKey(userId, category)
    const deleted = this.cache.delete(key)
    this.statistics.size = this.cache.size
    return deleted
  }

  /**
   * Check if configuration exists in cache (and is not expired)
   * @param userId - User ID
   * @param category - Configuration category
   * @returns True if exists and not expired, false otherwise
   */
  static has(userId: string, category: string): boolean {
    const key = this.generateKey(userId, category)
    const entry = this.cache.get(key)

    if (!entry) return false
    if (this.isExpired(entry)) {
      this.cache.delete(key)
      this.statistics.size = this.cache.size
      return false
    }

    return true
  }

  /**
   * Invalidate all cache entries for a user
   * @param userId - User ID
   * @returns Number of entries removed
   */
  static invalidateUser(userId: string): number {
    let removed = 0
    const userPrefix = `${userId}:`

    for (const [key] of this.cache) {
      if (key.startsWith(userPrefix)) {
        this.cache.delete(key)
        removed++
      }
    }

    this.statistics.size = this.cache.size
    return removed
  }

  /**
   * Invalidate all cache entries for a category across all users
   * @param category - Configuration category
   * @returns Number of entries removed
   */
  static invalidateCategory(category: string): number {
    let removed = 0
    const categorySuffix = `:${category}`

    for (const [key] of this.cache) {
      if (key.endsWith(categorySuffix)) {
        this.cache.delete(key)
        removed++
      }
    }

    this.statistics.size = this.cache.size
    return removed
  }

  /**
   * Clear all cache entries
   */
  static clear(): void {
    this.cache.clear()
    this.statistics.size = 0
  }

  /**
   * Get cache statistics
   * @returns Current cache statistics
   */
  static getStatistics(): CacheStatistics {
    return { ...this.statistics }
  }

  /**
   * Get all cache keys for debugging
   * @returns Array of all cache keys
   */
  static getKeys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Get cache entries for a specific user
   * @param userId - User ID
   * @returns Array of cache entries for the user
   */
  static getUserEntries(userId: string): Array<{ category: string; data: ConfigurationData; timestamp: number }> {
    const userPrefix = `${userId}:`
    const entries: Array<{ category: string; data: ConfigurationData; timestamp: number }> = []

    for (const [key, entry] of this.cache) {
      if (key.startsWith(userPrefix) && !this.isExpired(entry)) {
        const category = key.substring(userPrefix.length)
        entries.push({
          category,
          data: entry.data,
          timestamp: entry.timestamp
        })
      }
    }

    return entries
  }

  /**
   * Private helper methods
   */

  /**
   * Update hit rate statistic
   */
  private static updateHitRate(): void {
    if (this.statistics.totalOperations > 0) {
      this.statistics.hitRate = this.statistics.hits / this.statistics.totalOperations
    }
  }

  /**
   * Clean up expired entries
   */
  private static cleanupExpired(): void {
    const now = Date.now()
    let removed = 0

    for (const [key, entry] of this.cache) {
      if (now > (entry.timestamp + entry.ttl)) {
        this.cache.delete(key)
        removed++
      }
    }

    if (removed > 0) {
      this.statistics.size = this.cache.size
      console.debug(`Cache cleanup: removed ${removed} expired entries`)
    }
  }

  /**
   * Evict oldest entries when cache is full
   */
  private static evictOldest(): void {
    let oldestKey = ''
    let oldestTimestamp = Date.now()

    // Find oldest entry
    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.statistics.size = this.cache.size
    }
  }

  /**
   * Warm up cache with frequently accessed configurations
   * @param configurations - Array of configurations to preload
   */
  static warmUp(configurations: Array<{
    userId: string
    category: string
    data: ConfigurationData
  }>): void {
    for (const config of configurations) {
      this.set(config.userId, config.category, config.data)
    }
  }

  /**
   * Get cache memory usage estimate (in bytes)
   * @returns Estimated memory usage
   */
  static getMemoryUsage(): number {
    let totalSize = 0

    for (const [key, entry] of this.cache) {
      // Rough estimate: key size + JSON string size of data
      totalSize += key.length * 2 // UTF-16 characters
      totalSize += JSON.stringify(entry.data).length * 2
      totalSize += 32 // Overhead for timestamp, ttl, etc.
    }

    return totalSize
  }
}

// Initialize cache when module is loaded
ConfigurationCache.initialize()
