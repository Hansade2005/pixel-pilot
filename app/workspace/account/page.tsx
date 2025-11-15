"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  User,
  Mail,
  Lock,
  Trash2,
  RefreshCw,
  Cloud,
  CloudOff,
  CheckCircle,
  AlertCircle,
  Info,
  ExternalLink,
  Unlink,
  Loader2,
  Check,
  X,
  Edit3,
  CreditCard,
  TrendingUp,
  Zap,
  Calendar,
  Download,
  Settings,
  Crown,
  BarChart3,
  Receipt,
  AlertTriangle,
  Plus
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { storageManager } from "@/lib/storage-manager"
import { PRODUCT_CONFIGS, getLimits } from "@/lib/stripe-config"
import {
  uploadBackupToCloud,
  restoreBackupFromCloud,
  isCloudSyncEnabled as isCloudSyncEnabledUtil,
  isCloudSyncEnabled,
  setCloudSyncEnabled as setCloudSyncEnabledUtil,
  getLastBackupTime as getLastBackupTimeUtil,
  storeDeploymentTokens,
  getDeploymentTokens,
  storeDeploymentConnectionStates,
  getDeploymentConnectionStates,
  storeSupabaseProjectDetails,
  getSupabaseProjectDetails
} from "@/lib/cloud-sync"
import { useSupabaseToken } from "@/hooks/use-supabase-token"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"

// Custom SVG Icons
const GitHubIcon = ({ className }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className}>
    <title>GitHub</title>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
  </svg>
)

const VercelIcon = ({ className }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className}>
    <title>Vercel</title>
    <path d="m12 1.608 12 20.784H0Z"/>
  </svg>
)

const NetlifyIcon = ({ className }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className}>
    <title>Netlify</title>
    <path d="M6.49 19.04h-.23L5.13 17.9v-.23l1.73-1.71h1.2l.15.15v1.2L6.5 19.04ZM5.13 6.31V6.1l1.13-1.13h.23L8.2 6.68v1.2l-.15.15h-1.2L5.13 6.31Zm9.96 9.09h-1.65l-.14-.13v-3.83c0-.68-.27-1.2-1.1-1.23-.42 0-.9 0-1.43.02l-.07.08v4.96l-.14.14H8.9l-.13-.14V8.73l.13-.14h3.7a2.6 2.6 0 0 1 2.61 2.6v4.08l-.13.14Zm-8.37-2.44H.14L0 12.82v-1.64l.14-.14h6.58l.14.14v1.64l-.14.14Zm17.14 0h-6.58l-.14-.14v-1.64l.14-.14h6.58l.14.14v1.64l-.14.14ZM11.05 6.55V1.64l.14-.14h1.65l.14.14v4.9l-.14.14h-1.65l-.14-.13Zm0 15.81v-4.9l.14-.14h1.65l.14.13v4.91l-.14.14h-1.65l-.14-.14Z"/>
  </svg>
)

const SupabaseIcon = ({ className }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className}>
    <title>Supabase</title>
    <path d="M21.362 9.354H12V.396a.396.396 0 0 0-.716-.233L2.724 9.355H.642A.643.643 0 0 0 0 10v4a.64.64 0 0 0 .643.643h2.724l8.56 9.192a.396.396 0 0 0 .716-.233V14.61h9.362a.643.643 0 0 0 .643-.643v-4a.643.643 0 0 0-.643-.643Z"/>
  </svg>
)

function AccountSettingsPageContent() {
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [cloudSyncEnabled, setCloudSyncEnabledState] = useState(false)
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [backupStatus, setBackupStatus] = useState<"idle" | "syncing" | "success" | "error">("idle")

  // Auto-restore state
  const [isAutoRestoring, setIsAutoRestoring] = useState(false)

  // Profile editing state
  const [isEditingName, setIsEditingName] = useState(false)
  const [editingName, setEditingName] = useState("")
  const [isUpdatingName, setIsUpdatingName] = useState(false)

  // Supabase token management
  const { token: supabaseToken, isLoading: tokenLoading, isExpired: tokenExpired, error: tokenError, refreshToken: refreshSupabaseToken, lastRefresh } = useSupabaseToken()

  // Connection status states
  const [connections, setConnections] = useState<{
    github: { connected: boolean; username: string; avatarUrl: string; loading: boolean };
    vercel: { connected: boolean; username: string; avatarUrl: string; loading: boolean };
    netlify: { connected: boolean; username: string; avatarUrl: string; loading: boolean };
    supabase: { connected: boolean; username: string; avatarUrl: string; loading: boolean; projects: any[]; selectedProject: any | null };
  }>({
    github: { connected: false, username: '', avatarUrl: '', loading: false },
    vercel: { connected: false, username: '', avatarUrl: '', loading: false },
    netlify: { connected: false, username: '', avatarUrl: '', loading: false },
    supabase: { connected: false, username: '', avatarUrl: '', loading: false, projects: [], selectedProject: null }
  })

  // Connection form states
  const [connectionForms, setConnectionForms] = useState({
    github: { token: '', isValidating: false, error: '' },
    vercel: { token: '', isValidating: false, error: '' },
    netlify: { token: '', isValidating: false, error: '' },
    supabase: { token: '', anonKey: '', serviceRoleKey: '', isValidating: false, error: '' }
  })
  
  // Password change form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })

  // Subscription state
  const [subscription, setSubscription] = useState<any>(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(false)
  const [usageStats, setUsageStats] = useState({
    deploymentsThisMonth: 0,
    githubPushesThisMonth: 0,
    storageUsed: 0
  })

  // Delete account form state
  const [deleteConfirmation, setDeleteConfirmation] = useState("")

  const supabase = createClient()
  const searchParams = useSearchParams()

  // Handle OAuth callback parameters
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const token = searchParams.get('token')
      const refreshToken = searchParams.get('refreshToken')
      const expiresIn = searchParams.get('expiresIn')
      const processed = searchParams.get('processed')
      
      console.log('[OAUTH] Current URL:', window.location.href)
      console.log('[OAUTH] handleOAuthCallback called:', { 
        hasToken: !!token, 
        hasRefreshToken: !!refreshToken,
        expiresIn: expiresIn,
        tokenLength: token?.length || 0,
        refreshTokenLength: refreshToken?.length || 0,
        hasUser: !!user?.id, 
        userId: user?.id,
        processed: processed 
      })
      
      // Only process if we have a token and haven't processed it yet
      if (token && user?.id && !processed) {
        console.log('[OAUTH] Starting OAuth callback processing...')
        try {
          // Mark as processed to prevent re-processing
          const newUrl = new URL(window.location.href)
          newUrl.searchParams.set('processed', 'true')
          window.history.replaceState({}, document.title, newUrl.pathname + newUrl.search)

          // First validate the token before storing it
          console.log('[OAUTH] Validating Supabase OAuth token...')
          
          // Call our server-side API to validate the token (avoids CORS issues)
          console.log('[OAUTH] Calling server API to validate token...')
          const validateResponse = await fetch('/api/supabase/validate-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
          })
          
          const validateResult = await validateResponse.json()
          
          if (!validateResponse.ok || !validateResult.valid) {
            throw new Error(validateResult.error || 'Token validation failed')
          }
          
          const projects = validateResult.projects || []
          console.log('[OAUTH] Token validation successful, found', projects.length, 'projects')

          // Store the Supabase access token, refresh token, and expiration time
          console.log('[OAUTH] Storing token, refresh token, and expiration time...')
          
          // Calculate expiration timestamp
          const expiresAt = expiresIn ? new Date(Date.now() + (parseInt(expiresIn) * 1000)).toISOString() : null
          
          const tokensToStore: any = { 
            supabase: token,
            supabase_refresh_token: refreshToken,
            supabase_token_expires_at: expiresAt
          }
          const success = await storeDeploymentTokens(user.id, tokensToStore)
          
          if (!success) {
            console.error('[OAUTH] Failed to store token in database')
            throw new Error('Failed to save your Supabase token to the database. Please try again or contact support if the issue persists.')
          }

          console.log('[OAUTH] Token stored successfully')
          // Store connection state
          const statesToStore: any = { supabase_connected: true }
          const connectionSuccess = await storeDeploymentConnectionStates(user.id, statesToStore)
          
          if (!connectionSuccess) {
            console.error('[OAUTH] Failed to store connection state')
            throw new Error('Token saved but failed to update connection status. Please refresh the page.')
          }
          
          console.log('[OAUTH] Connection state stored successfully')

          // Refresh connection status to show the new connection
          console.log('[OAUTH] Calling checkConnectionStatus after successful token storage...')
          try {
            await checkConnectionStatus(user.id)
            console.log('[OAUTH] checkConnectionStatus completed successfully')
          } catch (connectionCheckError: any) {
            console.error('[OAUTH] checkConnectionStatus failed:', connectionCheckError)
            // Don't throw here, as the token was saved successfully
            // Just log the error and continue
          }

          // Clear URL parameters
          window.history.replaceState({}, document.title, window.location.pathname)

          toast({
            title: "Connected to Supabase",
            description: `Successfully connected to Supabase via OAuth (${projects?.length || 0} projects available)`,
          })
        } catch (error: any) {
          console.error("Error handling OAuth callback:", error)
          
          // Clear URL parameters even on error
          window.history.replaceState({}, document.title, window.location.pathname)
          
          // Provide specific error messages based on the error type
          let errorMessage = "Failed to complete Supabase connection. Please try again."
          
          if (error.message?.toLowerCase().includes('unauthorized') || 
              error.message?.toLowerCase().includes('invalid') || 
              error.message?.toLowerCase().includes('403')) {
            errorMessage = "The OAuth token received is invalid or expired. Please try connecting again through OAuth."
          } else if (error.message?.toLowerCase().includes('network') || 
                     error.message?.toLowerCase().includes('fetch') ||
                     error.message?.toLowerCase().includes('timeout')) {
            errorMessage = "Network error during token validation. Please check your internet connection and try again."
          } else if (error.message?.includes('Failed to store')) {
            errorMessage = "Token validation succeeded but failed to save your connection. Please try again."
          } else if (error.message?.toLowerCase().includes('projects')) {
            errorMessage = "Failed to fetch your Supabase projects. Your token may not have the required permissions."
          } else if (error.message) {
            // Use the actual error message if it's descriptive
            errorMessage = `Connection failed: ${error.message}`
          }
          
          toast({
            title: "Connection Failed",
            description: errorMessage,
            variant: "destructive"
          })
        }
      } else {
        if (token && !user?.id) {
          console.log('[OAUTH] Token found but no user available yet, waiting...')
        } else if (!token) {
          console.log('[OAUTH] No token in URL parameters')
        } else if (processed) {
          console.log('[OAUTH] Token already processed, skipping')
        }
      }
    }

    if (user?.id) {
      console.log('[OAUTH] User available, starting OAuth callback handler...')
      handleOAuthCallback()
    } else {
      console.log('[OAUTH] No user available yet for OAuth callback')
    }
  }, [user?.id])

  useEffect(() => {
    fetchUser()
  }, [])

  useEffect(() => {
    if (user?.id) {
      checkCloudSyncStatus(user.id)
      checkConnectionStatus(user.id)
      fetchSubscriptionStatus(user.id)

      // Auto-restore is disabled on account page - only available in workspace with project ID
      console.log('Account page: Auto-restore is disabled on this page')
    }
  }, [user])

  // Handle name editing
  const handleStartEditingName = () => {
    setEditingName(user?.user_metadata?.full_name || "")
    setIsEditingName(true)
  }

  const handleCancelEditingName = () => {
    setEditingName("")
    setIsEditingName(false)
  }

  const handleSaveName = async () => {
    if (!user || !editingName.trim()) return

    try {
      setIsUpdatingName(true)

      // Update auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: editingName.trim()
        }
      })

      if (authError) throw authError

      // Also update the profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: editingName.trim(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })

      if (profileError) {
        console.error("Error updating profile:", profileError)
        // Don't throw here, auth update was successful
      }

      // Update local user state
      setUser({
        ...user,
        user_metadata: {
          ...user.user_metadata,
          full_name: editingName.trim()
        }
      })

      setIsEditingName(false)
      setEditingName("")

      toast({
        title: "Name updated",
        description: "Your name has been successfully updated.",
      })
    } catch (error: any) {
      console.error("Error updating name:", error)
      toast({
        title: "Failed to update name",
        description: error.message || "An error occurred while updating your name.",
        variant: "destructive"
      })
    } finally {
      setIsUpdatingName(false)
    }
  }

  // Validate and connect to a provider
  const handleConnect = async (provider: 'github' | 'vercel' | 'netlify' | 'supabase') => {
    const token = connectionForms[provider].token
    if (!token.trim()) {
      setConnectionForms(prev => ({
        ...prev,
        [provider]: { ...prev[provider], error: 'Please enter a token' }
      }))
      return
    }

    try {
      setConnectionForms(prev => ({
        ...prev,
        [provider]: { ...prev[provider], isValidating: true, error: '' }
      }))

      let userData: any = {}

      // Validate token based on provider
      if (provider === 'github') {
        const response = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        })
        if (!response.ok) throw new Error('Invalid GitHub token')
        userData = await response.json()
      } else if (provider === 'vercel') {
        const response = await fetch('https://api.vercel.com/v1/user', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        if (!response.ok) throw new Error('Invalid Vercel token')
        userData = await response.json()
      } else if (provider === 'netlify') {
        const response = await fetch('https://api.netlify.com/api/v1/user', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        if (!response.ok) throw new Error('Invalid Netlify token')
        userData = await response.json()
      } else if (provider === 'supabase') {
        // Use server-side API to validate token (avoids CORS issues)
        console.log('[SUPABASE] Validating manual access token...')
        
        const validateResponse = await fetch('/api/supabase/validate-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        })
        
        const validateResult = await validateResponse.json()
        
        if (!validateResponse.ok || !validateResult.valid) {
          const errorMessage = validateResult.error || 'Token validation failed'
          console.error('[SUPABASE] Manual token validation failed:', errorMessage)
          
          if (errorMessage.toLowerCase().includes('unauthorized') || 
              errorMessage.toLowerCase().includes('invalid') || 
              errorMessage.toLowerCase().includes('403')) {
            throw new Error(`Invalid Supabase Management API token. Please ensure you're using a Management API token from https://supabase.com/dashboard/account/tokens, not an anon or service role key.`)
          } else if (errorMessage.toLowerCase().includes('network') || 
                     errorMessage.toLowerCase().includes('fetch')) {
            throw new Error('Network error while validating token. Please check your internet connection and try again.')
          } else {
            throw new Error(`Failed to validate Supabase token: ${errorMessage}. Please ensure you have the correct Management API token.`)
          }
        }
        
        const projects = validateResult.projects || []
        console.log('[SUPABASE] Manual token validation successful, found', projects.length, 'projects')
        userData = { name: 'Supabase User', projects } // Include projects in userData
      }

      // Save token to Supabase
      const tokensToStore: any = {}
      tokensToStore[provider] = token
      const success = await storeDeploymentTokens(user.id, tokensToStore)
      
      if (!success) {
        throw new Error(`Failed to store ${provider} token`)
      }

      // Store connection state
      const statesToStore: any = {}
      statesToStore[`${provider}_connected`] = true
      await storeDeploymentConnectionStates(user.id, statesToStore)

      // Auto-run auth back: re-check connection status to validate token and fetch user data
      await checkConnectionStatus(user.id)

      // Clear form
      setConnectionForms(prev => ({
        ...prev,
        [provider]: { token: '', isValidating: false, error: '' }
      }))

      toast({
        title: "Connected",
        description: `Successfully connected to ${provider.charAt(0).toUpperCase() + provider.slice(1)}`,
      })
    } catch (error: any) {
      console.error(`Error connecting to ${provider}:`, error)
      setConnectionForms(prev => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          isValidating: false,
          error: error.message || `Failed to validate ${provider} token`
        }
      }))
    }
  }


  const fetchUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        // Cloud sync status will be checked in the useEffect that watches user changes
      }
    } catch (error) {
      console.error("Error fetching user:", error)
      toast({
        title: "Error",
        description: "Failed to fetch user information",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const checkCloudSyncStatus = async (userId?: string) => {
    try {
      const id = userId || user?.id
      if (!id) return
      
      const enabled = await isCloudSyncEnabledUtil(id)
      setCloudSyncEnabledState(enabled)
      
      const lastBackupTime = await getLastBackupTimeUtil(id)
      setLastBackup(lastBackupTime)
    } catch (error) {
      console.error("Error checking cloud sync status:", error)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive"
      })
      return
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      })
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      })

      if (error) throw error

      toast({
        title: "Success",
        description: "Password updated successfully"
      })

      // Reset form
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      })
    } catch (error: any) {
      console.error("Error updating password:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive"
      })
    }
  }

  const toggleCloudSync = async () => {
    try {
      if (!user?.id) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive"
        })
        return
      }
      
      const newStatus = !cloudSyncEnabled
      
      // Update in Supabase
      const success = await setCloudSyncEnabledUtil(user.id, newStatus)
      
      if (!success) throw new Error("Failed to update cloud sync settings")

      setCloudSyncEnabledState(newStatus)
      
      toast({
        title: "Success",
        description: `Cloud sync ${newStatus ? 'enabled' : 'disabled'}`
      })
    } catch (error: any) {
      console.error("Error toggling cloud sync:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update cloud sync settings",
        variant: "destructive"
      })
    }
  }

  const triggerManualBackup = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive"
      })
      return
    }
    
    setBackupStatus("syncing")
    
    try {
      const success = await uploadBackupToCloud(user.id)
      
      if (!success) throw new Error("Backup failed")
      
      // Update last backup time
      const lastBackupTime = await getLastBackupTimeUtil(user.id)
      setLastBackup(lastBackupTime)
      
      setBackupStatus("success")
      
      toast({
        title: "Success",
        description: "Backup completed successfully"
      })
    } catch (error: any) {
      console.error("Error creating backup:", error)
      setBackupStatus("error")
      
      toast({
        title: "Error",
        description: error.message || "Failed to create backup",
        variant: "destructive"
      })
    } finally {
      setTimeout(() => setBackupStatus("idle"), 3000)
    }
  }

  const handleRestoreBackup = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive"
      })
      return
    }
    
    setBackupStatus("syncing")
    
    try {
      const success = await restoreBackupFromCloud(user.id)
      
      if (!success) throw new Error("Restore failed")
      
      setBackupStatus("success")
      
      toast({
        title: "Success",
        description: "Backup restored successfully. Please refresh the page to see changes."
      })
    } catch (error: any) {
      console.error("Error restoring backup:", error)
      setBackupStatus("error")
      
      toast({
        title: "Error",
        description: error.message || "Failed to restore backup",
        variant: "destructive"
      })
    } finally {
      setTimeout(() => setBackupStatus("idle"), 3000)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE MY ACCOUNT") {
      toast({
        title: "Error",
        description: "Please type 'DELETE MY ACCOUNT' to confirm",
        variant: "destructive"
      })
      return
    }

    setIsDeleting(true)
    
    try {
      // Delete user data from Supabase tables
      const tables = ['workspaces', 'files', 'deployments', 'environment_variables', 'chat_sessions', 'messages', 'user_settings', 'user_backups']
      
      for (const table of tables) {
        await supabase
          .from(table)
          .delete()
          .eq('user_id', user?.id)
      }
      
      // Delete the user account itself
      const { error } = await supabase.auth.admin.deleteUser(user?.id)
      
      if (error) throw error

      toast({
        title: "Success",
        description: "Account deleted successfully"
      })
      
      // Redirect to home or login page
      window.location.href = "/"
    } catch (error: any) {
      console.error("Error deleting account:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const validateAndStoreToken = async (provider: 'github' | 'vercel' | 'netlify', token: string) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive"
      })
      return false
    }

    // Reset validation state
    setConnectionForms(prev => ({
      ...prev,
      [provider]: { ...prev[provider], isValidating: true, error: '' }
    }))

    try {
      // Validate token (you'll need to implement these validation methods)
      const isValid = await validateDeploymentToken(provider, token)

      if (!isValid) {
        throw new Error(`Invalid ${provider} token`)
      }

      // Store token using Supabase
      const tokensToStore: any = {}
      tokensToStore[provider] = token
      const success = await storeDeploymentTokens(user.id, tokensToStore)
      
      if (!success) {
        throw new Error(`Failed to store ${provider} token`)
      }

      // Store connection state
      const statesToStore: any = {}
      statesToStore[`${provider}_connected`] = true
      await storeDeploymentConnectionStates(user.id, statesToStore)

      // Auto-run auth back: re-check connection status to validate token and fetch user data
      await checkConnectionStatus(user.id)

      // Update connection status
      setConnections(prev => ({
        ...prev,
        [provider]: { 
          ...prev[provider], 
          connected: true, 
          loading: false 
        }
      }))

      toast({
        title: "Success",
        description: `${provider.charAt(0).toUpperCase() + provider.slice(1)} token validated and stored`
      })

      return true
    } catch (error: any) {
      console.error(`Error validating ${provider} token:`, error)
      
      setConnectionForms(prev => ({
        ...prev,
        [provider]: { 
          ...prev[provider], 
          isValidating: false, 
          error: error.message || `Failed to validate ${provider} token` 
        }
      }))

      toast({
        title: "Error",
        description: error.message || `Failed to validate ${provider} token`,
        variant: "destructive"
      })

      return false
    }
  }

  // Fetch existing connection status and validate tokens
  const checkConnectionStatus = async (userId: string) => {
    try {
      // Get tokens, connection states, and Supabase project details from Supabase
      const [tokens, connectionStates, supabaseProjectDetails] = await Promise.all([
        getDeploymentTokens(userId),
        getDeploymentConnectionStates(userId),
        getSupabaseProjectDetails(userId)
      ])

      // Set loading state for all providers
      setConnections(prev => ({
        github: { ...prev.github, loading: true },
        vercel: { ...prev.vercel, loading: true },
        netlify: { ...prev.netlify, loading: true },
        supabase: { ...prev.supabase, loading: true }
      }))

      // Validate and fetch user data for each token
      const validateAndFetchUserData = async (
        provider: 'github' | 'vercel' | 'netlify' | 'supabase'
      ) => {
        const token = tokens?.[provider]
        const isConnected = connectionStates?.[`${provider}_connected`] || false
        
        if (!token || !isConnected) {
          return { connected: false, username: '', avatarUrl: '', loading: false, projects: undefined, selectedProject: null }
        }

        try {
          let userData: any = {}

          // Validate token and fetch user data
          if (provider === 'github') {
            const response = await fetch('https://api.github.com/user', {
              headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            })
            if (!response.ok) throw new Error('Invalid GitHub token')
            userData = await response.json()
          } else if (provider === 'vercel') {
            const response = await fetch('https://api.vercel.com/v1/user', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            })
            if (!response.ok) throw new Error('Invalid Vercel token')
            userData = await response.json()
          } else if (provider === 'netlify') {
            const response = await fetch('https://api.netlify.com/api/v1/user', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            })
            if (!response.ok) throw new Error('Invalid Netlify token')
            userData = await response.json()
          } else if (provider === 'supabase') {
            // Use server-side API to validate token and fetch projects (avoids CORS issues)
            console.log('[SUPABASE] Validating access token...')
            
            const validateResponse = await fetch('/api/supabase/validate-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ token }),
            })
            
            const validateResult = await validateResponse.json()
            
            if (!validateResponse.ok || !validateResult.valid) {
              throw new Error(validateResult.error || 'Invalid Supabase Management API access token. Please ensure you\'re using a Management API token from https://supabase.com/dashboard/account/tokens, not an anon or service role key.')
            }
            
            const projects = validateResult.projects || []
            console.log('[SUPABASE] Token validation successful, found', projects.length, 'projects')
            userData = { name: 'Supabase User', projects }
          }

          return {
            connected: true,
            username: provider === 'github' ? userData.login :
                     provider === 'vercel' ? (userData.username || userData.name) :
                     provider === 'supabase' ? userData.name :
                     (userData.login || userData.email),
            avatarUrl: provider === 'github' ? userData.avatar_url :
                      provider === 'vercel' ? userData.avatar :
                      provider === 'supabase' ? '' :
                      userData.avatar_url,
            loading: false,
            projects: provider === 'supabase' ? userData.projects : undefined,
            selectedProject: provider === 'supabase' ? null : undefined
          }
        } catch (error) {
          console.error(`Error validating ${provider} token:`, error)
          // If token is invalid, remove it and update connection state from Supabase
          try {
            const tokensToUpdate: any = {}
            tokensToUpdate[provider] = null
            await storeDeploymentTokens(userId, tokensToUpdate)
            
            const statesToUpdate: any = {}
            statesToUpdate[`${provider}_connected`] = false
            await storeDeploymentConnectionStates(userId, statesToUpdate)
          } catch (deleteError) {
            console.error(`Error removing invalid ${provider} token:`, deleteError)
          }
          return { connected: false, username: '', avatarUrl: '', loading: false, projects: undefined, selectedProject: null }
        }
      }

      // Validate all tokens concurrently
      console.log('[CONNECTION_STATUS] Starting validation for all providers...')
      const [githubStatus, vercelStatus, netlifyStatus, supabaseStatus] = await Promise.all([
        validateAndFetchUserData('github'),
        validateAndFetchUserData('vercel'),
        validateAndFetchUserData('netlify'),
        validateAndFetchUserData('supabase')
      ])
      console.log('[CONNECTION_STATUS] Validation results:', {
        github: githubStatus.connected,
        vercel: vercelStatus.connected,
        netlify: netlifyStatus.connected,
        supabase: supabaseStatus.connected
      })

      // Update connection status
      console.log('[CONNECTION_STATUS] Updating UI state...')
      setConnections({
        github: githubStatus,
        vercel: vercelStatus,
        netlify: netlifyStatus,
        supabase: {
          ...supabaseStatus,
          selectedProject: supabaseProjectDetails?.selectedProjectId && supabaseProjectDetails?.selectedProjectName ? {
            id: supabaseProjectDetails.selectedProjectId,
            name: supabaseProjectDetails.selectedProjectName
          } : supabaseStatus.selectedProject
        }
      })
      console.log('[CONNECTION_STATUS] UI state updated')

    } catch (error) {
      console.error("Error checking connection status:", error)
      // Reset loading states on error
      setConnections(prev => ({
        github: { ...prev.github, loading: false },
        vercel: { ...prev.vercel, loading: false },
        netlify: { ...prev.netlify, loading: false },
        supabase: { ...prev.supabase, loading: false }
      }))
    }
  }

  const fetchSubscriptionStatus = async (userId: string) => {
    try {
      setSubscriptionLoading(true)

      // Fetch subscription directly from database
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { data: userSettings, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (!settingsError && userSettings) {
        const subscriptionData = {
          plan: userSettings.subscription_plan || 'free',
          status: userSettings.subscription_status || 'active',
          deploymentsThisMonth: userSettings.deployments_this_month || 0,
          githubPushesThisMonth: userSettings.github_pushes_this_month || 0,
          subscriptionEndDate: userSettings.cancel_at_period_end ? userSettings.updated_at : undefined,
          cancelAtPeriodEnd: userSettings.cancel_at_period_end || false
        }

        setSubscription(subscriptionData)

        // Update usage stats based on subscription
        setUsageStats(prev => ({
          ...prev,
          deploymentsThisMonth: subscriptionData.deploymentsThisMonth,
          githubPushesThisMonth: subscriptionData.githubPushesThisMonth
        }))
      }
    } catch (error) {
      console.error("Error fetching subscription status:", error)
    } finally {
      setSubscriptionLoading(false)
    }
  }

  const handleUpgradePlan = (planType: string) => {
    // Redirect to pricing page with plan selection
    window.location.href = `/pricing?upgrade=${planType}`
  }

  const handleCancelSubscription = async () => {
    if (!subscription?.plan || subscription.plan === 'free') return

    try {
      // Here you would implement cancellation logic
      toast({
        title: "Subscription Management",
        description: "Please contact support to cancel your subscription.",
      })
    } catch (error) {
      console.error("Error cancelling subscription:", error)
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please contact support.",
        variant: "destructive"
      })
    }
  }

  // Disconnect from a provider
  const handleDisconnect = async (provider: 'github' | 'vercel' | 'netlify' | 'supabase') => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive"
      })
      return
    }

    try {
      // Remove token from Supabase
      const tokensToUpdate: any = {}
      tokensToUpdate[provider] = null
      await storeDeploymentTokens(user.id, tokensToUpdate)
      
      // Update connection state
      const statesToUpdate: any = {}
      statesToUpdate[`${provider}_connected`] = false
      await storeDeploymentConnectionStates(user.id, statesToUpdate)

      // Auto-run auth back: re-check connection status
      await checkConnectionStatus(user.id)

      // Clear the form input
      setConnectionForms(prev => ({
        ...prev,
        [provider]: { token: '', isValidating: false, error: '' }
      }))

      toast({
        title: "Success",
        description: `${provider.charAt(0).toUpperCase() + provider.slice(1)} disconnected successfully`
      })
    } catch (error: any) {
      console.error(`Error disconnecting ${provider}:`, error)
      toast({
        title: "Error",
        description: error.message || `Failed to disconnect ${provider}`,
        variant: "destructive"
      })
    }
  }

  const handleCreateSupabaseProject = async () => {
    if (!user?.id || !connections.supabase.connected) {
      toast({
        title: "Error",
        description: "Not connected to Supabase",
        variant: "destructive"
      })
      return
    }

    try {
      // Get the access token
      const tokens = await getDeploymentTokens(user.id)
      const accessToken = tokens?.supabase

      if (!accessToken) {
        throw new Error("No Supabase access token found")
      }

      // Use Dyad Supabase Management API to create project
      const { SupabaseManagementAPI } = await import('@dyad-sh/supabase-management-js')
      const client = new SupabaseManagementAPI({ accessToken })

      // For now, we'll open Supabase dashboard for project creation
      // In a future implementation, we could use the API to create projects programmatically
      window.open('https://supabase.com/dashboard/projects', '_blank')

      toast({
        title: "Opening Supabase Dashboard",
        description: "Please create your new project in the Supabase dashboard, then refresh this page to see it in the list."
      })
    } catch (error: any) {
      console.error("Error creating Supabase project:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create Supabase project",
        variant: "destructive"
      })
    }
  }

  // Validate deployment token (you'll need to implement this)
  const validateDeploymentToken = async (
    provider: 'github' | 'vercel' | 'netlify' | 'supabase',
    token: string
  ): Promise<boolean> => {
    // Implement token validation logic for each provider
    // This might involve making an API call to the respective provider
    switch (provider) {
      case 'github':
        // Example GitHub token validation
        try {
          const response = await fetch('https://api.github.com/user', {
            headers: {
              'Authorization': `token ${token}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          })
          return response.ok
        } catch {
          return false
        }
      case 'vercel':
        // Example Vercel token validation
        try {
          const response = await fetch('https://api.vercel.com/v1/user', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          return response.ok
        } catch {
          return false
        }
      case 'netlify':
        // Example Netlify token validation
        try {
          const response = await fetch('https://api.netlify.com/api/v1/user', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          return response.ok
        } catch {
          return false
        }
      case 'supabase':
        // Supabase token validation using server-side API (avoids CORS issues)
        try {
          const validateResponse = await fetch('/api/supabase/validate-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
          })
          
          const validateResult = await validateResponse.json()
          return validateResponse.ok && validateResult.valid
        } catch {
          return false
        }
      default:
        return false
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 lovable-gradient" />
        <div className="absolute inset-0 noise-texture" />
        <Navigation />
      <div className="relative z-10 pt-16 pb-24">
        <div className="flex items-center justify-center min-h-screen">
          <RefreshCw className="h-8 w-8 animate-spin text-white" />
        </div>
      </div>
      <Footer />
    </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Enhanced Gradient Background */}
      <div className="absolute inset-0 lovable-gradient" />

      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 noise-texture" />

      {/* Navigation */}
      <Navigation />

      <div className="relative z-10 pt-16 pb-24 flex-grow">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col space-y-2 mb-6">
              <h1 className="text-3xl font-bold text-white">Account Settings</h1>
              <p className="text-gray-400">
              Manage your account information, security, and preferences
            </p>
          </div>

            <div className="grid gap-6 md:grid-cols-2">
            {/* Profile Information Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Your account details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {isEditingName ? (
                        <Input
                          id="name"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          placeholder="Enter your full name"
                          className="flex-1"
                          disabled={isUpdatingName}
                        />
                      ) : (
                        <Input
                          id="name"
                          value={user?.user_metadata?.full_name || "Not set"}
                          readOnly
                          className="bg-muted flex-1"
                        />
                      )}
                    </div>
                    <div className="flex gap-2">
                      {isEditingName ? (
                        <>
                          <Button
                            size="sm"
                            onClick={handleSaveName}
                            disabled={isUpdatingName || !editingName.trim()}
                          >
                            {isUpdatingName ? (
                              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Check className="h-4 w-4 mr-2" />
                            )}
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEditingName}
                            disabled={isUpdatingName}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleStartEditingName}
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit Name
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        value={user?.email || "Not set"}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Change Password Card (Security) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Security
                </CardTitle>
                <CardDescription>
                  Update your password and security settings
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleChangePassword}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full">
                    Update Password
                  </Button>
                </CardFooter>
              </form>
            </Card>

            {/* Cloud Sync Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {cloudSyncEnabled ? (
                      <Cloud className="h-5 w-5 text-blue-500" />
                    ) : (
                      <CloudOff className="h-5 w-5 text-muted-foreground" />
                    )}
                    Cloud Sync
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Automatically backup your projects to the cloud</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
                <CardDescription>
                  Sync your projects across devices
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto Backup</p>
                    <p className="text-sm text-muted-foreground">
                      {cloudSyncEnabled 
                        ? "Enabled - Backups created automatically" 
                        : "Disabled - Enable to sync across devices"}
                    </p>
                  </div>
                  <Button
                    variant={cloudSyncEnabled ? "destructive" : "default"}
                    onClick={toggleCloudSync}
                  >
                    {cloudSyncEnabled ? "Disable" : "Enable"}
                  </Button>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">Manual Backup</p>
                      {backupStatus === "syncing" && (
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                      )}
                      {backupStatus === "success" && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {backupStatus === "error" && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {lastBackup 
                        ? `Last backup: ${new Date(lastBackup).toLocaleString()}` 
                        : "No backups yet"}
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={triggerManualBackup}
                        disabled={backupStatus === "syncing"}
                        className="flex-1"
                      >
                        {backupStatus === "syncing" ? "Backing up..." : "Create Backup"}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleRestoreBackup}
                        disabled={backupStatus === "syncing"}
                        className="flex-1"
                      >
                        {backupStatus === "syncing" ? "Restoring..." : "Restore Backup"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Subscription Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Current Subscription
                </CardTitle>
                <CardDescription>
                  Manage your subscription plan and billing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {subscriptionLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading subscription...</span>
                  </div>
                ) : subscription ? (
                  <>
                    {/* Plan Status */}
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          subscription.status === 'active' ? 'bg-green-500' :
                          subscription.status === 'trialing' ? 'bg-blue-500' :
                          subscription.status === 'past_due' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <p className="font-medium capitalize">{subscription.plan} Plan</p>
                          <p className="text-sm text-muted-foreground">
                            Status: {subscription.status === 'active' ? 'Active' :
                                   subscription.status === 'trialing' ? 'Trial' :
                                   subscription.status === 'past_due' ? 'Payment Due' : 'Inactive'}
                          </p>
                        </div>
                      </div>
                      <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                        {subscription.status}
                      </Badge>
                    </div>

                    {/* Usage Limits */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Deployments This Month</span>
                        <span className="text-sm text-muted-foreground">
                          {subscription.deploymentsThisMonth || 0} / {getLimits(subscription.plan).deploymentsPerMonth}
                        </span>
                      </div>
                      <Progress
                        value={((subscription.deploymentsThisMonth || 0) / getLimits(subscription.plan).deploymentsPerMonth) * 100}
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground">
                        Resets monthly • {subscription.githubPushesThisMonth || 0} GitHub pushes used
                      </p>
                    </div>

                    {/* Billing Information */}
                    {subscription.subscriptionEndDate && (
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Next billing date</span>
                        </div>
                        <span className="text-sm font-medium">
                          {new Date(subscription.subscriptionEndDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {subscription.plan !== 'enterprise' && (
                        <Button
                          variant="outline"
                          onClick={() => handleUpgradePlan('enterprise')}
                          className="flex-1"
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Upgrade to Enterprise
                        </Button>
                      )}
                      {subscription.plan !== 'free' && (
                        <Button
                          variant="outline"
                          onClick={handleCancelSubscription}
                          className="flex-1 text-red-600 hover:text-red-700"
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Cancel Subscription
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Crown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No active subscription</p>
                    <Button asChild>
                      <a href="/pricing">Choose a Plan</a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Usage Statistics Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Usage Statistics
                </CardTitle>
                <CardDescription>
                  Your current usage and limits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Deployments</span>
                    </div>
                    <span className="text-sm font-medium">
                      {usageStats.deploymentsThisMonth} / {getLimits(subscription?.plan || 'free').deploymentsPerMonth}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GitHubIcon className="h-4 w-4 text-gray-700" />
                      <span className="text-sm">GitHub Pushes</span>
                    </div>
                    <span className="text-sm font-medium">
                      {usageStats.githubPushesThisMonth} / {subscription?.plan === 'free' ? 2 : 'Unlimited'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cloud className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Storage</span>
                    </div>
                    <span className="text-sm font-medium">
                      {usageStats.storageUsed}GB / Unlimited
                    </span>
                  </div>
                </div>

                <Button variant="outline" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  View Detailed Usage
                </Button>
              </CardContent>
            </Card>

            {/* Billing History Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Billing History
                </CardTitle>
                <CardDescription>
                  View your past invoices and payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* This would be populated with actual billing history */}
                  <div className="text-center py-8">
                    <Receipt className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No billing history available
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Invoices will appear here after your first payment
                    </p>
                  </div>
                </div>

                <Button variant="outline" className="w-full mt-4">
                  <Download className="h-4 w-4 mr-2" />
                  Download All Invoices
                </Button>
              </CardContent>
            </Card>

            {/* Billing Information Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Billing Information
                </CardTitle>
                <CardDescription>
                  Manage your payment methods and billing details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {subscription && subscription.plan !== 'free' ? (
                  <>
                    {/* Payment Method */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Payment Method</h4>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-6 bg-blue-600 rounded flex items-center justify-center">
                            <CreditCard className="h-3 w-3 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">•••• •••• •••• 4242</p>
                            <p className="text-xs text-muted-foreground">Expires 12/26</p>
                          </div>
                        </div>
                        <Badge variant="secondary">Primary</Badge>
                      </div>
                      <Button variant="outline" size="sm">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Update Payment Method
                      </Button>
                    </div>

                    {/* Billing Address */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Billing Address</h4>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm">John Doe</p>
                        <p className="text-sm text-muted-foreground">
                          123 Main Street<br />
                          San Francisco, CA 94102<br />
                          United States
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Update Billing Address
                      </Button>
                    </div>

                    {/* Billing Preferences */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Billing Preferences</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Email receipts</span>
                          <input type="checkbox" defaultChecked className="rounded" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Auto-renewal</span>
                          <input
                            type="checkbox"
                            defaultChecked={!subscription.cancelAtPeriodEnd}
                            className="rounded"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Usage alerts</span>
                          <input type="checkbox" defaultChecked className="rounded" />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Billing information will be available once you subscribe to a plan
                    </p>
                    <Button asChild>
                      <a href="/pricing">Choose a Plan</a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Connected Services Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Connected Services
                </CardTitle>
                <CardDescription>
                  Manage your connections to external services for deployments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* GitHub Connection */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-full">
                        <GitHubIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">GitHub</p>
                        <p className="text-sm text-muted-foreground">
                          {connections.github.connected
                            ? `Connected as ${connections.github.username}`
                            : "Connect your GitHub account for deployments"}
                        </p>
                      </div>
                    </div>
                    {connections.github.connected && connections.github.avatarUrl && (
                      <img
                        src={connections.github.avatarUrl}
                        alt="GitHub Avatar"
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                  </div>

                  <div className="space-y-3">
                    {/* Token Input - Always visible but disabled when connected */}
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder={connections.github.connected ? "Token saved and secured" : "Enter your GitHub personal access token"}
                        value={connections.github.connected ? "••••••••••••••••••••••••••••••••" : connectionForms.github.token}
                        onChange={(e) => setConnectionForms(prev => ({
                          ...prev,
                          github: { ...prev.github, token: e.target.value, error: '' }
                        }))}
                        disabled={connections.github.connected}
                        className={connections.github.connected
                          ? "bg-green-50 border-green-200 cursor-not-allowed"
                          : connectionForms.github.error ? "border-red-500" : ""
                        }
                      />
                  {connections.github.connected ? (
                      <Button
                          variant="destructive"
                        onClick={() => handleDisconnect('github')}
                        disabled={connections.github.loading}
                      >
                        {connections.github.loading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Unlink className="h-4 w-4 mr-2" />
                        )}
                        Disconnect
                      </Button>
                      ) : (
                        <Button
                          onClick={() => handleConnect('github')}
                          disabled={connectionForms.github.isValidating || !connectionForms.github.token.trim()}
                        >
                          {connectionForms.github.isValidating ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            "Connect"
                          )}
                        </Button>
                      )}
                      </div>

                    {/* Connection Status */}
                    {connections.github.connected && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600 font-medium">Connected and secured</span>
                      </div>
                    )}

                    {/* Error Message */}
                      {connectionForms.github.error && (
                        <p className="text-sm text-red-600">{connectionForms.github.error}</p>
                      )}

                    {/* Help Text */}
                      <p className="text-xs text-muted-foreground">
                      {connections.github.connected ? (
                        "Your token is securely stored. Click disconnect to change it."
                      ) : (
                        <>Need a token? <a href="https://github.com/settings/tokens/new?description=Pipilot%20(repo%20workflow)&scopes=repo,workflow,user,delete_repo" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Create one here</a></>
                      )}
                      </p>
                    </div>
                </div>

                {/* Vercel Connection */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-black rounded-full flex items-center justify-center">
                        <VercelIcon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">Vercel</p>
                        <p className="text-sm text-muted-foreground">
                          {connections.vercel.connected
                            ? `Connected as ${connections.vercel.username}`
                            : "Connect your Vercel account for deployments"}
                        </p>
                      </div>
                    </div>
                    {connections.vercel.connected && connections.vercel.avatarUrl && (
                      <img
                        src={connections.vercel.avatarUrl}
                        alt="Vercel Avatar"
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                  </div>

                  <div className="space-y-3">
                    {/* Token Input - Always visible but disabled when connected */}
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder={connections.vercel.connected ? "Token saved and secured" : "Enter your Vercel personal access token"}
                        value={connections.vercel.connected ? "••••••••••••••••••••••••••••••••" : connectionForms.vercel.token}
                        onChange={(e) => setConnectionForms(prev => ({
                          ...prev,
                          vercel: { ...prev.vercel, token: e.target.value, error: '' }
                        }))}
                        disabled={connections.vercel.connected}
                        className={connections.vercel.connected
                          ? "bg-green-50 border-green-200 cursor-not-allowed"
                          : connectionForms.vercel.error ? "border-red-500" : ""
                        }
                      />
                  {connections.vercel.connected ? (
                      <Button
                          variant="destructive"
                        onClick={() => handleDisconnect('vercel')}
                        disabled={connections.vercel.loading}
                      >
                        {connections.vercel.loading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Unlink className="h-4 w-4 mr-2" />
                        )}
                        Disconnect
                      </Button>
                      ) : (
                        <Button
                          onClick={() => handleConnect('vercel')}
                          disabled={connectionForms.vercel.isValidating || !connectionForms.vercel.token.trim()}
                        >
                          {connectionForms.vercel.isValidating ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            "Connect"
                          )}
                        </Button>
                      )}
                      </div>

                    {/* Connection Status */}
                    {connections.vercel.connected && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600 font-medium">Connected and secured</span>
                      </div>
                    )}

                    {/* Error Message */}
                      {connectionForms.vercel.error && (
                        <p className="text-sm text-red-600">{connectionForms.vercel.error}</p>
                      )}

                    {/* Help Text */}
                      <p className="text-xs text-muted-foreground">
                      {connections.vercel.connected ? (
                        "Your token is securely stored. Click disconnect to change it."
                      ) : (
                        <>Need a token? <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Create one here</a></>
                      )}
                      </p>
                    </div>
                </div>

                {/* Netlify Connection */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-teal-500 rounded-full flex items-center justify-center">
                        <NetlifyIcon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">Netlify</p>
                        <p className="text-sm text-muted-foreground">
                          {connections.netlify.connected
                            ? `Connected as ${connections.netlify.username}`
                            : "Connect your Netlify account for deployments"}
                        </p>
                      </div>
                    </div>
                    {connections.netlify.connected && connections.netlify.avatarUrl && (
                      <img
                        src={connections.netlify.avatarUrl}
                        alt="Netlify Avatar"
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                  </div>

                  <div className="space-y-3">
                    {/* Token Input - Always visible but disabled when connected */}
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder={connections.netlify.connected ? "Token saved and secured" : "Enter your Netlify personal access token"}
                        value={connections.netlify.connected ? "••••••••••••••••••••••••••••••••" : connectionForms.netlify.token}
                        onChange={(e) => setConnectionForms(prev => ({
                          ...prev,
                          netlify: { ...prev.netlify, token: e.target.value, error: '' }
                        }))}
                        disabled={connections.netlify.connected}
                        className={connections.netlify.connected
                          ? "bg-green-50 border-green-200 cursor-not-allowed"
                          : connectionForms.netlify.error ? "border-red-500" : ""
                        }
                      />
                  {connections.netlify.connected ? (
                      <Button
                          variant="destructive"
                        onClick={() => handleDisconnect('netlify')}
                        disabled={connections.netlify.loading}
                      >
                        {connections.netlify.loading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Unlink className="h-4 w-4 mr-2" />
                        )}
                        Disconnect
                      </Button>
                      ) : (
                        <Button
                          onClick={() => handleConnect('netlify')}
                          disabled={connectionForms.netlify.isValidating || !connectionForms.netlify.token.trim()}
                        >
                          {connectionForms.netlify.isValidating ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            "Connect"
                          )}
                        </Button>
                      )}
                      </div>

                    {/* Connection Status */}
                    {connections.netlify.connected && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600 font-medium">Connected and secured</span>
                      </div>
                    )}

                    {/* Error Message */}
                      {connectionForms.netlify.error && (
                        <p className="text-sm text-red-600">{connectionForms.netlify.error}</p>
                      )}

                    {/* Help Text */}
                      <p className="text-xs text-muted-foreground">
                      {connections.netlify.connected ? (
                        "Your token is securely stored. Click disconnect to change it."
                      ) : (
                        <>Need a token? <a href="https://app.netlify.com/user/applications#personal-access-tokens" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Create one here</a></>
                      )}
                      </p>
                    </div>
                </div>

                {/* Supabase Connection */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500 rounded-full flex items-center justify-center">
                        <SupabaseIcon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">Supabase</p>
                        <p className="text-sm text-muted-foreground">
                          {connections.supabase.connected
                            ? `${connections.supabase.projects?.length || 0} projects available`
                            : "Connect your Supabase account for database operations"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Token Input - Always visible but disabled when connected */}
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder={connections.supabase.connected ? "Token saved and secured" : "Enter Supabase Management API token (not anon/service_role key)"}
                        value={connections.supabase.connected ? "••••••••••••••••••••••••••••••••" : connectionForms.supabase.token}
                        onChange={(e) => setConnectionForms(prev => ({
                          ...prev,
                          supabase: { ...prev.supabase, token: e.target.value, error: '' }
                        }))}
                        disabled={connections.supabase.connected}
                        className={connections.supabase.connected
                          ? "bg-green-50 border-green-200 cursor-not-allowed"
                          : connectionForms.supabase.error ? "border-red-500" : ""
                        }
                      />
                  {connections.supabase.connected ? (
                      <Button
                          variant="destructive"
                        onClick={() => handleDisconnect('supabase')}
                        disabled={connections.supabase.loading}
                      >
                        {connections.supabase.loading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Unlink className="h-4 w-4 mr-2" />
                        )}
                        Disconnect
                      </Button>
                      ) : (
                        <Button
                          onClick={() => handleConnect('supabase')}
                          disabled={connectionForms.supabase.isValidating || !connectionForms.supabase.token.trim()}
                        >
                          {connectionForms.supabase.isValidating ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            "Connect"
                          )}
                        </Button>
                      )}
                      </div>

                    {/* Connection Status */}
                    {connections.supabase.connected && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600 font-medium">Connected and secured</span>
                      </div>
                    )}

                    {/* Token Status */}
                    {connections.supabase.connected && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Token Status</span>
                          <div className="flex items-center gap-2">
                            {tokenExpired ? (
                              <>
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                                <span className="text-sm text-orange-600">Expires soon</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm text-green-600">Valid</span>
                              </>
                            )}
                          </div>
                        </div>

                        {lastRefresh && (
                          <div className="text-xs text-muted-foreground">
                            Last refreshed: {lastRefresh.toLocaleString()}
                          </div>
                        )}

                        {tokenExpired && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={refreshSupabaseToken}
                            disabled={tokenLoading}
                            className="w-full"
                          >
                            {tokenLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-2" />
                            ) : (
                              <RefreshCw className="h-3 w-3 mr-2" />
                            )}
                            Refresh Token
                          </Button>
                        )}

                        {tokenError && (
                          <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                            {tokenError}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Project Selection - Only show when connected */}
                    {connections.supabase.connected && connections.supabase.projects && connections.supabase.projects.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Select Project</Label>
                        <select
                          className="w-full p-2 border rounded-md text-sm"
                          value={connections.supabase.selectedProject?.id || ''}
                          onChange={async (e) => {
                            const selectedProject = connections.supabase.projects?.find(p => p.id === e.target.value)
                            if (selectedProject && user?.id) {
                              try {
                                // Get the access token
                                const tokens = await getDeploymentTokens(user.id)
                                const accessToken = tokens?.supabase

                                if (accessToken) {
                                  // Use server-side API to fetch project details and API keys (avoids CORS issues)
                                  try {
                                    // Fetch API keys automatically using server-side API
                                    const apiResponse = await fetch('/api/supabase/fetch-api-keys', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      },
                                      body: JSON.stringify({ 
                                        token: accessToken, 
                                        projectId: selectedProject.id 
                                      }),
                                    })

                                    const apiResult = await apiResponse.json()

                                    if (apiResponse.ok && apiResult.success) {
                                      // Store project details with automatically fetched keys
                                      await storeSupabaseProjectDetails(user.id, {
                                        selectedProjectId: selectedProject.id,
                                        selectedProjectName: selectedProject.name,
                                        projectUrl: apiResult.projectUrl,
                                        anonKey: apiResult.anonKey,
                                        serviceRoleKey: apiResult.serviceRoleKey
                                      })

                                      toast({
                                        title: "Project Selected",
                                        description: `Selected ${selectedProject.name}. API keys fetched automatically.`,
                                      })
                                    } else {
                                      throw new Error(apiResult.error || 'Could not fetch API keys')
                                    }
                                  } catch (apiError) {
                                    console.error("Error fetching API keys from API:", apiError)
                                    // Fallback: store basic project info only
                                    await storeSupabaseProjectDetails(user.id, {
                                      selectedProjectId: selectedProject.id,
                                      selectedProjectName: selectedProject.name
                                    })

                                    toast({
                                      title: "Project Selected",
                                      description: `Selected ${selectedProject.name}. API keys could not be fetched automatically.`,
                                      variant: "destructive"
                                    })
                                  }
                                }
                              } catch (error: any) {
                                console.error("Error selecting project:", error)
                                toast({
                                  title: "Error",
                                  description: "Failed to select project. Please try again.",
                                  variant: "destructive"
                                })
                              }
                            }

                            setConnections(prev => ({
                              ...prev,
                              supabase: { ...prev.supabase, selectedProject }
                            }))
                          }}
                        >
                          <option value="">Select a project...</option>
                          {connections.supabase.projects.map((project: any) => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                        {connections.supabase.selectedProject && (
                          <p className="text-xs text-muted-foreground">
                            Selected: {connections.supabase.selectedProject.name}
                            {(() => {
                              // Check if API keys are available
                              const checkKeys = async () => {
                                try {
                                  const details = await getSupabaseProjectDetails(user?.id || '')
                                  return details?.anonKey && details?.serviceRoleKey
                                } catch {
                                  return false
                                }
                              }
                              // This will be checked asynchronously
                              return null
                            })()}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Create New Project Button */}
                    {connections.supabase.connected && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateSupabaseProject()}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Project
                      </Button>
                    )}

                    {/* Error Message */}
                      {connectionForms.supabase.error && (
                        <p className="text-sm text-red-600">{connectionForms.supabase.error}</p>
                      )}

                    {/* Help Text */}
                      <p className="text-xs text-muted-foreground">
                      {connections.supabase.connected ? (
                        "Your token is securely stored. API keys are fetched automatically when selecting a project."
                      ) : (
                        <>
                          Enter your Supabase Management API token from{" "}
                          <a href="https://supabase.com/dashboard/account/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                            supabase.com/dashboard/account/tokens
                          </a>{" "}
                          or use{" "}
                          <a href="https://api.optimaai.cc/supabase-auth/login" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                            OAuth login
                          </a>
                        </>
                      )}
                      </p>
                    </div>
                </div>
              </CardContent>
            </Card>

            {/* Delete Account Card */}
            <Card className="md:col-span-2 border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  Delete Account
                </CardTitle>
                <CardDescription>
                  Permanently remove your account and all associated data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="deleteConfirmation">
                    Type "DELETE MY ACCOUNT" to confirm
                  </Label>
                  <Input
                    id="deleteConfirmation"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="DELETE MY ACCOUNT"
                  />
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      disabled={deleteConfirmation !== "DELETE MY ACCOUNT"}
                      className="w-full"
                    >
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        {isDeleting ? "Deleting..." : "Yes, delete my account"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  {/* Footer */}
  <Footer />
    </div>
  )
}

// Wrapper component with Suspense boundary for useSearchParams
export default function AccountSettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading account settings...</p>
        </div>
      </div>
    }>
      <AccountSettingsPageContent />
    </Suspense>
  )
}