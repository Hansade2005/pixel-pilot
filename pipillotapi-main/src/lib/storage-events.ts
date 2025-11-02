// Event system for IndexedDB storage changes
// Enables real-time sync to cloud when data changes

export interface StorageEventData {
  tableName: string
  operation: 'create' | 'update' | 'delete'
  recordId: string
  record?: any
  timestamp: number
  userId?: string
}

export interface StorageEventCallback {
  (event: StorageEventData): void | Promise<void>
}

/**
 * Event manager for storage operations
 * Manages listeners for database changes
 */
class StorageEventManager {
  private listeners: Map<string, StorageEventCallback[]> = new Map()
  private isInitialized = false

  /**
   * Initialize the event system
   */
  init(): void {
    if (this.isInitialized) return
    this.isInitialized = true
  }

  /**
   * Register an event listener for a specific table
   */
  on(tableName: string, callback: StorageEventCallback): () => void {
    if (!this.listeners.has(tableName)) {
      this.listeners.set(tableName, [])
    }

    this.listeners.get(tableName)!.push(callback)

    // Return unsubscribe function
    return () => {
      const tableListeners = this.listeners.get(tableName)
      if (tableListeners) {
        const index = tableListeners.indexOf(callback)
        if (index > -1) {
          tableListeners.splice(index, 1)
        }
      }
    }
  }

  /**
   * Register an event listener for all tables
   */
  onAny(callback: StorageEventCallback): () => void {
    return this.on('*', callback)
  }

  /**
   * Emit an event to all listeners for a table
   */
  async emit(event: StorageEventData): Promise<void> {
    const { tableName } = event

    // Emit to specific table listeners
    const tableListeners = this.listeners.get(tableName)
    if (tableListeners) {
      await Promise.all(tableListeners.map(listener => {
        try {
          return listener(event)
        } catch (error) {
          console.error(`Error in storage event listener for ${tableName}:`, error)
          return Promise.resolve()
        }
      }))
    }

    // Emit to wildcard listeners
    const wildcardListeners = this.listeners.get('*')
    if (wildcardListeners) {
      await Promise.all(wildcardListeners.map(listener => {
        try {
          return listener(event)
        } catch (error) {
          console.error(`Error in storage event listener for *:`, error)
          return Promise.resolve()
        }
      }))
    }
  }

  /**
   * Remove all listeners for a table
   */
  removeAllListeners(tableName?: string): void {
    if (tableName) {
      this.listeners.delete(tableName)
    } else {
      this.listeners.clear()
    }
  }

  /**
   * Get the number of listeners for a table
   */
  getListenerCount(tableName: string): number {
    return this.listeners.get(tableName)?.length || 0
  }

  /**
   * Get all table names that have listeners
   */
  getTablesWithListeners(): string[] {
    return Array.from(this.listeners.keys())
  }
}

// Create singleton instance
export const storageEventManager = new StorageEventManager()

/**
 * Helper function to emit storage events with proper error handling
 */
export async function emitStorageEvent(
  tableName: string,
  operation: StorageEventData['operation'],
  recordId: string,
  record?: any,
  userId?: string
): Promise<void> {
  const event: StorageEventData = {
    tableName,
    operation,
    recordId,
    record,
    timestamp: Date.now(),
    userId
  }

  try {
    await storageEventManager.emit(event)
  } catch (error) {
    console.error('Failed to emit storage event:', error)
  }
}

/**
 * Utility function to create event-emitting wrapper for storage operations
 */
export function withStorageEvents<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  tableName: string,
  getOperationType: (args: T, result: R) => StorageEventData['operation'],
  getRecordId: (args: T, result: R) => string,
  getRecord?: (args: T, result: R) => any,
  getUserId?: (args: T, result: R) => string
) {
  return async (...args: T): Promise<R> => {
    const result = await operation(...args)

    try {
      const operationType = getOperationType(args, result)
      const recordId = getRecordId(args, result)
      const record = getRecord ? getRecord(args, result) : undefined
      const userId = getUserId ? getUserId(args, result) : undefined

      await emitStorageEvent(tableName, operationType, recordId, record, userId)
    } catch (error) {
      console.error('Failed to emit event for storage operation:', error)
    }

    return result
  }
}
