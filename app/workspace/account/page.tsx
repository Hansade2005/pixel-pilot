"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
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
  Github,
  ExternalLink,
  Unlink,
  Loader2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { storageManager } from "@/lib/storage-manager"
import { 
  uploadBackupToCloud,
  restoreBackupFromCloud,
  isCloudSyncEnabled as isCloudSyncEnabledUtil,
  setCloudSyncEnabled as setCloudSyncEnabledUtil,
  getLastBackupTime as getLastBackupTimeUtil,
  storeDeploymentTokens,
  getDeploymentTokens
} from "@/lib/cloud-sync"
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

export default function AccountSettingsPage() {
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [cloudSyncEnabled, setCloudSyncEnabledState] = useState(false)
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [backupStatus, setBackupStatus] = useState<"idle" | "syncing" | "success" | "error">("idle")

  // Connection status states
  const [connections, setConnections] = useState({
    github: { connected: false, username: '', avatarUrl: '', loading: false },
    vercel: { connected: false, username: '', avatarUrl: '', loading: false },
    netlify: { connected: false, username: '', avatarUrl: '', loading: false }
  })

  // Connection form states
  const [connectionForms, setConnectionForms] = useState({
    github: { token: '', isValidating: false, error: '' },
    vercel: { token: '', isValidating: false, error: '' },
    netlify: { token: '', isValidating: false, error: '' }
  })
  
  // Password change form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  
  // Delete account form state
  const [deleteConfirmation, setDeleteConfirmation] = useState("")

  const supabase = createClient()

  useEffect(() => {
    fetchUser()
  }, [])

  useEffect(() => {
    if (user?.id) {
      checkCloudSyncStatus(user.id)
      checkConnectionStatus(user.id)
    }
  }, [user])

  // Validate and connect to a provider
  const handleConnect = async (provider: 'github' | 'vercel' | 'netlify') => {
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
      }

      // Save token
      await storageManager.createToken({
        userId: user?.id,
        provider,
        token
      })

      // Update connection status
      setConnections(prev => ({
        ...prev,
        [provider]: {
          connected: true,
          username: provider === 'github' ? userData.login :
                   provider === 'vercel' ? (userData.username || userData.name) :
                   (userData.login || userData.email),
          avatarUrl: provider === 'github' ? userData.avatar_url :
                    provider === 'vercel' ? userData.avatar :
                    userData.avatar_url,
          loading: false
        }
      }))

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

  // Disconnect from a provider
  const handleDisconnect = async (provider: 'github' | 'vercel' | 'netlify') => {
    try {
      setConnections(prev => ({
        ...prev,
        [provider]: { ...prev[provider], loading: true }
      }))

      await storageManager.deleteToken(provider)

      setConnections(prev => ({
        ...prev,
        [provider]: {
          connected: false,
          username: '',
          avatarUrl: '',
          loading: false
        }
      }))

      toast({
        title: "Disconnected",
        description: `Successfully disconnected from ${provider.charAt(0).toUpperCase() + provider.slice(1)}`,
      })
    } catch (error) {
      console.error(`Error disconnecting from ${provider}:`, error)
      toast({
        title: "Error",
        description: `Failed to disconnect from ${provider.charAt(0).toUpperCase() + provider.slice(1)}`,
        variant: "destructive"
      })

      setConnections(prev => ({
        ...prev,
        [provider]: { ...prev[provider], loading: false }
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

      // Store token
      const tokens = { [provider]: token }
      const success = await storeDeploymentTokens(user.id, tokens)

      if (!success) {
        throw new Error(`Failed to store ${provider} token`)
      }

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

  // Fetch existing connection status
  const checkConnectionStatus = async (userId: string) => {
    try {
      const tokens = await getDeploymentTokens(userId)

      if (!tokens) return

      // Update connection status based on tokens
      setConnections(prev => ({
        github: { 
          ...prev.github, 
          connected: !!tokens.github,
          loading: false 
        },
        vercel: { 
          ...prev.vercel, 
          connected: !!tokens.vercel,
          loading: false 
        },
        netlify: { 
          ...prev.netlify, 
          connected: !!tokens.netlify,
          loading: false 
        }
      }))
    } catch (error) {
      console.error("Error checking connection status:", error)
    }
  }

  // Validate deployment token (you'll need to implement this)
  const validateDeploymentToken = async (
    provider: 'github' | 'vercel' | 'netlify', 
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
              'Authorization': `Bearer ${token}`
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
              'Authorization': `Bearer ${token}`
            }
          })
          return response.ok
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Gradient Background */}
      <div className="absolute inset-0 lovable-gradient" />

      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 noise-texture" />

      {/* Navigation */}
      <Navigation />

      <div className="relative z-10 pt-16 pb-24">
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
                      <Input
                        id="name"
                        value={user?.user_metadata?.full_name || "Not set"}
                        readOnly
                        className="bg-muted"
                      />
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

            {/* Change Password Card */}
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
                        <Github className="h-5 w-5" />
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

                  {connections.github.connected ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600">Connected</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
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
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          placeholder="Enter your GitHub personal access token"
                          value={connectionForms.github.token}
                          onChange={(e) => setConnectionForms(prev => ({
                            ...prev,
                            github: { ...prev.github, token: e.target.value, error: '' }
                          }))}
                          className={connectionForms.github.error ? "border-red-500" : ""}
                        />
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
                      </div>
                      {connectionForms.github.error && (
                        <p className="text-sm text-red-600">{connectionForms.github.error}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Need a token? <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Create one here</a>
                      </p>
                    </div>
                  )}
                </div>

                {/* Vercel Connection */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-black rounded-full">
                        <span className="text-white font-bold text-xs">▲</span>
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

                  {connections.vercel.connected ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600">Connected</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
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
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          placeholder="Enter your Vercel personal access token"
                          value={connectionForms.vercel.token}
                          onChange={(e) => setConnectionForms(prev => ({
                            ...prev,
                            vercel: { ...prev.vercel, token: e.target.value, error: '' }
                          }))}
                          className={connectionForms.vercel.error ? "border-red-500" : ""}
                        />
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
                      </div>
                      {connectionForms.vercel.error && (
                        <p className="text-sm text-red-600">{connectionForms.vercel.error}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Need a token? <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Create one here</a>
                      </p>
                    </div>
                  )}
                </div>

                {/* Netlify Connection */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-teal-500 rounded-full">
                        <span className="text-white font-bold text-xs">N</span>
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

                  {connections.netlify.connected ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600">Connected</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
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
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          placeholder="Enter your Netlify personal access token"
                          value={connectionForms.netlify.token}
                          onChange={(e) => setConnectionForms(prev => ({
                            ...prev,
                            netlify: { ...prev.netlify, token: e.target.value, error: '' }
                          }))}
                          className={connectionForms.netlify.error ? "border-red-500" : ""}
                        />
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
                      </div>
                      {connectionForms.netlify.error && (
                        <p className="text-sm text-red-600">{connectionForms.netlify.error}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Need a token? <a href="https://app.netlify.com/user/applications#personal-access-tokens" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Create one here</a>
                      </p>
                    </div>
                  )}
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

      {/* Footer */}
      <Footer />
    </div>
    </div>
  )
}