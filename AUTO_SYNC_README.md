# Auto-Sync Feature Documentation

## Overview

The Auto-Sync feature provides real-time synchronization of IndexedDB changes to the cloud. Instead of periodic polling, this system uses event-driven synchronization that triggers immediately when data changes occur in the database.

## Architecture

### Components

1. **Storage Events System** (`lib/storage-events.ts`)
   - Event manager for database operations
   - Emits events when data changes occur
   - Supports table-specific and wildcard listeners

2. **Auto-Sync Service** (`lib/auto-sync-service.ts`)
   - Listens to storage events
   - Manages sync throttling and error handling
   - Implements exponential backoff for failed syncs
   - Buffers rapid events to prevent spam

3. **Enhanced Storage Manager** (`lib/storage-manager.ts`)
   - Emits events for all CRUD operations
   - Integrated with IndexedDB operations

4. **Updated Cloud Sync Hook** (`hooks/use-cloud-sync.ts`)
   - Uses real-time events for immediate sync
   - Falls back to periodic sync if needed
   - Manages auto-sync service lifecycle

## Features

### Real-Time Sync
- Triggers sync immediately when data changes
- No more waiting for periodic checks
- Event-driven architecture for better performance

### Smart Throttling
- Buffers rapid events (2-second window)
- Prevents excessive cloud API calls
- Minimum 5-second gap between syncs

### Error Handling
- Exponential backoff for failed syncs
- Maximum retry attempts (5 consecutive failures)
- Temporary disable after too many failures
- Auto-reenable after recovery period

### Event Filtering
- Skips sync for certain tables (checkpoints, conversation memory)
- User-specific filtering
- Configurable skip rules

## Usage

### Basic Setup

```typescript
import { useCloudSync } from '@/hooks/use-cloud-sync'

function MyComponent() {
  const { triggerBackup, getSyncStatus, forceSync } = useCloudSync(userId)

  // Manual backup
  const handleBackup = async () => {
    const success = await triggerBackup()
    console.log('Backup result:', success)
  }

  // Force immediate sync
  const handleForceSync = async () => {
    const success = await forceSync()
    console.log('Force sync result:', success)
  }

  // Get current sync status
  const status = getSyncStatus()
  console.log('Sync status:', status)

  return (
    <div>
      <button onClick={handleBackup}>Manual Backup</button>
      <button onClick={handleForceSync}>Force Sync</button>
      <div>Status: {status.isEnabled ? 'Enabled' : 'Disabled'}</div>
      <div>Failures: {status.consecutiveFailures}</div>
      <div>Buffered Events: {status.bufferedEvents}</div>
    </div>
  )
}
```

### Manual Service Control

```typescript
import { initAutoSync, setAutoSyncEnabled, getAutoSyncStatus } from '@/lib/auto-sync-service'

// Initialize for a user
await initAutoSync('user-id')

// Enable/disable auto-sync
await setAutoSyncEnabled(true)

// Get detailed status
const status = getAutoSyncStatus()
console.log('Detailed status:', status)
```

### Listening to Storage Events

```typescript
import { storageEventManager } from '@/lib/storage-events'

// Listen to specific table events
const unsubscribe = storageEventManager.on('workspaces', (event) => {
  console.log('Workspace changed:', event)
})

// Listen to all events
const unsubscribeAll = storageEventManager.onAny((event) => {
  console.log('Any change:', event)
})

// Cleanup
unsubscribe()
unsubscribeAll()
```

## Configuration

### Sync Settings

The auto-sync service can be configured through these parameters:

- **Throttle Delay**: 5 seconds minimum between syncs
- **Buffer Delay**: 2 seconds for event buffering
- **Max Failures**: 5 consecutive failures before disabling
- **Backoff Multiplier**: 2x delay increase per failure
- **Max Backoff**: 5 minutes maximum retry delay

### Skip Rules

By default, sync is skipped for:
- `checkpoints` table
- `conversationMemories` table
- Events with mismatched user IDs

## Testing

Run the test suite:

```bash
npm test -- __tests__/auto-sync-test.ts
```

### Test Coverage

- Event emission and listening
- Service initialization and lifecycle
- Error handling and recovery
- Event buffering and throttling
- User switching and cleanup

## Migration from Periodic Sync

The new system is backward compatible. The `useCloudSync` hook now:

1. Initializes the auto-sync service for real-time sync
2. Maintains periodic sync as a fallback (every 60 seconds)
3. Automatically manages service lifecycle

No changes are required to existing code using `useCloudSync`.

## Monitoring and Debugging

### Status Information

```typescript
const status = getAutoSyncStatus()

// Available properties:
{
  isEnabled: boolean,        // Is auto-sync enabled
  isInitialized: boolean,   // Is service initialized
  userId: string | null,    // Current user ID
  lastSyncTime: number,     // Timestamp of last sync
  hasPendingSync: boolean,  // Is there a pending sync operation
  consecutiveFailures: number, // Number of consecutive failures
  bufferedEvents: number,   // Number of events in buffer
  isRetrying: boolean       // Is service in retry mode
}
```

### Console Logging

The service provides detailed console logging:

- `Auto-sync service: Event listeners set up` - Service initialization
- `Auto-sync service: Syncing X changes to cloud...` - Sync operations
- `Auto-sync service: Sync completed successfully` - Successful sync
- `Auto-sync service: Sync failed (X/Y): reason` - Failed sync with retry info

### Common Issues

1. **Sync not triggering**: Check if cloud sync is enabled in user settings
2. **Too many API calls**: Adjust throttle settings or buffer delay
3. **Service disabled**: Check consecutive failures and retry status
4. **Events not firing**: Verify storage manager is emitting events correctly

## Performance Considerations

- **Event Buffering**: Groups rapid changes to reduce API calls
- **Throttling**: Prevents excessive sync operations
- **Selective Sync**: Only syncs relevant data changes
- **Error Recovery**: Automatic handling of temporary failures

## Future Enhancements

- **Selective Field Sync**: Only sync changed fields
- **Batch Operations**: Group multiple changes in single sync
- **Offline Queue**: Queue syncs when offline
- **Conflict Resolution**: Handle concurrent modifications
- **Sync Progress**: Real-time progress indicators
