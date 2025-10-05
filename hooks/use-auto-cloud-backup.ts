"use client"

import { useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { uploadBackupToCloud } from "@/lib/cloud-sync"
import { useToast } from "@/hooks/use-toast"

interface AutoBackupOptions {
  debounceMs?: number // Delay before backup to avoid rapid successive backups
  silent?: boolean // Don't show toast notifications
  instantForCritical?: boolean // Enable instant backup for critical operations
}

export function useAutoCloudBackup(options: AutoBackupOptions = {}) {
  const { debounceMs = 2000, silent = false, instantForCritical = false } = options
  const { toast } = useToast()
  
  // Use refs to store timeout and prevent multiple simultaneous backups
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const backupInProgressRef = useRef(false)

  const getCurrentUserId = useCallback(async (): Promise<string | null> => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      return user?.id || null
    } catch (error) {
      console.error("Error getting current user:", error)
      return null
    }
  }, [])

  const performBackup = useCallback(async (): Promise<boolean> => {
    if (backupInProgressRef.current) {
      console.log("Auto-backup already in progress, skipping...")
      return true
    }

    try {
      backupInProgressRef.current = true
      
      const userId = await getCurrentUserId()
      if (!userId) {
        console.warn("No user found, skipping auto-backup")
        return false
      }

      console.log("Performing auto cloud backup...")
      const success = await uploadBackupToCloud(userId)
      
      if (success && !silent) {
        toast({
          title: "Auto-backup Complete",
          description: "Your changes have been safely backed up to the cloud",
          duration: 3000,
        })
      } else if (!success) {
        console.error("Auto-backup failed")
        if (!silent) {
          toast({
            title: "Auto-backup Failed",
            description: "Unable to backup changes to cloud. Please try again later.",
            variant: "destructive",
            duration: 5000,
          })
        }
      }

      return success
    } catch (error) {
      console.error("Error during auto-backup:", error)
      if (!silent) {
        toast({
          title: "Auto-backup Error",
          description: "An error occurred while backing up your changes",
          variant: "destructive",
          duration: 5000,
        })
      }
      return false
    } finally {
      backupInProgressRef.current = false
    }
  }, [getCurrentUserId, silent, toast])

  /**
   * Trigger an automatic cloud backup with debouncing
   */
  const triggerAutoBackup = useCallback((reason?: string, isCritical: boolean = false) => {
    console.log(`Auto-backup triggered: ${reason || 'File operation'}${isCritical ? ' (CRITICAL - instant)' : ''}`)
    
    // For critical operations, backup immediately if instant mode is enabled
    if (isCritical && instantForCritical) {
      console.log('Critical operation detected, performing instant backup...')
      performBackup()
      return
    }
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new debounced backup
    timeoutRef.current = setTimeout(async () => {
      await performBackup()
      timeoutRef.current = null
    }, debounceMs)
  }, [debounceMs, performBackup, instantForCritical])

  /**
   * Force immediate backup (bypassing debounce)
   */
  const forceBackup = useCallback(async (reason?: string): Promise<boolean> => {
    console.log(`Forcing immediate backup: ${reason || 'Forced operation'}`)
    
    // Clear any pending debounced backup
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    return await performBackup()
  }, [performBackup])

  /**
   * Trigger instant backup for critical operations (no delay)
   */
  const triggerInstantBackup = useCallback(async (reason?: string): Promise<boolean> => {
    console.log(`Instant backup triggered: ${reason || 'Critical operation'}`)
    
    // Clear any pending debounced backup
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    return await performBackup()
  }, [performBackup])

  /**
   * Cancel any pending backup
   */
  const cancelPendingBackup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
      console.log("Pending auto-backup cancelled")
    }
  }, [])

  return {
    triggerAutoBackup,
    forceBackup,
    triggerInstantBackup,
    cancelPendingBackup,
    isBackupInProgress: () => backupInProgressRef.current
  }
}