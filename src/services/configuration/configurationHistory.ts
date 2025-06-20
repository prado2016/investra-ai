/**
 * Configuration History Service
 * Tracks all configuration changes with timestamps and provides rollback capability
 */

import type { 
  ConfigurationHistory, 
  ConfigurationChange, 
  ConfigurationData,
  ConfigurationValue 
} from './types'

/**
 * Configuration History Service
 */
export class ConfigurationHistoryService {
  private static readonly MAX_HISTORY_ENTRIES = 50
  private static readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours

  // In-memory history storage (in production, this should use a database)
  private static history = new Map<string, ConfigurationHistory[]>()
  private static cleanupTimer: NodeJS.Timeout | null = null

  /**
   * Initialize the history service
   */
  static initialize(): void {
    if (!this.cleanupTimer) {
      this.cleanupTimer = setInterval(() => {
        this.cleanupOldEntries()
      }, this.CLEANUP_INTERVAL)
    }
  }

  /**
   * Shutdown the history service
   */
  static shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  /**
   * Record a configuration change
   * @param userId - User ID
   * @param category - Configuration category
   * @param oldData - Previous configuration data
   * @param newData - New configuration data
   * @param changeReason - Optional reason for the change
   * @returns History entry ID
   */
  static recordChange(
    userId: string,
    category: string,
    oldData: ConfigurationData | null,
    newData: ConfigurationData,
    changeReason?: string
  ): string {
    const historyId = this.generateHistoryId()
    const key = this.generateKey(userId, category)
    const changes = this.calculateChanges(oldData, newData)

    const historyEntry: ConfigurationHistory = {
      id: historyId,
      category,
      changes,
      timestamp: new Date().toISOString(),
      changeReason,
      userId
    }

    // Get existing history for this user/category
    const existingHistory = this.history.get(key) || []
    
    // Add new entry at the beginning
    existingHistory.unshift(historyEntry)

    // Keep only the latest MAX_HISTORY_ENTRIES
    if (existingHistory.length > this.MAX_HISTORY_ENTRIES) {
      existingHistory.splice(this.MAX_HISTORY_ENTRIES)
    }

    this.history.set(key, existingHistory)
    return historyId
  }

  /**
   * Get configuration history for a user and category
   * @param userId - User ID
   * @param category - Configuration category
   * @param limit - Maximum number of entries to return
   * @returns Array of configuration history entries
   */
  static getHistory(
    userId: string,
    category: string,
    limit: number = 20
  ): ConfigurationHistory[] {
    const key = this.generateKey(userId, category)
    const history = this.history.get(key) || []
    
    return history.slice(0, limit)
  }

  /**
   * Get a specific history entry by ID
   * @param userId - User ID
   * @param category - Configuration category
   * @param historyId - History entry ID
   * @returns History entry or null if not found
   */
  static getHistoryEntry(
    userId: string,
    category: string,
    historyId: string
  ): ConfigurationHistory | null {
    const key = this.generateKey(userId, category)
    const history = this.history.get(key) || []
    
    return history.find(entry => entry.id === historyId) || null
  }

  /**
   * Get configuration data at a specific point in history
   * @param userId - User ID
   * @param category - Configuration category
   * @param historyId - History entry ID to restore to
   * @returns Configuration data at that point or null if not found
   */
  static getConfigurationAtPoint(
    userId: string,
    category: string,
    historyId: string
  ): ConfigurationData | null {
    const key = this.generateKey(userId, category)
    const history = this.history.get(key) || []
    
    const targetEntryIndex = history.findIndex(entry => entry.id === historyId)
    if (targetEntryIndex === -1) return null

    // Start with the current state and apply changes in reverse
    // This is a simplified approach - in production, you'd want to store snapshots
    const targetEntry = history[targetEntryIndex]
    // const laterChanges = history.slice(0, targetEntryIndex) // TODO: Implement full state reconstruction

    // For this implementation, we'll return the changes from the target entry
    // In a real system, you'd reconstruct the full state
    const configData: ConfigurationData = {}
    
    for (const change of targetEntry.changes) {
      if (change.operation !== 'delete') {
        configData[change.field] = {
          value: change.newValue,
          isEncrypted: false,
          isSensitive: false,
          dataType: this.inferDataType(change.newValue),
          lastUpdated: targetEntry.timestamp
        }
      }
    }

    return configData
  }

  /**
   * Get diff between two configuration states
   * @param oldData - Previous configuration data
   * @param newData - New configuration data
   * @returns Array of changes
   */
  static getDiff(
    oldData: ConfigurationData | null,
    newData: ConfigurationData
  ): ConfigurationChange[] {
    return this.calculateChanges(oldData, newData)
  }

  /**
   * Get all history for a user across all categories
   * @param userId - User ID
   * @param limit - Maximum number of entries per category
   * @returns Object with history entries by category
   */
  static getAllUserHistory(
    userId: string,
    limit: number = 10
  ): Record<string, ConfigurationHistory[]> {
    const userHistory: Record<string, ConfigurationHistory[]> = {}
    const userPrefix = `${userId}:`

    for (const [key, history] of this.history) {
      if (key.startsWith(userPrefix)) {
        const category = key.substring(userPrefix.length)
        userHistory[category] = history.slice(0, limit)
      }
    }

    return userHistory
  }

  /**
   * Delete history for a specific configuration
   * @param userId - User ID
   * @param category - Configuration category
   * @returns Number of entries deleted
   */
  static deleteHistory(userId: string, category: string): number {
    const key = this.generateKey(userId, category)
    const history = this.history.get(key)
    
    if (history) {
      const count = history.length
      this.history.delete(key)
      return count
    }
    
    return 0
  }

  /**
   * Delete all history for a user
   * @param userId - User ID
   * @returns Number of entries deleted
   */
  static deleteUserHistory(userId: string): number {
    let totalDeleted = 0
    const userPrefix = `${userId}:`

    for (const [key, history] of this.history) {
      if (key.startsWith(userPrefix)) {
        totalDeleted += history.length
        this.history.delete(key)
      }
    }

    return totalDeleted
  }

  /**
   * Private helper methods
   */

  /**
   * Generate a unique history ID
   * @returns Unique history ID
   */
  private static generateHistoryId(): string {
    return `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
   * Calculate changes between old and new configuration data
   * @param oldData - Previous configuration data
   * @param newData - New configuration data
   * @returns Array of configuration changes
   */
  private static calculateChanges(
    oldData: ConfigurationData | null,
    newData: ConfigurationData
  ): ConfigurationChange[] {
    const changes: ConfigurationChange[] = []
    const oldFields = new Set(oldData ? Object.keys(oldData) : [])
    const newFields = new Set(Object.keys(newData))

    // Check for new and updated fields
    for (const field of newFields) {
      const newValue = newData[field]?.value
      const oldValue = oldData?.[field]?.value

      if (!oldFields.has(field)) {
        // New field
        changes.push({
          field,
          oldValue: null,
          newValue,
          operation: 'create'
        })
      } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        // Updated field
        changes.push({
          field,
          oldValue,
          newValue,
          operation: 'update'
        })
      }
    }

    // Check for deleted fields
    for (const field of oldFields) {
      if (!newFields.has(field)) {
        changes.push({
          field,
          oldValue: oldData?.[field]?.value || null,
          newValue: null,
          operation: 'delete'
        })
      }
    }

    return changes
  }

  /**
   * Infer data type from value
   * @param value - Value to analyze
   * @returns Inferred data type
   */
  private static inferDataType(value: any): ConfigurationValue['dataType'] {
    if (typeof value === 'string') {
      if (value.includes('@')) return 'email'
      if (value.startsWith('http')) return 'url'
      if (value.length > 20 && /^[A-Za-z0-9+/]*={0,2}$/.test(value)) return 'password'
      return 'string'
    }
    if (typeof value === 'number') return 'number'
    if (typeof value === 'boolean') return 'boolean'
    return 'json'
  }

  /**
   * Clean up old history entries
   */
  private static cleanupOldEntries(): void {
    const cutoffDate = new Date()
    cutoffDate.setMonth(cutoffDate.getMonth() - 6) // Keep 6 months of history
    const cutoffTime = cutoffDate.toISOString()

    let totalCleaned = 0

    for (const [key, history] of this.history) {
      const filteredHistory = history.filter(entry => entry.timestamp > cutoffTime)
      
      if (filteredHistory.length !== history.length) {
        totalCleaned += (history.length - filteredHistory.length)
        
        if (filteredHistory.length === 0) {
          this.history.delete(key)
        } else {
          this.history.set(key, filteredHistory)
        }
      }
    }

    if (totalCleaned > 0) {
      console.debug(`History cleanup: removed ${totalCleaned} old entries`)
    }
  }

  /**
   * Get statistics about history storage
   * @returns History statistics
   */
  static getStatistics(): {
    totalEntries: number
    totalCategories: number
    averageEntriesPerCategory: number
    oldestEntry: string | null
    newestEntry: string | null
  } {
    let totalEntries = 0
    let oldestEntry: string | null = null
    let newestEntry: string | null = null

    for (const history of this.history.values()) {
      totalEntries += history.length
      
      for (const entry of history) {
        if (!oldestEntry || entry.timestamp < oldestEntry) {
          oldestEntry = entry.timestamp
        }
        if (!newestEntry || entry.timestamp > newestEntry) {
          newestEntry = entry.timestamp
        }
      }
    }

    return {
      totalEntries,
      totalCategories: this.history.size,
      averageEntriesPerCategory: this.history.size > 0 ? totalEntries / this.history.size : 0,
      oldestEntry,
      newestEntry
    }
  }
}

// Initialize history service when module is loaded
ConfigurationHistoryService.initialize()
