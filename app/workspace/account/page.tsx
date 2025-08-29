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
  Info
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { storageManager } from "@/lib/storage-manager"
import { 
  uploadBackupToCloud,
  restoreBackupFromCloud,
  isCloudSyncEnabled as isCloudSyncEnabledUtil,
  setCloudSyncEnabled as setCloudSyncEnabledUtil,
  getLastBackupTime as getLastBackupTimeUtil
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
import { GlobalHeader } from "../../../components/workspace/global-header"

export default function AccountSettingsPage() {
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [cloudSyncEnabled, setCloudSyncEnabledState] = useState(false)
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [backupStatus, setBackupStatus] = useState<"idle" | "syncing" | "success" | "error">("idle")
  
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
    }
  }, [user])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <GlobalHeader 
        title="Account Settings"
        showSettingsButton={false}
      />
      
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex flex-col space-y-2 mb-8">
            <h1 className="text-3xl font-bold">Account Settings</h1>
            <p className="text-muted-foreground">
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
  )
}