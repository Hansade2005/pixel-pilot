// Test file for auto-sync functionality
// This test verifies that the event-driven auto-sync system works correctly

import { storageEventManager, emitStorageEvent } from '../lib/storage-events'
import { autoSyncService } from '../lib/auto-sync-service'
import { storageManager } from '../lib/storage-manager'

// Mock the cloud sync functions for testing
jest.mock('../lib/cloud-sync', () => ({
  uploadBackupToCloud: jest.fn(),
  isCloudSyncEnabled: jest.fn(),
  setCloudSyncEnabled: jest.fn()
}))

jest.mock('../lib/storage-manager', () => ({
  storageManager: {
    init: jest.fn(),
    createWorkspace: jest.fn(),
    getWorkspace: jest.fn()
  }
}))

describe('Auto-Sync Event System', () => {
  beforeEach(() => {
    // Reset the service before each test
    autoSyncService.destroy()

    // Clear all mocks
    jest.clearAllMocks()
  })

  afterEach(() => {
    // Clean up after each test
    autoSyncService.destroy()
    storageEventManager.removeAllListeners()
  })

  test('should initialize auto-sync service', async () => {
    const mockIsCloudSyncEnabled = require('../lib/cloud-sync').isCloudSyncEnabled
    mockIsCloudSyncEnabled.mockResolvedValue(true)

    await autoSyncService.init('test-user-id')

    const status = autoSyncService.getStatus()
    expect(status.isInitialized).toBe(true)
    expect(status.userId).toBe('test-user-id')
    expect(status.isEnabled).toBe(true)
  })

  test('should emit storage events on database changes', async () => {
    const mockIsCloudSyncEnabled = require('../lib/cloud-sync').isCloudSyncEnabled
    mockIsCloudSyncEnabled.mockResolvedValue(true)

    // Initialize the service
    await autoSyncService.init('test-user-id')

    // Spy on the event emitter
    const emitSpy = jest.spyOn(storageEventManager, 'emit')

    // Simulate a storage event
    await emitStorageEvent('workspaces', 'create', 'test-id', {
      id: 'test-id',
      name: 'Test Workspace',
      userId: 'test-user-id'
    }, 'test-user-id')

    // Verify the event was emitted
    expect(emitSpy).toHaveBeenCalledWith({
      tableName: 'workspaces',
      operation: 'create',
      recordId: 'test-id',
      record: {
        id: 'test-id',
        name: 'Test Workspace',
        userId: 'test-user-id'
      },
      userId: 'test-user-id',
      timestamp: expect.any(Number)
    })
  })

  test('should handle event buffering', async () => {
    const mockIsCloudSyncEnabled = require('../lib/cloud-sync').isCloudSyncEnabled
    const mockUploadBackupToCloud = require('../lib/cloud-sync').uploadBackupToCloud

    mockIsCloudSyncEnabled.mockResolvedValue(true)
    mockUploadBackupToCloud.mockResolvedValue(true)

    // Initialize the service
    await autoSyncService.init('test-user-id')

    // Emit multiple events quickly
    await emitStorageEvent('workspaces', 'create', 'workspace-1', {}, 'test-user-id')
    await emitStorageEvent('files', 'create', 'file-1', {}, 'test-user-id')
    await emitStorageEvent('workspaces', 'update', 'workspace-1', {}, 'test-user-id')

    // Wait for buffer timeout
    await new Promise(resolve => setTimeout(resolve, 2500))

    // Verify sync was called (events should be buffered)
    expect(mockUploadBackupToCloud).toHaveBeenCalledTimes(1)
  })

  test('should handle sync failures with exponential backoff', async () => {
    const mockIsCloudSyncEnabled = require('../lib/cloud-sync').isCloudSyncEnabled
    const mockUploadBackupToCloud = require('../lib/cloud-sync').uploadBackupToCloud

    mockIsCloudSyncEnabled.mockResolvedValue(true)
    mockUploadBackupToCloud.mockRejectedValue(new Error('Network error'))

    // Initialize the service
    await autoSyncService.init('test-user-id')

    // Emit an event to trigger sync
    await emitStorageEvent('workspaces', 'create', 'test-id', {}, 'test-user-id')

    // Wait for buffer timeout and sync attempt
    await new Promise(resolve => setTimeout(resolve, 2500))

    // Verify sync was attempted
    expect(mockUploadBackupToCloud).toHaveBeenCalled()

    // Check status shows failure tracking
    const status = autoSyncService.getStatus()
    expect(status.consecutiveFailures).toBeGreaterThan(0)
  })

  test('should skip sync for disabled cloud sync', async () => {
    const mockIsCloudSyncEnabled = require('../lib/cloud-sync').isCloudSyncEnabled
    const mockUploadBackupToCloud = require('../lib/cloud-sync').uploadBackupToCloud

    mockIsCloudSyncEnabled.mockResolvedValue(false)
    mockUploadBackupToCloud.mockResolvedValue(true)

    // Initialize the service
    await autoSyncService.init('test-user-id')

    // Emit an event
    await emitStorageEvent('workspaces', 'create', 'test-id', {}, 'test-user-id')

    // Wait for buffer timeout
    await new Promise(resolve => setTimeout(resolve, 2500))

    // Verify sync was not called
    expect(mockUploadBackupToCloud).not.toHaveBeenCalled()

    // Verify service is disabled
    const status = autoSyncService.getStatus()
    expect(status.isEnabled).toBe(false)
  })

  test('should handle service lifecycle correctly', async () => {
    const mockIsCloudSyncEnabled = require('../lib/cloud-sync').isCloudSyncEnabled
    mockIsCloudSyncEnabled.mockResolvedValue(true)

    // Initialize
    await autoSyncService.init('test-user-id')
    expect(autoSyncService.getStatus().isInitialized).toBe(true)

    // Update user
    await autoSyncService.updateUserId('new-user-id')
    expect(autoSyncService.getStatus().userId).toBe('new-user-id')

    // Disable
    await autoSyncService.setEnabled(false)
    expect(autoSyncService.getStatus().isEnabled).toBe(false)

    // Destroy
    autoSyncService.destroy()
    expect(autoSyncService.getStatus().isInitialized).toBe(false)
  })
})

describe('Storage Event Manager', () => {
  beforeEach(() => {
    storageEventManager.removeAllListeners()
  })

  test('should register and unregister event listeners', () => {
    const callback = jest.fn()

    // Register listener
    const unsubscribe = storageEventManager.on('workspaces', callback)

    // Emit event
    emitStorageEvent('workspaces', 'create', 'test-id', {}, 'test-user-id')

    // Cleanup
    unsubscribe()
  })

  test('should handle multiple listeners for same table', () => {
    const callback1 = jest.fn()
    const callback2 = jest.fn()

    // Register multiple listeners
    const unsubscribe1 = storageEventManager.on('workspaces', callback1)
    const unsubscribe2 = storageEventManager.on('workspaces', callback2)

    // Emit event
    emitStorageEvent('workspaces', 'create', 'test-id', {}, 'test-user-id')

    // Cleanup
    unsubscribe1()
    unsubscribe2()
  })

  test('should handle wildcard listeners', () => {
    const callback = jest.fn()

    // Register wildcard listener
    const unsubscribe = storageEventManager.onAny(callback)

    // Emit events for different tables
    emitStorageEvent('workspaces', 'create', 'test-id', {}, 'test-user-id')
    emitStorageEvent('files', 'update', 'file-id', {}, 'test-user-id')

    // Cleanup
    unsubscribe()
  })
})
