import { createClient } from "@/lib/supabase/client"
import { storageManager } from "@/lib/storage-manager"

// Initialize Supabase client
const supabase = createClient()

/**
 * Upload current IndexedDB data to Supabase as a backup
 */
export async function uploadBackupToCloud(userId: string): Promise<boolean> {
  try {
    // Initialize storage manager
    await storageManager.init()
    
    // Export all data from IndexedDB
    const data = await storageManager.exportData()
    
    // Save to Supabase
    const { error } = await supabase
      .from('user_backups')
      .upsert({
        user_id: userId,
        backup_data: data,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (error) throw error

    // Update last backup time in user settings
    const now = new Date().toISOString()
    await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        last_backup: now,
        updated_at: now
      }, {
        onConflict: 'user_id'
      })

    return true
  } catch (error) {
    console.error("Error uploading backup to cloud:", error)
    return false
  }
}

/**
 * Download the latest backup from Supabase and restore it to IndexedDB
 */
export async function restoreBackupFromCloud(userId: string): Promise<boolean> {
  try {
    // Fetch the latest backup from Supabase
    const { data, error } = await supabase
      .from('user_backups')
      .select('backup_data')
      .eq('user_id', userId)
      .single()

    if (error) throw error
    if (!data) return false

    // Initialize storage manager
    await storageManager.init()
    
    // Clear existing data
    await storageManager.clearAll()
    
    // Import backup data to IndexedDB
    const backupData = data.backup_data
    
    // Import each table's data
    for (const [tableName, tableData] of Object.entries(backupData)) {
      if (Array.isArray(tableData) && tableData.length > 0) {
        // Skip importing if the table doesn't exist in storage manager
        try {
          // Check if the method exists before calling it
          if (typeof storageManager.importTable === 'function') {
            await storageManager.importTable(tableName, tableData)
          } else {
            console.warn(`importTable method not found on storageManager for table: ${tableName}`)
          }
        } catch (importError) {
          console.warn(`Could not import table ${tableName}:`, importError)
        }
      }
    }

    return true
  } catch (error) {
    console.error("Error restoring backup from cloud:", error)
    return false
  }
}

/**
 * Check if cloud sync is enabled for the user
 */
export async function isCloudSyncEnabled(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('cloud_sync_enabled')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      throw error
    }

    return data?.cloud_sync_enabled || false
  } catch (error) {
    console.error("Error checking cloud sync status:", error)
    return false
  }
}

/**
 * Enable or disable cloud sync for the user
 */
export async function setCloudSyncEnabled(userId: string, enabled: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        cloud_sync_enabled: enabled,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (error) throw error

    return true
  } catch (error) {
    console.error("Error setting cloud sync status:", error)
    return false
  }
}

/**
 * Get the timestamp of the last backup
 */
export async function getLastBackupTime(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('last_backup')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      throw error
    }

    return data?.last_backup || null
  } catch (error) {
    console.error("Error getting last backup time:", error)
    return null
  }
}

/**
 * Store deployment tokens for a user
 */
export async function storeDeploymentTokens(
  userId: string, 
  tokens: {
    github?: string, 
    vercel?: string, 
    netlify?: string
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        github_token: tokens.github || null,
        vercel_token: tokens.vercel || null,
        netlify_token: tokens.netlify || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (error) throw error

    return true
  } catch (error) {
    console.error("Error storing deployment tokens:", error)
    return false
  }
}

/**
 * Retrieve deployment tokens for a user
 */
export async function getDeploymentTokens(userId: string): Promise<{
  github?: string, 
  vercel?: string, 
  netlify?: string
} | null> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('github_token, vercel_token, netlify_token')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      throw error
    }

    return data ? {
      github: data.github_token || undefined,
      vercel: data.vercel_token || undefined,
      netlify: data.netlify_token || undefined
    } : null
  } catch (error) {
    console.error("Error retrieving deployment tokens:", error)
    return null
  }
}