/**
 * Offline Storage Service for Stock Tracker App
 * Provides IndexedDB-based offline storage with sync capabilities
 * Handles conflict resolution and offline-first architecture
 */

import { SupabaseService } from './supabaseService'
import type { 
  Portfolio
} from '../lib/database/types'

// Offline storage configuration
const DB_NAME = 'StockTrackerOfflineDB'
const DB_VERSION = 1

// Store names
const STORES = {
  PORTFOLIOS: 'portfolios',
  POSITIONS: 'positions', 
  TRANSACTIONS: 'transactions',
  ASSETS: 'assets',
  SYNC_QUEUE: 'sync_queue',
  METADATA: 'metadata'
} as const

// Sync operation types
export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE'

export interface SyncQueueItem {
  id: string
  table: string
  operation: SyncOperation
  data: unknown
  localId?: string
  timestamp: number
  attempts: number
  lastError?: string
}

export interface OfflineMetadata {
  lastSyncTime: number
  userId: string
  conflictResolution: 'server_wins' | 'client_wins' | 'merge'
}

// Sync status tracking
export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  queueSize: number
  lastSyncTime: Date | null
  syncErrors: string[]
  conflictsResolved: number
}

/**
 * Offline Storage Service Class
 */
export class OfflineStorageService {
  private static instance: OfflineStorageService
  private db: IDBDatabase | null = null
  private isInitialized = false
  private syncInProgress = false
  
  // Status tracking
  private status: SyncStatus = {
    isOnline: navigator.onLine,
    isSyncing: false,
    queueSize: 0,
    lastSyncTime: null,
    syncErrors: [],
    conflictsResolved: 0
  }

  private listeners: ((status: SyncStatus) => void)[] = []

  private constructor() {
    this.setupOnlineDetection()
  }

  public static getInstance(): OfflineStorageService {
    if (!OfflineStorageService.instance) {
      OfflineStorageService.instance = new OfflineStorageService()
    }
    return OfflineStorageService.instance
  }

  /**
   * Initialize IndexedDB
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized && this.db) {
      return true
    }

    try {
      this.db = await this.openDatabase()
      this.isInitialized = true
      
      // Start periodic sync if online
      if (this.status.isOnline) {
        this.startPeriodicSync()
      }

      console.log('📱 Offline storage initialized')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize offline storage:', error)
      return false
    }
  }

  /**
   * Open IndexedDB database
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores
        if (!db.objectStoreNames.contains(STORES.PORTFOLIOS)) {
          const portfolioStore = db.createObjectStore(STORES.PORTFOLIOS, { keyPath: 'id' })
          portfolioStore.createIndex('user_id', 'user_id', { unique: false })
          portfolioStore.createIndex('updated_at', 'updated_at', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.POSITIONS)) {
          const positionStore = db.createObjectStore(STORES.POSITIONS, { keyPath: 'id' })
          positionStore.createIndex('portfolio_id', 'portfolio_id', { unique: false })
          positionStore.createIndex('asset_id', 'asset_id', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.TRANSACTIONS)) {
          const transactionStore = db.createObjectStore(STORES.TRANSACTIONS, { keyPath: 'id' })
          transactionStore.createIndex('portfolio_id', 'portfolio_id', { unique: false })
          transactionStore.createIndex('asset_id', 'asset_id', { unique: false })
          transactionStore.createIndex('transaction_date', 'transaction_date', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.ASSETS)) {
          const assetStore = db.createObjectStore(STORES.ASSETS, { keyPath: 'id' })
          assetStore.createIndex('symbol', 'symbol', { unique: true })
          assetStore.createIndex('asset_type', 'asset_type', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' })
          syncStore.createIndex('timestamp', 'timestamp', { unique: false })
          syncStore.createIndex('table', 'table', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'key' })
        }

        console.log('📦 IndexedDB stores created')
      }
    })
  }

  /**
   * Setup online/offline detection
   */
  private setupOnlineDetection(): void {
    window.addEventListener('online', () => {
      console.log('🌐 Connection restored')
      this.status.isOnline = true
      this.updateStatus()
      this.syncWithServer()
    })

    window.addEventListener('offline', () => {
      console.log('📱 Connection lost - switching to offline mode')
      this.status.isOnline = false
      this.updateStatus()
    })
  }

  /**
   * Store data locally
   */
  private async storeLocally<T>(storeName: string, data: T): Promise<boolean> {
    if (!this.db) return false

    try {
      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      await this.promisifyRequest(store.put(data))
      return true
    } catch (error) {
      console.error(`❌ Failed to store ${storeName} locally:`, error)
      return false
    }
  }

  /**
   * Get all data from local storage
   */
  private async getAllFromLocal<T>(storeName: string): Promise<T[]> {
    if (!this.db) return []

    try {
      const transaction = this.db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const result = await this.promisifyRequest(store.getAll())
      return (result as T[]) || []
    } catch (error) {
      console.error(`❌ Failed to get all ${storeName} from local storage:`, error)
      return []
    }
  }

  /**
   * Add operation to sync queue
   */
  private async addToSyncQueue(
    table: string,
    operation: SyncOperation,
    data: unknown,
    localId?: string
  ): Promise<void> {
    if (!this.db) return

    const queueItem: SyncQueueItem = {
      id: `${table}_${operation}_${Date.now()}_${Math.random()}`,
      table,
      operation,
      data,
      localId,
      timestamp: Date.now(),
      attempts: 0
    }

    try {
      const transaction = this.db.transaction([STORES.SYNC_QUEUE], 'readwrite')
      const store = transaction.objectStore(STORES.SYNC_QUEUE)
      await this.promisifyRequest(store.put(queueItem))
      
      this.status.queueSize = await this.getSyncQueueSize()
      this.updateStatus()
      
      console.log('📤 Added to sync queue:', operation, table)
    } catch (error) {
      console.error('❌ Failed to add to sync queue:', error)
    }
  }

  /**
   * Portfolio operations - offline-first
   */
  public async createPortfolio(
    name: string,
    description: string = '',
    currency: string = 'USD'
  ): Promise<{ success: boolean; data?: Portfolio; error?: string }> {
    const tempId = `temp_portfolio_${Date.now()}_${Math.random()}`
    
    const portfolioData = {
      id: tempId,
      user_id: '',
      name,
      description,
      currency,
      is_default: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    try {
      await this.storeLocally(STORES.PORTFOLIOS, portfolioData)
      await this.addToSyncQueue(STORES.PORTFOLIOS, 'CREATE', portfolioData, tempId)

      if (this.status.isOnline) {
        this.syncWithServer()
      }

      return { success: true, data: portfolioData }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create portfolio offline' 
      }
    }
  }

  /**
   * Get portfolios (offline-first)
   */
  public async getPortfolios(): Promise<Portfolio[]> {
    try {
      const localPortfolios = await this.getAllFromLocal<Portfolio>(STORES.PORTFOLIOS)
      
      if (this.status.isOnline && !this.syncInProgress) {
        this.syncWithServer()
      }

      return localPortfolios
    } catch (error) {
      console.error('❌ Failed to get portfolios offline:', error)
      return []
    }
  }

  /**
   * Sync with server
   */
  public async syncWithServer(): Promise<boolean> {
    if (!this.status.isOnline || this.syncInProgress) {
      return false
    }

    this.syncInProgress = true
    this.status.isSyncing = true
    this.updateStatus()

    try {
      console.log('🔄 Starting sync with server...')
      await this.processSyncQueue()
      await this.downloadFromServer()
      await this.updateSyncMetadata()

      this.status.lastSyncTime = new Date()
      this.status.syncErrors = []
      
      console.log('✅ Sync completed successfully')
      return true
    } catch (error) {
      console.error('❌ Sync failed:', error)
      this.status.syncErrors.push(error instanceof Error ? error.message : 'Unknown sync error')
      return false
    } finally {
      this.syncInProgress = false
      this.status.isSyncing = false
      this.updateStatus()
    }
  }

  /**
   * Helper methods
   */
  private promisifyRequest<T = unknown>(request: IDBRequest): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  private async getSyncQueueSize(): Promise<number> {
    if (!this.db) return 0
    
    try {
      const transaction = this.db.transaction([STORES.SYNC_QUEUE], 'readonly')
      const store = transaction.objectStore(STORES.SYNC_QUEUE)
      const count = await this.promisifyRequest(store.count())
      return (count as number) || 0
    } catch {
      return 0
    }
  }

  private async processSyncQueue(): Promise<void> {
    if (!this.db) return

    try {
      const transaction = this.db.transaction([STORES.SYNC_QUEUE], 'readonly')
      const store = transaction.objectStore(STORES.SYNC_QUEUE)
      const queueItems = await this.promisifyRequest(store.getAll())

      for (const item of (queueItems as unknown[])) {
        const syncItem = item as SyncQueueItem & { data: { name: string; description: string; currency: string } };
        try {
          if (syncItem.table === STORES.PORTFOLIOS && syncItem.operation === 'CREATE') {
            const result = await SupabaseService.portfolio.createPortfolio(
              syncItem.data.name,
              syncItem.data.description,
              syncItem.data.currency
            )
            
            if (result.success && result.data) {
              await this.updateLocalAfterSync(STORES.PORTFOLIOS, syncItem.localId!, result.data)
              await this.removeSyncItem(syncItem.id)
            }
          }
        } catch (error) {
          console.error('❌ Failed to process sync item:', error)
        }
      }

      this.status.queueSize = await this.getSyncQueueSize()
    } catch (error) {
      console.error('❌ Failed to process sync queue:', error)
    }
  }

  private async downloadFromServer(): Promise<void> {
    try {
      const portfoliosResult = await SupabaseService.portfolio.getPortfolios()
      if (portfoliosResult.success) {
        for (const portfolio of portfoliosResult.data) {
          await this.storeLocally(STORES.PORTFOLIOS, portfolio)
        }
      }
    } catch (error) {
      console.error('❌ Failed to download from server:', error)
    }
  }

  private async removeSyncItem(id: string): Promise<void> {
    if (!this.db) return
    
    try {
      const transaction = this.db.transaction([STORES.SYNC_QUEUE], 'readwrite')
      const store = transaction.objectStore(STORES.SYNC_QUEUE)
      await this.promisifyRequest(store.delete(id))
    } catch (error) {
      console.error('❌ Failed to remove sync item:', error)
    }
  }

  private async updateLocalAfterSync(storeName: string, localId: string, serverData: unknown): Promise<void> {
    if (!this.db) return
    
    try {
      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      
      await this.promisifyRequest(store.delete(localId))
      await this.promisifyRequest(store.put(serverData))
    } catch (error) {
      console.error('❌ Failed to update local after sync:', error)
    }
  }

  private async updateSyncMetadata(): Promise<void> {
    if (!this.db) return
    
    try {
      const metadata = {
        lastSyncTime: Date.now(),
        userId: '',
        conflictResolution: 'server_wins' as const
      }
      
      const transaction = this.db.transaction([STORES.METADATA], 'readwrite')
      const store = transaction.objectStore(STORES.METADATA)
      await this.promisifyRequest(store.put({ key: 'sync_metadata', value: metadata }))
    } catch (error) {
      console.error('❌ Failed to update sync metadata:', error)
    }
  }

  private startPeriodicSync(): void {
    setInterval(() => {
      if (this.status.isOnline && !this.syncInProgress) {
        this.syncWithServer()
      }
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  /**
   * Status management and public API
   */
  public onStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener)
    listener(this.status)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  private updateStatus(): void {
    this.listeners.forEach(listener => {
      try {
        listener({ ...this.status })
      } catch (error) {
        console.error('❌ Error in status listener:', error)
      }
    })
  }

  public getStatus(): SyncStatus {
    return { ...this.status }
  }

  public async forceSync(): Promise<boolean> {
    return await this.syncWithServer()
  }

  public async clearOfflineData(): Promise<boolean> {
    if (!this.db) return false

    try {
      const stores = Object.values(STORES)
      const transaction = this.db.transaction(stores, 'readwrite')
      
      for (const storeName of stores) {
        const store = transaction.objectStore(storeName)
        await this.promisifyRequest(store.clear())
      }

      console.log('🗑️ Offline data cleared')
      return true
    } catch (error) {
      console.error('❌ Failed to clear offline data:', error)
      return false
    }
  }
}

// Export singleton instance
export const offlineStorageService = OfflineStorageService.getInstance()
export default offlineStorageService
