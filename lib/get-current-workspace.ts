/**
 * Helper function to get the current workspace/project
 * Works with your existing IndexedDB storage manager
 */

import { storageManager, Workspace } from './storage-manager';

// Extend Workspace interface with database fields
export interface WorkspaceWithDatabase extends Workspace {
  // NEW: Database fields
  databaseId?: number;  // References Supabase databases.id
  hasDatabase?: boolean; // Quick check for UI
}

/**
 * Get current workspace from URL or localStorage
 */
export async function getCurrentWorkspace(): Promise<WorkspaceWithDatabase | null> {
  try {
    // Method 1: From URL params (workspace page)
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      
      // Check /workspace/[id] pattern
      const workspaceMatch = pathname.match(/\/workspace\/([^\/]+)/);
      if (workspaceMatch) {
        const workspaceId = workspaceMatch[1];
        const workspace = await storageManager.getWorkspace(workspaceId);
        if (workspace) {
          return workspace as WorkspaceWithDatabase;
        }
      }
      
      // Check ?workspaceId= query param
      const workspaceIdParam = searchParams.get('workspaceId');
      if (workspaceIdParam) {
        const workspace = await storageManager.getWorkspace(workspaceIdParam);
        if (workspace) {
          return workspace as WorkspaceWithDatabase;
        }
      }
      
      // Method 2: From localStorage (last active workspace)
      const lastWorkspaceId = localStorage.getItem('currentWorkspaceId');
      if (lastWorkspaceId) {
        const workspace = await storageManager.getWorkspace(lastWorkspaceId);
        if (workspace) {
          return workspace as WorkspaceWithDatabase;
        }
      }
      
      // Method 3: Get most recently active workspace
      // Note: We need userId for getWorkspaces, so we'll try to get it from session
      const userId = localStorage.getItem('userId');
      if (userId) {
        const workspaces = await storageManager.getWorkspaces(userId);
        if (workspaces && workspaces.length > 0) {
          // Sort by lastActivity and return most recent
          const sortedWorkspaces = workspaces.sort((a: Workspace, b: Workspace) => 
            new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
          );
          return sortedWorkspaces[0] as WorkspaceWithDatabase;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting current workspace:', error);
    return null;
  }
}

/**
 * Set workspace database ID in IndexedDB
 */
export async function setWorkspaceDatabase(
  workspaceId: string, 
  databaseId: number
): Promise<void> {
  try {
    const workspace = await storageManager.getWorkspace(workspaceId);
    if (workspace) {
      // Update workspace with database info
      await storageManager.updateWorkspace(workspaceId, {
        ...workspace,
        databaseId,
        hasDatabase: true
      } as any); // Cast to any since we're extending the interface
    }
  } catch (error) {
    console.error('Error setting workspace database:', error);
    throw error;
  }
}

/**
 * Remove database from workspace
 */
export async function removeWorkspaceDatabase(workspaceId: string): Promise<void> {
  try {
    const workspace = await storageManager.getWorkspace(workspaceId);
    if (workspace) {
      // Remove database info from workspace
      await storageManager.updateWorkspace(workspaceId, {
        databaseId: undefined,
        hasDatabase: false
      } as any); // Cast to any since we're extending the interface
    }
  } catch (error) {
    console.error('Error removing workspace database:', error);
    throw error;
  }
}

/**
 * Check if workspace has a database
 */
export async function workspaceHasDatabase(workspaceId: string): Promise<boolean> {
  try {
    const workspace = await storageManager.getWorkspace(workspaceId) as WorkspaceWithDatabase;
    return workspace?.hasDatabase === true;
  } catch (error) {
    console.error('Error checking workspace database:', error);
    return false;
  }
}

/**
 * Get workspace's database ID
 */
export async function getWorkspaceDatabaseId(workspaceId: string): Promise<number | null> {
  try {
    const workspace = await storageManager.getWorkspace(workspaceId) as WorkspaceWithDatabase;
    return workspace?.databaseId || null;
  } catch (error) {
    console.error('Error getting workspace database ID:', error);
    return null;
  }
}
