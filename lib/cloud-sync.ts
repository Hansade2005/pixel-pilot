import { createClient } from "@/lib/supabase/client"
import { storageManager } from "@/lib/storage-manager"

// Initialize Supabase client
const supabase = createClient()

/**
 * Upload current IndexedDB data to Supabase Storage as a backup
 */
export async function uploadBackupToCloud(userId: string): Promise<boolean> {
  try {
    // Initialize storage manager
    await storageManager.init()

    // Export all data from IndexedDB
    const data = await storageManager.exportData()

    // PROTECTION AGAINST EMPTY DATA OVERWRITING CLOUD BACKUP
    // Check if local data appears to be cleared (all arrays empty or nearly empty)
    const isLocalDataEmpty = Object.values(data).every((tableData: any) =>
      Array.isArray(tableData) && tableData.length === 0
    )

    if (isLocalDataEmpty) {
      console.log('uploadBackupToCloud: Local data appears empty, checking cloud backup...')

      // Check if there's existing cloud backup
      const { data: existingBackup, error: fetchError } = await supabase
        .from('user_backups')
        .select('backup_data, storage_url, created_at')
        .eq('user_id', userId)
        .single()

      if (!fetchError && (existingBackup?.backup_data || existingBackup?.storage_url)) {
        const hasCloudData = existingBackup.storage_url ||
          (existingBackup.backup_data && Object.values(existingBackup.backup_data).some((tableData: any) =>
            Array.isArray(tableData) && tableData.length > 0
          ))

        if (hasCloudData) {
          console.log('uploadBackupToCloud: Cloud has data but local is empty - likely storage was cleared. Skipping backup to prevent data loss.')
          console.log('uploadBackupToCloud: Consider restoring from cloud instead.')

          // Optionally, we could automatically restore here, but let's be conservative and just skip
          return false
        }
      }

      console.log('uploadBackupToCloud: Both local and cloud data appear empty, proceeding with backup')
    }

    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFilename = `backup-${userId}-${timestamp}.json`

    // CLEANUP: Delete old backup file before uploading new one
    const { data: existingBackup } = await supabase
      .from('user_backups')
      .select('storage_url')
      .eq('user_id', userId)
      .single()

    if (existingBackup?.storage_url) {
      try {
        // Extract filename from storage URL
        const oldFileName = existingBackup.storage_url.split('/').pop()
        if (oldFileName && oldFileName.startsWith('backup-')) {
          console.log(`uploadBackupToCloud: Cleaning up old backup file: ${oldFileName}`)
          await supabase.storage.from('backups').remove([oldFileName])
          console.log('uploadBackupToCloud: Old backup file deleted successfully')
        }
      } catch (cleanupError) {
        console.warn('uploadBackupToCloud: Failed to cleanup old backup file:', cleanupError)
        // Continue with upload even if cleanup fails
      }
    }

    // Convert data to JSON blob
    const jsonString = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })

    console.log(`uploadBackupToCloud: Uploading ${blob.size} bytes to storage`)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('backups')
      .upload(backupFilename, blob, {
        contentType: 'application/json',
        upsert: false
      })

    if (uploadError) {
      console.error('uploadBackupToCloud: Storage upload error:', uploadError)
      throw uploadError
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('backups')
      .getPublicUrl(backupFilename)

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL for uploaded backup')
    }

    // Save metadata to database
    const { error } = await supabase
      .from('user_backups')
      .upsert({
        user_id: userId,
        backup_data: null, // Clear old JSONB data
        storage_url: urlData.publicUrl,
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

    console.log(`uploadBackupToCloud: Successfully uploaded backup to ${urlData.publicUrl}`)
    return true
  } catch (error) {
    console.error("Error uploading backup to cloud:", error)
    return false
  }
}

/**
 * Smart backup function that handles empty data scenarios
 * If local data is empty but cloud has data, it will restore from cloud instead of backing up
 */
export async function smartBackupToCloud(userId: string): Promise<boolean> {
  try {
    console.log('smartBackupToCloud: Starting smart backup for user:', userId)

    // Initialize storage manager
    await storageManager.init()

    // Export all data from IndexedDB
    const data = await storageManager.exportData()
    console.log('smartBackupToCloud: Exported local data, checking emptiness...')

    // Check if local data appears to be cleared
    const tableCounts = Object.entries(data).map(([table, items]) => ({
      table,
      count: Array.isArray(items) ? items.length : 0
    }))
    console.log('smartBackupToCloud: Local data table counts:', tableCounts)

    const isLocalDataEmpty = Object.values(data).every((tableData: any) =>
      Array.isArray(tableData) && tableData.length === 0
    )

    if (isLocalDataEmpty) {
      console.log('smartBackupToCloud: Local data appears empty, checking for cloud backup to restore...')

      // Check if there's existing cloud backup
      const { data: existingBackup, error: fetchError } = await supabase
        .from('user_backups')
        .select('backup_data, storage_url, created_at')
        .eq('user_id', userId)
        .single()

      if (fetchError) {
        console.log('smartBackupToCloud: Error fetching cloud backup:', fetchError)
      } else if (existingBackup?.backup_data || existingBackup?.storage_url) {
        let hasCloudData = false

        if (existingBackup.storage_url) {
          // For storage-based backups, we assume they have data (can't check without downloading)
          console.log('smartBackupToCloud: Found storage-based cloud backup')
          hasCloudData = true
        } else if (existingBackup.backup_data) {
          const cloudData = existingBackup.backup_data
          const cloudTableCounts = Object.entries(cloudData).map(([table, items]) => ({
            table,
            count: Array.isArray(items) ? items.length : 0
          }))
          console.log('smartBackupToCloud: Cloud data table counts:', cloudTableCounts)

          hasCloudData = Object.values(cloudData).some((tableData: any) =>
            Array.isArray(tableData) && tableData.length > 0
          )
        }

        if (hasCloudData) {
          console.log('smartBackupToCloud: Found cloud data, automatically restoring instead of backing up empty local data')
          console.log('smartBackupToCloud: This prevents data loss when browser storage is cleared')
          // Automatically restore from cloud
          return await restoreBackupFromCloud(userId)
        } else {
          console.log('smartBackupToCloud: Cloud data is also empty, proceeding with empty backup')
        }
      } else {
        console.log('smartBackupToCloud: No cloud backup found, proceeding with empty backup')
      }
    } else {
      console.log('smartBackupToCloud: Local data is not empty, proceeding with normal backup')
    }

    // Normal backup process
    console.log('smartBackupToCloud: Executing normal backup process')
    return await uploadBackupToCloud(userId)
  } catch (error) {
    console.error("Error in smart backup:", error)
    return false
  }
}/**
 * Download the latest backup from Supabase and restore it to IndexedDB
 */
export async function restoreBackupFromCloud(userId: string): Promise<boolean> {
  try {
    console.log("restoreBackupFromCloud: Starting restore for user:", userId)

    // Fetch the latest backup from Supabase
    const { data, error } = await supabase
      .from('user_backups')
      .select('backup_data, storage_url')
      .eq('user_id', userId)
      .single()

    console.log("restoreBackupFromCloud: Supabase backup query result - data:", !!data, "error:", error)

    if (error) {
      console.error("restoreBackupFromCloud: Supabase error:", error)
      throw error
    }
    if (!data) {
      console.log("restoreBackupFromCloud: No backup data found")
      return false
    }

    let backupData: any = null

    // Handle new storage-based backups
    if (data.storage_url) {
      console.log("restoreBackupFromCloud: Found storage-based backup, downloading from:", data.storage_url)

      try {
        const response = await fetch(data.storage_url)
        if (!response.ok) {
          throw new Error(`Failed to download backup: ${response.status} ${response.statusText}`)
        }

        const jsonString = await response.text()
        backupData = JSON.parse(jsonString)
        console.log("restoreBackupFromCloud: Successfully downloaded and parsed backup from storage")
      } catch (downloadError) {
        console.error("restoreBackupFromCloud: Failed to download from storage:", downloadError)
        throw downloadError
      }
    }
    // Handle legacy JSONB backups
    else if (data.backup_data) {
      console.log("restoreBackupFromCloud: Found legacy JSONB backup")
      backupData = data.backup_data
    }
    else {
      console.log("restoreBackupFromCloud: No backup data available")
      return false
    }

    console.log("restoreBackupFromCloud: Backup data keys:", Object.keys(backupData))

    // Initialize storage manager
    await storageManager.init()

    // Clear existing data
    console.log("restoreBackupFromCloud: Clearing existing data")
    await storageManager.clearAll()

    // Import backup data to IndexedDB
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

    console.log("restoreBackupFromCloud: Restore completed successfully")
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
    console.log("isCloudSyncEnabled: Checking for user:", userId)
    const { data, error } = await supabase
      .from('user_settings')
      .select('cloud_sync_enabled')
      .eq('user_id', userId)
      .single()

    console.log("isCloudSyncEnabled: Supabase response - data:", data, "error:", error)

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error("isCloudSyncEnabled: Supabase error:", error)
      throw error
    }

    const result = data?.cloud_sync_enabled || false
    console.log("isCloudSyncEnabled: Final result:", result)
    return result
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
    netlify?: string,
    supabase?: string,
    supabase_refresh_token?: string,
    supabase_token_expires_at?: string,
    supabase_project_url?: string,
    supabase_anon_key?: string,
    supabase_service_role_key?: string,
    stripe?: string
  }
): Promise<boolean> {
  try {
    // Build update object with only the provided tokens
    const updateData: any = {
      user_id: userId,
      updated_at: new Date().toISOString()
    }
    
    // Only update the tokens that are explicitly provided
    if (tokens.github !== undefined) updateData.github_token = tokens.github
    if (tokens.vercel !== undefined) updateData.vercel_token = tokens.vercel  
    if (tokens.netlify !== undefined) updateData.netlify_token = tokens.netlify
    if (tokens.supabase !== undefined) updateData.supabase_token = tokens.supabase
    if (tokens.supabase_refresh_token !== undefined) updateData.supabase_refresh_token = tokens.supabase_refresh_token
    if (tokens.supabase_token_expires_at !== undefined) updateData.supabase_token_expires_at = tokens.supabase_token_expires_at
    if (tokens.supabase_project_url !== undefined) updateData.supabase_project_url = tokens.supabase_project_url
    if (tokens.supabase_anon_key !== undefined) updateData.supabase_anon_key = tokens.supabase_anon_key
    if (tokens.supabase_service_role_key !== undefined) updateData.supabase_service_role_key = tokens.supabase_service_role_key
    if (tokens.stripe !== undefined) updateData.stripe_secret_key = tokens.stripe

    const { error } = await supabase
      .from('user_settings')
      .upsert(updateData, {
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
  netlify?: string,
  supabase?: string,
  supabase_refresh_token?: string,
  supabase_token_expires_at?: string,
  supabase_project_url?: string,
  supabase_anon_key?: string,
  supabase_service_role_key?: string,
  stripe?: string
} | null> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('github_token, vercel_token, netlify_token, supabase_token, supabase_refresh_token, supabase_token_expires_at, supabase_project_url, supabase_anon_key, supabase_service_role_key, stripe_secret_key')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      throw error
    }

    return data ? {
      github: data.github_token || undefined,
      vercel: data.vercel_token || undefined,
      netlify: data.netlify_token || undefined,
      supabase: data.supabase_token || undefined,
      supabase_refresh_token: data.supabase_refresh_token || undefined,
      supabase_token_expires_at: data.supabase_token_expires_at || undefined,
      supabase_project_url: data.supabase_project_url || undefined,
      supabase_anon_key: data.supabase_anon_key || undefined,
      supabase_service_role_key: data.supabase_service_role_key || undefined,
      stripe: data.stripe_secret_key || undefined
    } : null
  } catch (error) {
    console.error("Error retrieving deployment tokens:", error)
    return null
  }
}

/**
 * Store deployment connection states for a user
 */
export async function storeDeploymentConnectionStates(
  userId: string, 
  states: {
    github_connected?: boolean,
    vercel_connected?: boolean,
    netlify_connected?: boolean,
    supabase_connected?: boolean,
    stripe_connected?: boolean
  }
): Promise<boolean> {
  try {
    const updateData: any = {
      user_id: userId,
      updated_at: new Date().toISOString()
    }
    
    if (states.github_connected !== undefined) updateData.github_connected = states.github_connected
    if (states.vercel_connected !== undefined) updateData.vercel_connected = states.vercel_connected
    if (states.netlify_connected !== undefined) updateData.netlify_connected = states.netlify_connected
    if (states.supabase_connected !== undefined) updateData.supabase_connected = states.supabase_connected
    if (states.stripe_connected !== undefined) updateData.stripe_connected = states.stripe_connected

    const { error } = await supabase
      .from('user_settings')
      .upsert(updateData, {
        onConflict: 'user_id'
      })

    if (error) throw error

    return true
  } catch (error) {
    console.error("Error storing deployment connection states:", error)
    return false
  }
}

/**
 * Retrieve deployment connection states for a user
 */
export async function getDeploymentConnectionStates(userId: string): Promise<{
  github_connected?: boolean,
  vercel_connected?: boolean,
  netlify_connected?: boolean,
  supabase_connected?: boolean,
  stripe_connected?: boolean
} | null> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('github_connected, vercel_connected, netlify_connected, supabase_connected, stripe_connected')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      throw error
    }

    return data ? {
      github_connected: data.github_connected || false,
      vercel_connected: data.vercel_connected || false,
      netlify_connected: data.netlify_connected || false,
      supabase_connected: data.supabase_connected || false,
      stripe_connected: data.stripe_connected || false
    } : null
  } catch (error) {
    console.error("Error retrieving deployment connection states:", error)
    return null
  }
}
export async function storeSupabaseProjectDetails(
  userId: string,
  projectDetails: {
    projectUrl?: string,
    anonKey?: string,
    serviceRoleKey?: string,
    selectedProjectId?: string,
    selectedProjectName?: string
  }
): Promise<boolean> {
  try {
    const updateData: any = {
      user_id: userId,
      updated_at: new Date().toISOString()
    }

    if (projectDetails.projectUrl !== undefined) updateData.supabase_project_url = projectDetails.projectUrl
    if (projectDetails.anonKey !== undefined) updateData.supabase_anon_key = projectDetails.anonKey
    if (projectDetails.serviceRoleKey !== undefined) updateData.supabase_service_role_key = projectDetails.serviceRoleKey
    if (projectDetails.selectedProjectId !== undefined) updateData.supabase_selected_project_id = projectDetails.selectedProjectId
    if (projectDetails.selectedProjectName !== undefined) updateData.supabase_selected_project_name = projectDetails.selectedProjectName

    const { error } = await supabase
      .from('user_settings')
      .upsert(updateData, {
        onConflict: 'user_id'
      })

    if (error) throw error

    return true
  } catch (error) {
    console.error("Error storing Supabase project details:", error)
    return false
  }
}

/**
 * Retrieve Supabase project details for a user
 */
export async function getSupabaseProjectDetails(userId: string): Promise<{
  projectUrl?: string,
  anonKey?: string,
  serviceRoleKey?: string,
  selectedProjectId?: string,
  selectedProjectName?: string
} | null> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('supabase_project_url, supabase_anon_key, supabase_service_role_key, supabase_selected_project_id, supabase_selected_project_name')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      throw error
    }

    return data ? {
      projectUrl: data.supabase_project_url || undefined,
      anonKey: data.supabase_anon_key || undefined,
      serviceRoleKey: data.supabase_service_role_key || undefined,
      selectedProjectId: data.supabase_selected_project_id || undefined,
      selectedProjectName: data.supabase_selected_project_name || undefined
    } : null
  } catch (error) {
    console.error("Error retrieving Supabase project details:", error)
    return null
  }
}

/**
 * Connect a PixelPilot project to a Supabase project
 */
export async function connectPixelPilotToSupabaseProject(
  userId: string,
  pixelpilotProjectId: string,
  supabaseProjectDetails: {
    supabaseProjectId: string,
    supabaseProjectName: string,
    supabaseProjectUrl?: string,
    supabaseAnonKey?: string,
    supabaseServiceRoleKey?: string
  },
  forceConnect: boolean = false
): Promise<{ success: boolean; conflict?: { existingProjectId: string }; error?: string }> {
  try {
    // Check if this Supabase project is already connected to a different PixelPilot project
    if (!forceConnect) {
      const { data: existingConnection } = await supabase
        .from('supabase_projects')
        .select('pixelpilot_project_id')
        .eq('user_id', userId)
        .eq('supabase_project_id', supabaseProjectDetails.supabaseProjectId)
        .single()

      if (existingConnection && existingConnection.pixelpilot_project_id !== pixelpilotProjectId) {
        return {
          success: false,
          conflict: {
            existingProjectId: existingConnection.pixelpilot_project_id
          }
        }
      }
    }

    const { error } = await supabase
      .from('supabase_projects')
      .upsert({
        pixelpilot_project_id: pixelpilotProjectId,
        user_id: userId,
        supabase_project_id: supabaseProjectDetails.supabaseProjectId,
        supabase_project_name: supabaseProjectDetails.supabaseProjectName,
        supabase_project_url: supabaseProjectDetails.supabaseProjectUrl,
        supabase_anon_key: supabaseProjectDetails.supabaseAnonKey,
        supabase_service_role_key: supabaseProjectDetails.supabaseServiceRoleKey,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,supabase_project_id',
        ignoreDuplicates: false
      })

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error("Error connecting PixelPilot project to Supabase project:", error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Get Supabase project connection for a PixelPilot project
 */
export async function getSupabaseProjectForPixelPilotProject(
  userId: string,
  pixelpilotProjectId: string
): Promise<{
  supabaseProjectId: string,
  supabaseProjectName: string,
  supabaseProjectUrl?: string,
  supabaseAnonKey?: string,
  supabaseServiceRoleKey?: string,
  connectedAt: string,
  updatedAt: string
} | null> {
  try {
    const { data, error } = await supabase
      .from('supabase_projects')
      .select('*')
      .eq('user_id', userId)
      .eq('pixelpilot_project_id', pixelpilotProjectId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      throw error
    }

    return data ? {
      supabaseProjectId: data.supabase_project_id,
      supabaseProjectName: data.supabase_project_name,
      supabaseProjectUrl: data.supabase_project_url || undefined,
      supabaseAnonKey: data.supabase_anon_key || undefined,
      supabaseServiceRoleKey: data.supabase_service_role_key || undefined,
      connectedAt: data.connected_at,
      updatedAt: data.updated_at
    } : null
  } catch (error) {
    console.error("Error retrieving Supabase project connection:", error)
    return null
  }
}

/**
 * Disconnect a PixelPilot project from its Supabase project
 */
export async function disconnectPixelPilotFromSupabaseProject(
  userId: string,
  pixelpilotProjectId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('supabase_projects')
      .delete()
      .eq('user_id', userId)
      .eq('pixelpilot_project_id', pixelpilotProjectId)

    if (error) throw error

    return true
  } catch (error) {
    console.error("Error disconnecting PixelPilot project from Supabase project:", error)
    return false
  }
}

/**
 * List all Supabase project connections for a user
 */
export async function getAllSupabaseProjectConnections(
  userId: string
): Promise<Array<{
  pixelpilotProjectId: string,
  supabaseProjectId: string,
  supabaseProjectName: string,
  supabaseProjectUrl?: string,
  connectedAt: string,
  updatedAt: string
}>> {
  try {
    const { data, error } = await supabase
      .from('supabase_projects')
      .select('pixelpilot_project_id, supabase_project_id, supabase_project_name, supabase_project_url, connected_at, updated_at')
      .eq('user_id', userId)
      .order('connected_at', { ascending: false })

    if (error) throw error

    return (data || []).map(item => ({
      pixelpilotProjectId: item.pixelpilot_project_id,
      supabaseProjectId: item.supabase_project_id,
      supabaseProjectName: item.supabase_project_name,
      supabaseProjectUrl: item.supabase_project_url || undefined,
      connectedAt: item.connected_at,
      updatedAt: item.updated_at
    }))
  } catch (error) {
    console.error("Error retrieving Supabase project connections:", error)
    return []
  }
}

/**
 * Check if Supabase access token is expired or about to expire
 */
export async function isSupabaseTokenExpired(userId: string): Promise<boolean> {
  try {
    const tokens = await getDeploymentTokens(userId)
    if (!tokens?.supabase_token_expires_at) {
      return true // Consider expired if no expiration time
    }

    const expiresAt = new Date(tokens.supabase_token_expires_at)
    const now = new Date()

    // Consider expired if less than 5 minutes remaining
    return expiresAt.getTime() - now.getTime() < 5 * 60 * 1000
  } catch (error) {
    console.error("Error checking token expiration:", error)
    return true // Consider expired on error
  }
}

/**
 * Refresh Supabase access token using the refresh token
 */
export async function refreshSupabaseToken(userId: string): Promise<boolean> {
  try {
    console.log(`[TOKEN-REFRESH] Starting token refresh for user ${userId}`)

    const tokens = await getDeploymentTokens(userId)
    if (!tokens?.supabase_refresh_token) {
      console.error('[TOKEN-REFRESH] No refresh token available')
      return false
    }

    // Call the Supabase Edge Function to refresh the token
    const { data, error } = await supabase.functions.invoke('auto-refresh-tokens', {
      body: { userId, forceRefresh: true }
    })

    if (error) {
      console.error('[TOKEN-REFRESH] Edge function error:', error)
      return false
    }

    if (!data.success) {
      console.error('[TOKEN-REFRESH] Token refresh failed:', data.message)
      return false
    }

    console.log(`[TOKEN-REFRESH] Token refresh successful for user ${userId}`)
    return true

  } catch (error) {
    console.error('[TOKEN-REFRESH] Unexpected error:', error)
    return false
  }
}

/**
 * Get a valid Supabase access token, refreshing if necessary
 */
export async function getValidSupabaseToken(userId: string): Promise<string | null> {
  try {
    // Check if current token is still valid
    const isExpired = await isSupabaseTokenExpired(userId)

    if (isExpired) {
      console.log('[TOKEN-MANAGER] Token expired or about to expire, attempting refresh')
      const refreshSuccess = await refreshSupabaseToken(userId)

      if (!refreshSuccess) {
        console.error('[TOKEN-MANAGER] Token refresh failed')
        return null
      }
    }

    // Get the (potentially refreshed) token
    const tokens = await getDeploymentTokens(userId)
    return tokens?.supabase || null

  } catch (error) {
    console.error('[TOKEN-MANAGER] Error getting valid token:', error)
    return null
  }
}

/**
 * Get the Supabase Management API access token for the current user
 * This is used by AI tools to authenticate with Supabase Management API
 * Automatically refreshes the token if it's expired or about to expire
 */
export async function getSupabaseAccessToken(): Promise<string | null> {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error("No authenticated user found")
      return null
    }

    // Get a valid (potentially refreshed) access token
    return await getValidSupabaseToken(user.id)
  } catch (error) {
    console.error("Error retrieving Supabase access token:", error)
    return null
  }
}

/**
 * Upload large payload data to Supabase Storage and return the public URL
 * Used for bypassing size limits in API requests (GitHub deploy, chat, etc.)
 */
export async function uploadLargePayload(
  data: any,
  payloadType: 'github-deploy' | 'chat-files' | 'template' | 'backup',
  userId: string,
  metadata?: Record<string, any>
): Promise<string | null> {
  try {
    // Create unique filename with timestamp and type
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${payloadType}-${userId}-${timestamp}.json`

    // Convert data to JSON string and check size
    const jsonString = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })

    console.log(`uploadLargePayload: Uploading ${blob.size} bytes (${payloadType}) to storage`)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('temp-payloads') // Use dedicated bucket for temporary payloads
      .upload(filename, blob, {
        contentType: 'application/json',
        upsert: false
      })

    if (uploadError) {
      console.error('uploadLargePayload: Storage upload error:', uploadError)
      throw uploadError
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('temp-payloads')
      .getPublicUrl(filename)

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL for uploaded payload')
    }

    // Store metadata in database for tracking and cleanup
    const { error: dbError } = await supabase
      .from('temp_payloads')
      .insert({
        user_id: userId,
        payload_type: payloadType,
        storage_url: urlData.publicUrl,
        filename: filename,
        size_bytes: blob.size,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      })

    if (dbError) {
      console.warn('uploadLargePayload: Failed to store metadata:', dbError)
      // Don't fail the upload if metadata storage fails
    }

    console.log(`uploadLargePayload: Successfully uploaded ${payloadType} payload to ${urlData.publicUrl}`)
    return urlData.publicUrl
  } catch (error) {
    console.error("Error uploading large payload:", error)
    return null
  }
}

/**
 * Download and parse payload from Supabase Storage URL
 * Used by API routes to retrieve large payloads that were uploaded to bypass size limits
 */
export async function downloadLargePayload(storageUrl: string): Promise<any | null> {
  try {
    console.log(`downloadLargePayload: Downloading payload from ${storageUrl}`)

    // Fetch the data from storage
    const response = await fetch(storageUrl)
    if (!response.ok) {
      throw new Error(`Failed to download payload: ${response.status}`)
    }

    const jsonString = await response.text()
    const data = JSON.parse(jsonString)

    console.log(`downloadLargePayload: Successfully downloaded and parsed payload (${jsonString.length} bytes)`)
    return data
  } catch (error) {
    console.error("Error downloading large payload:", error)
    return null
  }
}

/**
 * Clean up temporary payload from storage after processing
 * Should be called after the payload has been processed by the API
 */
export async function cleanupLargePayload(storageUrl: string): Promise<boolean> {
  try {
    // Extract filename from URL
    const filename = storageUrl.split('/').pop()
    if (!filename) {
      console.warn('cleanupLargePayload: Could not extract filename from URL')
      return false
    }

    console.log(`cleanupLargePayload: Cleaning up temporary payload: ${filename}`)

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('temp-payloads')
      .remove([filename])

    if (storageError) {
      console.warn('cleanupLargePayload: Storage deletion error:', storageError)
      // Don't fail if storage cleanup fails, but log it
    }

    // Delete metadata from database
    const { error: dbError } = await supabase
      .from('temp_payloads')
      .delete()
      .eq('storage_url', storageUrl)

    if (dbError) {
      console.warn('cleanupLargePayload: Database cleanup error:', dbError)
    }

    console.log(`cleanupLargePayload: Successfully cleaned up payload: ${filename}`)
    return true
  } catch (error) {
    console.error("Error cleaning up large payload:", error)
    return false
  }
}