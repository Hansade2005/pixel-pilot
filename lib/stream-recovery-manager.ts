/**
 * Stream Recovery Manager
 *
 * Handles persistence and recovery of interrupted AI streams using IndexedDB.
 * Differentiates between user-aborted streams and unintentionally interrupted streams
 * (tab switch, page refresh, network issues).
 */

// Stream state stored in IndexedDB
export interface InterruptedStream {
  id: string // Same as assistant message ID
  projectId: string
  chatSessionId: string
  userMessageId: string // The user message that triggered this stream
  userMessageContent: string
  accumulatedContent: string
  accumulatedReasoning: string
  toolCalls: any[]
  inlineToolCalls: any[]
  continuationState?: any // For continuation if needed
  status: 'streaming' | 'user_aborted' | 'interrupted' | 'recovered'
  startedAt: string
  lastUpdatedAt: string
  interruptedAt?: string
  interruptReason?: 'tab_hidden' | 'page_unload' | 'network_error' | 'unknown'
}

class StreamRecoveryManager {
  private dbName = 'PixelPilotStreamRecoveryDB'
  private storeName = 'interruptedStreams'
  private version = 1
  private db: IDBDatabase | null = null
  private updateDebounceTimer: NodeJS.Timeout | null = null
  private pendingUpdate: Partial<InterruptedStream> | null = null

  async init(): Promise<void> {
    if (this.db) return

    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        console.warn('[StreamRecovery] IndexedDB not available')
        resolve()
        return
      }

      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        console.error('[StreamRecovery] Failed to open database:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('[StreamRecovery] Database initialized')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' })
          store.createIndex('projectId', 'projectId', { unique: false })
          store.createIndex('chatSessionId', 'chatSessionId', { unique: false })
          store.createIndex('status', 'status', { unique: false })
          store.createIndex('lastUpdatedAt', 'lastUpdatedAt', { unique: false })
          console.log('[StreamRecovery] Created interruptedStreams store')
        }
      }
    })
  }

  /**
   * Start tracking a new stream
   */
  async startStream(params: {
    streamId: string
    projectId: string
    chatSessionId: string
    userMessageId: string
    userMessageContent: string
  }): Promise<void> {
    await this.init()
    if (!this.db) return

    const stream: InterruptedStream = {
      id: params.streamId,
      projectId: params.projectId,
      chatSessionId: params.chatSessionId,
      userMessageId: params.userMessageId,
      userMessageContent: params.userMessageContent,
      accumulatedContent: '',
      accumulatedReasoning: '',
      toolCalls: [],
      inlineToolCalls: [],
      status: 'streaming',
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString()
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite')
      const store = tx.objectStore(this.storeName)
      const request = store.put(stream)

      request.onsuccess = () => {
        console.log('[StreamRecovery] Started tracking stream:', params.streamId)
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Update stream progress (debounced to avoid too many writes)
   */
  updateStreamProgress(
    streamId: string,
    update: {
      accumulatedContent?: string
      accumulatedReasoning?: string
      toolCalls?: any[]
      inlineToolCalls?: any[]
      continuationState?: any
    }
  ): void {
    // Store the pending update
    this.pendingUpdate = {
      id: streamId,
      ...update,
      lastUpdatedAt: new Date().toISOString()
    }

    // Debounce writes to every 500ms
    if (this.updateDebounceTimer) {
      clearTimeout(this.updateDebounceTimer)
    }

    this.updateDebounceTimer = setTimeout(() => {
      this.flushPendingUpdate()
    }, 500)
  }

  /**
   * Flush pending update immediately (called on visibility change, etc)
   */
  async flushPendingUpdate(): Promise<void> {
    if (!this.pendingUpdate || !this.db) return

    const update = this.pendingUpdate
    this.pendingUpdate = null

    if (this.updateDebounceTimer) {
      clearTimeout(this.updateDebounceTimer)
      this.updateDebounceTimer = null
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite')
      const store = tx.objectStore(this.storeName)
      const getRequest = store.get(update.id!)

      getRequest.onsuccess = () => {
        const existing = getRequest.result as InterruptedStream | undefined
        if (!existing || existing.status !== 'streaming') {
          resolve()
          return
        }

        const updated: InterruptedStream = {
          ...existing,
          ...update,
          lastUpdatedAt: new Date().toISOString()
        }

        const putRequest = store.put(updated)
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(putRequest.error)
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  /**
   * Mark stream as completed (removes from recovery)
   */
  async completeStream(streamId: string): Promise<void> {
    await this.init()
    if (!this.db) return

    // Flush any pending update first
    await this.flushPendingUpdate()

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite')
      const store = tx.objectStore(this.storeName)
      const request = store.delete(streamId)

      request.onsuccess = () => {
        console.log('[StreamRecovery] Stream completed, removed from recovery:', streamId)
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Mark stream as user-aborted (keeps record but won't recover)
   */
  async markUserAborted(streamId: string): Promise<void> {
    await this.init()
    if (!this.db) return

    // Flush any pending update first
    await this.flushPendingUpdate()

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite')
      const store = tx.objectStore(this.storeName)
      const getRequest = store.get(streamId)

      getRequest.onsuccess = () => {
        const existing = getRequest.result as InterruptedStream | undefined
        if (!existing) {
          resolve()
          return
        }

        const updated: InterruptedStream = {
          ...existing,
          status: 'user_aborted',
          interruptedAt: new Date().toISOString()
        }

        const putRequest = store.put(updated)
        putRequest.onsuccess = () => {
          console.log('[StreamRecovery] Stream marked as user-aborted:', streamId)
          resolve()
        }
        putRequest.onerror = () => reject(putRequest.error)
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  /**
   * Mark stream as interrupted (recoverable)
   */
  async markInterrupted(
    streamId: string,
    reason: 'tab_hidden' | 'page_unload' | 'network_error' | 'unknown'
  ): Promise<void> {
    await this.init()
    if (!this.db) return

    // Flush any pending update first
    await this.flushPendingUpdate()

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite')
      const store = tx.objectStore(this.storeName)
      const getRequest = store.get(streamId)

      getRequest.onsuccess = () => {
        const existing = getRequest.result as InterruptedStream | undefined
        if (!existing || existing.status !== 'streaming') {
          resolve()
          return
        }

        const updated: InterruptedStream = {
          ...existing,
          status: 'interrupted',
          interruptedAt: new Date().toISOString(),
          interruptReason: reason
        }

        const putRequest = store.put(updated)
        putRequest.onsuccess = () => {
          console.log('[StreamRecovery] Stream marked as interrupted:', streamId, reason)
          resolve()
        }
        putRequest.onerror = () => reject(putRequest.error)
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  /**
   * Get interrupted streams for a project that can be recovered
   */
  async getInterruptedStreams(projectId: string): Promise<InterruptedStream[]> {
    await this.init()
    if (!this.db) return []

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readonly')
      const store = tx.objectStore(this.storeName)
      const index = store.index('projectId')
      const request = index.getAll(projectId)

      request.onsuccess = () => {
        const streams = (request.result as InterruptedStream[]).filter(
          s => s.status === 'interrupted' || s.status === 'streaming'
        )
        // Filter out streams that are too old (older than 24 hours)
        const cutoff = Date.now() - 24 * 60 * 60 * 1000
        const validStreams = streams.filter(s => {
          const lastUpdate = new Date(s.lastUpdatedAt).getTime()
          return lastUpdate > cutoff
        })
        resolve(validStreams)
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get a specific stream by ID
   */
  async getStream(streamId: string): Promise<InterruptedStream | null> {
    await this.init()
    if (!this.db) return null

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readonly')
      const store = tx.objectStore(this.storeName)
      const request = store.get(streamId)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Mark stream as recovered (keeps for history but won't show recovery prompt)
   */
  async markRecovered(streamId: string): Promise<void> {
    await this.init()
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite')
      const store = tx.objectStore(this.storeName)
      const getRequest = store.get(streamId)

      getRequest.onsuccess = () => {
        const existing = getRequest.result as InterruptedStream | undefined
        if (!existing) {
          resolve()
          return
        }

        const updated: InterruptedStream = {
          ...existing,
          status: 'recovered'
        }

        const putRequest = store.put(updated)
        putRequest.onsuccess = () => {
          console.log('[StreamRecovery] Stream marked as recovered:', streamId)
          resolve()
        }
        putRequest.onerror = () => reject(putRequest.error)
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  /**
   * Dismiss a stream (user chose not to recover)
   */
  async dismissStream(streamId: string): Promise<void> {
    await this.init()
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite')
      const store = tx.objectStore(this.storeName)
      const request = store.delete(streamId)

      request.onsuccess = () => {
        console.log('[StreamRecovery] Stream dismissed:', streamId)
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Clean up old streams (older than 7 days)
   */
  async cleanupOldStreams(): Promise<void> {
    await this.init()
    if (!this.db) return

    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite')
      const store = tx.objectStore(this.storeName)
      const request = store.openCursor()
      let deletedCount = 0

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          const stream = cursor.value as InterruptedStream
          const lastUpdate = new Date(stream.lastUpdatedAt).getTime()
          if (lastUpdate < cutoff) {
            cursor.delete()
            deletedCount++
          }
          cursor.continue()
        } else {
          if (deletedCount > 0) {
            console.log('[StreamRecovery] Cleaned up', deletedCount, 'old streams')
          }
          resolve()
        }
      }
      request.onerror = () => reject(request.error)
    })
  }
}

// Singleton instance
export const streamRecoveryManager = new StreamRecoveryManager()
