import { storageManager, type File } from './storage-manager'

// Store the state before revert for restore functionality
// Changed to a map to support multiple pre-revert states
let preRevertStates: Map<string, {
  files: File[],
  messages: any[],
  timestamp: number
}> = new Map()

/**
 * Captures the current file state for a workspace to create a checkpoint
 * @param workspaceId The ID of the workspace to capture
 * @param messageId The ID of the message that triggered this checkpoint
 * @returns A promise that resolves to the created checkpoint
 */
export async function createCheckpoint(workspaceId: string, messageId: string) {
  try {
    await storageManager.init()
    
    // Small delay to ensure message is saved to DB before creating checkpoint
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Get all files for the workspace
    const files = await storageManager.getFiles(workspaceId)
    
    // Create a simplified file representation for the checkpoint
    const checkpointFiles = files.map(file => ({
      path: file.path,
      content: file.content,
      name: file.name,
      fileType: file.fileType,
      size: file.size,
      isDirectory: file.isDirectory
    }))
    
    // Create the checkpoint
    const checkpoint = await storageManager.createCheckpoint({
      workspaceId,
      messageId,
      files: checkpointFiles
    })
    
    console.log(`[Checkpoint] Created checkpoint for workspace ${workspaceId} at message ${messageId}`)
    return checkpoint
  } catch (error) {
    console.error('[Checkpoint] Error creating checkpoint:', error)
    throw error
  }
}

/**
 * Restores files to a specific checkpoint state
 * @param checkpointId The ID of the checkpoint to restore
 * @returns A promise that resolves when the restoration is complete
 */
export async function restoreCheckpoint(checkpointId: string) {
  try {
    await storageManager.init()
    
    // Restore the checkpoint
    const success = await storageManager.restoreCheckpoint(checkpointId)
    
    if (success) {
      console.log(`[Checkpoint] Successfully restored checkpoint ${checkpointId}`)
    } else {
      console.warn(`[Checkpoint] Failed to restore checkpoint ${checkpointId}`)
    }
    
    return success
  } catch (error) {
    console.error('[Checkpoint] Error restoring checkpoint:', error)
    throw error
  }
}

/**
 * Gets all checkpoints for a workspace
 * @param workspaceId The ID of the workspace
 * @returns A promise that resolves to an array of checkpoints
 */
export async function getCheckpoints(workspaceId: string) {
  try {
    await storageManager.init()
    return await storageManager.getCheckpoints(workspaceId)
  } catch (error) {
    console.error('[Checkpoint] Error getting checkpoints:', error)
    throw error
  }
}

/**
 * Deletes messages that came after a specific timestamp
 * @param chatSessionId The ID of the chat session
 * @param timestamp The timestamp to delete messages after
 * @returns A promise that resolves to the number of deleted messages
 */
export async function deleteMessagesAfter(chatSessionId: string, timestamp: string) {
  try {
    await storageManager.init()
    
    // Small delay to ensure consistency
    await new Promise(resolve => setTimeout(resolve, 50))
    
    const deletedCount = await storageManager.deleteMessagesAfter(chatSessionId, timestamp)
    
    // Small delay after deletion to ensure DB consistency
    await new Promise(resolve => setTimeout(resolve, 50))
    
    return deletedCount
  } catch (error) {
    console.error('[Checkpoint] Error deleting messages:', error)
    throw error
  }
}

/**
 * Captures the current state before a revert operation for potential restore
 * @param workspaceId The ID of the workspace
 * @param chatSessionId The ID of the chat session
 * @param messageId The ID of the message being reverted to (used as key for storage)
 */
export async function capturePreRevertState(workspaceId: string, chatSessionId: string, messageId: string) {
  try {
    await storageManager.init()
    
    // Get current files
    const files = await storageManager.getFiles(workspaceId)
    
    // Get current messages
    const messages = await storageManager.getMessages(chatSessionId)
    
    // Store the state with the message ID as key
    preRevertStates.set(messageId, {
      files: [...files],
      messages: [...messages],
      timestamp: Date.now()
    })
    
    // Also save to IndexedDB for persistence across page refreshes
    try {
      const key = `preRevertState_${workspaceId}_${messageId}`;
      const stateToSave = {
        files: files.map(f => ({...f})), // Create a copy
        messages: messages.map(m => ({...m})), // Create a copy
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(stateToSave));
    } catch (storageError) {
      console.warn('[Checkpoint] Could not save pre-revert state to localStorage:', storageError);
    }
    
    console.log(`[Checkpoint] Captured pre-revert state for workspace ${workspaceId} at message ${messageId}`)
  } catch (error) {
    console.error('[Checkpoint] Error capturing pre-revert state:', error)
    throw error
  }
}

/**
 * Restores the state that was captured before a revert operation for a specific message
 * @param workspaceId The ID of the workspace
 * @param chatSessionId The ID of the chat session
 * @param messageId The ID of the message to restore from
 * @returns A promise that resolves when the restoration is complete
 */
export async function restorePreRevertState(workspaceId: string, chatSessionId: string, messageId: string) {
  try {
    // First try to get from memory
    let preRevertState = preRevertStates.get(messageId);
    
    // If not in memory, try to get from localStorage
    if (!preRevertState) {
      try {
        const key = `preRevertState_${workspaceId}_${messageId}`;
        const storedState = localStorage.getItem(key);
        if (storedState) {
          preRevertState = JSON.parse(storedState);
          // Add back to memory for faster access next time
          if (preRevertState) {
            preRevertStates.set(messageId, preRevertState);
          }
        }
      } catch (storageError) {
        console.warn('[Checkpoint] Could not load pre-revert state from localStorage:', storageError);
      }
    }
    
    if (!preRevertState) {
      throw new Error('No pre-revert state available for restoration')
    }
    
    // Check if the state is still valid (within 5 minutes)
    const timeDiff = Date.now() - preRevertState.timestamp
    if (timeDiff > 5 * 60 * 1000) { // 5 minutes
      preRevertStates.delete(messageId) // Clean up expired state
      try {
        const key = `preRevertState_${workspaceId}_${messageId}`;
        localStorage.removeItem(key);
      } catch (storageError) {
        console.warn('[Checkpoint] Could not remove expired pre-revert state from localStorage:', storageError);
      }
      throw new Error('Restore period has expired (5 minutes limit)')
    }
    
    await storageManager.init()
    
    // Delete all current files in the workspace
    const currentFiles = await storageManager.getFiles(workspaceId)
    for (const file of currentFiles) {
      await storageManager.deleteFile(workspaceId, file.path)
    }
    
    // Restore files from pre-revert state
    for (const file of preRevertState.files) {
      // Check if file already exists
      const existingFile = await storageManager.getFile(workspaceId, file.path)
      
      if (existingFile) {
        // Update existing file
        await storageManager.updateFile(workspaceId, file.path, {
          content: file.content,
          name: file.name,
          fileType: file.fileType,
          size: file.size,
          isDirectory: file.isDirectory,
          updatedAt: new Date().toISOString()
        })
      } else {
        // Create new file
        await storageManager.createFile({
          workspaceId: file.workspaceId || workspaceId,
          name: file.name,
          path: file.path,
          content: file.content,
          fileType: file.fileType,
          type: file.fileType,
          size: file.size,
          isDirectory: file.isDirectory
        })
      }
    }
    
    // For messages, we'll need to implement a more complex solution
    // For now, we'll just clear the UI state and let it reload
    console.log(`[Checkpoint] Restored pre-revert state for workspace ${workspaceId} at message ${messageId}`)
    
    // Clear the stored state for this message
    preRevertStates.delete(messageId)
    try {
      const key = `preRevertState_${workspaceId}_${messageId}`;
      localStorage.removeItem(key);
    } catch (storageError) {
      console.warn('[Checkpoint] Could not remove pre-revert state from localStorage:', storageError);
    }
    
    return true
  } catch (error) {
    console.error('[Checkpoint] Error restoring pre-revert state:', error)
    throw error
  }
}

/**
 * Checks if there is a valid pre-revert state available for restoration for a specific message
 * @param workspaceId The ID of the workspace (needed for localStorage lookup)
 * @param messageId The ID of the message to check
 * @returns boolean indicating if restore is available
 */
export function isRestoreAvailableForMessage(workspaceId: string, messageId: string): boolean {
  // First check memory
  const preRevertState = preRevertStates.get(messageId)
  if (preRevertState) {
    const timeDiff = Date.now() - preRevertState.timestamp
    return timeDiff <= 5 * 60 * 1000 // 5 minutes
  }
  
  // If not in memory, check localStorage
  try {
    const key = `preRevertState_${workspaceId}_${messageId}`;
    const storedState = localStorage.getItem(key);
    if (storedState) {
      const state = JSON.parse(storedState);
      const timeDiff = Date.now() - state.timestamp
      return timeDiff <= 5 * 60 * 1000 // 5 minutes
    }
  } catch (storageError) {
    console.warn('[Checkpoint] Could not check pre-revert state in localStorage:', storageError);
  }
  
  return false
}

/**
 * Clears all stored pre-revert states
 */
export function clearAllPreRevertStates(workspaceId: string) {
  preRevertStates.clear()
  
  // Also clear from localStorage
  try {
    // Get all keys and remove the ones that match our pattern
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(`preRevertState_${workspaceId}_`)) {
        localStorage.removeItem(key);
      }
    });
  } catch (storageError) {
    console.warn('[Checkpoint] Could not clear pre-revert states from localStorage:', storageError);
  }
}

/**
 * Loads all pre-revert states from localStorage for a workspace
 * @param workspaceId The ID of the workspace
 */
export function loadPreRevertStatesFromStorage(workspaceId: string) {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(`preRevertState_${workspaceId}_`)) {
        try {
          const state = JSON.parse(localStorage.getItem(key)!);
          const messageId = key.replace(`preRevertState_${workspaceId}_`, '');
          
          // Check if still valid
          const timeDiff = Date.now() - state.timestamp
          if (timeDiff <= 5 * 60 * 1000) { // 5 minutes
            preRevertStates.set(messageId, state);
          } else {
            // Remove expired state
            localStorage.removeItem(key);
          }
        } catch (parseError) {
          console.warn('[Checkpoint] Could not parse pre-revert state from localStorage:', parseError);
          localStorage.removeItem(key);
        }
      }
    });
  } catch (storageError) {
    console.warn('[Checkpoint] Could not load pre-revert states from localStorage:', storageError);
  }
}

export default {
  createCheckpoint,
  restoreCheckpoint,
  getCheckpoints,
  deleteMessagesAfter,
  capturePreRevertState,
  restorePreRevertState,
  isRestoreAvailableForMessage,
  clearAllPreRevertStates,
  loadPreRevertStatesFromStorage
}