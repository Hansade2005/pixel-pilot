# Checkpoint System Documentation

## Overview

The checkpoint system allows users to save the state of their project files at specific points in time and revert back to those states at any time. This provides a powerful undo/redo functionality for project development.

## How It Works

### 1. Automatic Checkpoint Creation

Whenever a user sends a message in the chat panel, a checkpoint is automatically created that captures the complete state of all files in the project at that moment.

### 2. Checkpoint Storage

Each checkpoint contains:
- Reference to the workspace
- Reference to the user message that triggered it
- Complete snapshot of all files in the workspace
- Creation timestamp

### 3. Reverting to Checkpoints

Users can revert to any previous checkpoint by clicking the revert button (↺) on any user message. This will:
1. Show a confirmation dialog warning about data loss
2. Delete all messages that came after the selected message
3. Delete all current files in the workspace
4. Restore all files from the selected checkpoint
5. Refresh the file explorer to show the restored files

### 4. Restore Functionality

After reverting, users have a limited time (5 minutes) to restore the files and messages that were just reverted using the redo button (↻) in the chat header.

## Implementation Details

### Data Structures

```typescript
interface Checkpoint {
  id: string
  workspaceId: string
  messageId: string
  files: Array<{
    path: string
    content: string
    name: string
    fileType: string
    size: number
    isDirectory: boolean
  }>
  createdAt: string
  label?: string
}
```

### Key Functions

#### `createCheckpoint(workspaceId: string, messageId: string)`
Creates a new checkpoint for the specified workspace at the given message.

#### `restoreCheckpoint(checkpointId: string)`
Restores all files in a workspace to match the state stored in the specified checkpoint.

#### `getCheckpoints(workspaceId: string)`
Retrieves all checkpoints for a specific workspace.

#### `deleteMessagesAfter(chatSessionId: string, timestamp: string)`
Deletes all messages in a chat session that were created after the specified timestamp.

## UI Components

### Revert Button
Each user message in the chat panel has a revert button (↺) in the top-left corner. Hovering over it shows a tooltip "Revert to this version".

### Restore Button
After reverting, a restore button (↻) appears in the chat header for a limited time (5 minutes), allowing users to restore the files and messages that were just reverted.

### Confirmation Dialog
Before reverting, a confirmation dialog warns the user about permanent data loss and explains that messages will also be cleared, and requires explicit confirmation.

## Storage

Checkpoints are stored in the same IndexedDB database as other application data, in a separate object store called `checkpoints`. Each checkpoint is indexed by workspace ID and message ID for efficient retrieval.

Messages that come after a reverted checkpoint are permanently deleted from the database to maintain consistency.

## Performance Considerations

- Checkpoints store complete file snapshots, which can be large for projects with many files
- Consider implementing checkpoint compression or differential storage for large projects
- Old checkpoints are not automatically deleted; a cleanup mechanism might be needed for long-running projects

## Future Improvements

1. **Checkpoint Labels**: Allow users to add custom labels to important checkpoints
2. **Checkpoint Comparison**: Show differences between checkpoints
3. **Selective Restore**: Allow restoring individual files rather than the entire project
4. **Automatic Cleanup**: Implement policies for automatically removing old checkpoints
5. **Checkpoint Sharing**: Allow sharing checkpoints between users or projects
6. **Selective Message Deletion**: Allow users to choose whether to delete messages when reverting
7. **Full Restore Implementation**: Implement complete restore functionality that actually restores the previous state rather than just showing a message