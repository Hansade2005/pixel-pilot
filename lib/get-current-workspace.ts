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

      // Check /pc-workspace/[id] pattern (for Electron interface)
      const pcWorkspaceMatch = pathname.match(/\/pc-workspace\/([^\/]+)/);
      if (pcWorkspaceMatch) {
        const workspaceId = pcWorkspaceMatch[1];
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
 * First checks IndexedDB cache, then falls back to Supabase API
 */
export async function getWorkspaceDatabaseId(workspaceId: string): Promise<number | null> {
  try {
    // First, try to get from IndexedDB cache
    const workspace = await storageManager.getWorkspace(workspaceId) as WorkspaceWithDatabase;
    if (workspace?.databaseId) {
      return workspace.databaseId;
    }

    // If not in cache, fetch from Supabase API
    const databaseId = await fetchDatabaseIdFromSupabase(workspaceId);
    
    // If found, cache it in IndexedDB for future use
    if (databaseId && workspace) {
      await setWorkspaceDatabase(workspaceId, databaseId);
    }
    
    return databaseId;
  } catch (error) {
    console.error('Error getting workspace database ID:', error);
    return null;
  }
}

/**
 * Get workspace's database ID directly from URL params
 * Handles cases like ?projectId=xxx or ?newProject=xxx&projectId=xxx
 */
export async function getDatabaseIdFromUrl(): Promise<number | null> {
  try {
    if (typeof window === 'undefined') return null;

    const searchParams = new URLSearchParams(window.location.search);
    const pathname = window.location.pathname;
    
    // Extract project ID from various URL patterns
    let projectId: string | null = null;

    // Check /workspace/[id] pattern
    const workspaceMatch = pathname.match(/\/workspace\/([^\/]+)/);
    if (workspaceMatch) {
      projectId = workspaceMatch[1];
    }

    // Check /pc-workspace/[id] pattern
    const pcWorkspaceMatch = pathname.match(/\/pc-workspace\/([^\/]+)/);
    if (pcWorkspaceMatch) {
      projectId = pcWorkspaceMatch[1];
    }

    // Check ?projectId= query param (overrides path-based ID)
    const projectIdParam = searchParams.get('projectId');
    if (projectIdParam) {
      projectId = projectIdParam;
    }

    // Check ?newProject= query param (for new project creation)
    const newProjectParam = searchParams.get('newProject');
    if (newProjectParam) {
      projectId = newProjectParam;
    }

    if (!projectId) {
      console.warn('[getDatabaseIdFromUrl] No project ID found in URL');
      return null;
    }

    // Get database ID for this project
    return await getWorkspaceDatabaseId(projectId);
  } catch (error) {
    console.error('Error getting database ID from URL:', error);
    return null;
  }
}

/**
 * Fetch database ID from Supabase API based on project_id
 */
async function fetchDatabaseIdFromSupabase(projectId: string): Promise<number | null> {
  try {
    const response = await fetch(`/api/database/by-project/${projectId}`);
    
    if (!response.ok) {
      console.warn(`[fetchDatabaseIdFromSupabase] API returned ${response.status} for project ${projectId}`);
      return null;
    }

    const data = await response.json();
    
    if (data.success && data.database?.id) {
      console.log(`[fetchDatabaseIdFromSupabase] Found database ID ${data.database.id} for project ${projectId}`);
      return data.database.id;
    }

    console.warn(`[fetchDatabaseIdFromSupabase] No database found for project ${projectId}`);
    return null;
  } catch (error) {
    console.error('[fetchDatabaseIdFromSupabase] Error:', error);
    return null;
  }
}
