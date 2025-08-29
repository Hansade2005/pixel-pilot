import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadBackupToCloud } from '@/lib/cloud-sync'
import { storageManager } from '@/lib/storage-manager'

/**
 * Hook to automatically sync codebase changes to the cloud when cloud sync is enabled
 */
export function useCloudSync(userId: string | null) {
  const supabase = createClient()
  const lastBackupTime = useRef<number>(Date.now())
  const isSyncing = useRef<boolean>(false)
  
  useEffect(() => {
    if (!userId) return
    
    // Function to check for changes and backup if needed
    const checkAndBackup = async () => {
      // Skip if already syncing or if not enough time has passed since last backup
      if (isSyncing.current || Date.now() - lastBackupTime.current < 30000) return
      
      try {
        // Check if cloud sync is enabled
        const { data: settings, error } = await supabase
          .from('user_settings')
          .select('cloud_sync_enabled')
          .eq('user_id', userId)
          .single()
        
        if (error) {
          console.error('Error fetching user settings:', error)
          return
        }
        
        if (!settings?.cloud_sync_enabled) return
        
        // Set syncing flag
        isSyncing.current = true
        
        // Upload backup to cloud
        const success = await uploadBackupToCloud(userId)
        
        if (success) {
          lastBackupTime.current = Date.now()
        }
      } catch (error) {
        console.error('Error during auto backup:', error)
      } finally {
        isSyncing.current = false
      }
    }
    
    // Set up periodic check for changes
    const interval = setInterval(checkAndBackup, 10000) // Check every 10 seconds
    
    // Clean up interval on unmount
    return () => {
      clearInterval(interval)
    }
  }, [userId])
  
  // Return a function to trigger manual backup
  const triggerBackup = async () => {
    if (!userId || isSyncing.current) return false
    
    try {
      isSyncing.current = true
      const success = await uploadBackupToCloud(userId)
      
      if (success) {
        lastBackupTime.current = Date.now()
      }
      
      return success
    } catch (error) {
      console.error('Error triggering manual backup:', error)
      return false
    } finally {
      isSyncing.current = false
    }
  }
  
  return { triggerBackup }
}