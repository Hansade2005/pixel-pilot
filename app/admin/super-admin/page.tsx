"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { checkSuperAdminAccess } from "@/lib/admin-utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  Search,
  Filter,
  MoreHorizontal,
  User,
  Database,
  HardDrive,
  Play,
  Pause,
  Trash2,
  Eye,
  ArrowLeft,
  Crown,
  Shield,
  AlertTriangle,
  CheckCircle,
  Users,
  Activity,
  Calendar,
  Mail
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface UserProfile {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
  user_metadata: any
  app_metadata: any
}

interface DatabaseInfo {
  id: string
  name: string
  created_at: string
  updated_at: string
  workspace_id: string
  is_active: boolean
  size_mb?: number
  table_count?: number
}

interface UserWithDatabases extends UserProfile {
  databases: DatabaseInfo[]
  totalDbSize: number
  databaseCount: number
}

export default function SuperAdminPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserWithDatabases[]>([])
  const [selectedUser, setSelectedUser] = useState<UserWithDatabases | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showUserDialog, setShowUserDialog] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAndLoadData()
  }, [])

  const checkAdminAndLoadData = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        router.push('/auth/login')
        return
      }

      if (!checkSuperAdminAccess(user)) {
        router.push('/workspace')
        return
      }

      setUser(user)
      await loadAllUsers()
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/workspace')
    } finally {
      setLoading(false)
    }
  }

  const loadAllUsers = async () => {
    try {
      const response = await fetch('/api/admin/super-admin', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load users')
      }

      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error loading users:', error)
      toast({
        title: "Error",
        description: "Failed to load users data",
        variant: "destructive"
      })
    }
  }

  const toggleDatabaseStatus = async (databaseId: string, currentStatus: boolean) => {
    try {
      const action = currentStatus ? 'pause' : 'activate'

      const response = await fetch('/api/admin/super-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          databaseId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update database status')
      }

      const data = await response.json()

      // Update local state
      setUsers(users.map(u => ({
        ...u,
        databases: u.databases.map(db =>
          db.id === databaseId ? { ...db, is_active: !currentStatus } : db
        )
      })))

      toast({
        title: "Success",
        description: data.message || `Database ${!currentStatus ? 'activated' : 'paused'} successfully`,
      })
    } catch (error) {
      console.error('Error toggling database status:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update database status",
        variant: "destructive"
      })
    }
  }

  const deleteDatabase = async (databaseId: string, databaseName: string) => {
    try {
      const response = await fetch('/api/admin/super-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'delete',
          databaseId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete database')
      }

      const data = await response.json()

      // Update local state
      setUsers(users.map(u => ({
        ...u,
        databases: u.databases.filter(db => db.id !== databaseId),
        databaseCount: u.databaseCount - 1,
        totalDbSize: u.totalDbSize - (u.databases.find(db => db.id === databaseId)?.size_mb || 0)
      })))

      toast({
        title: "Success",
        description: data.message || `Database "${databaseName}" deleted successfully`,
      })
    } catch (error) {
      console.error('Error deleting database:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete database",
        variant: "destructive"
      })
    }
  }

  const viewUserProfile = (userData: UserWithDatabases) => {
    setSelectedUser(userData)
    setShowUserDialog(true)
  }

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.user_metadata?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/admin')}
              className="flex items-center gap-2 w-fit"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Crown className="h-8 w-8 text-yellow-500" />
                Super Admin Panel
              </h1>
              <p className="text-gray-600 mt-1">Complete system control and user management</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Databases</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.reduce((sum, u) => sum + u.databaseCount, 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.reduce((sum, u) => sum + u.totalDbSize, 0).toFixed(1)} MB
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Databases</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.reduce((sum, u) => sum + u.databases.filter(db => db.is_active).length, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Search and manage all users in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search users by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile Card Layout */}
            <div className="block md:hidden space-y-4">
              {filteredUsers.map((userData) => (
                <Card key={userData.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={userData.user_metadata?.avatar_url} />
                          <AvatarFallback>
                            {userData.user_metadata?.full_name?.charAt(0) || userData.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">
                            {userData.user_metadata?.full_name || 'No name'}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">{userData.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {userData.databaseCount} DBs
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {userData.totalDbSize}MB
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => viewUserProfile(userData)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Mail className="mr-2 h-4 w-4" />
                            Send Email
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Status: {userData.email_confirmed_at ? 'Verified' : 'Unverified'}</div>
                      <div>Created: {new Date(userData.created_at).toLocaleDateString()}</div>
                      <div>Last sign-in: {userData.last_sign_in_at ? new Date(userData.last_sign_in_at).toLocaleDateString() : 'Never'}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Databases</TableHead>
                  <TableHead>Storage Used</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((userData) => (
                  <TableRow key={userData.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={userData.user_metadata?.avatar_url} />
                          <AvatarFallback>
                            {userData.user_metadata?.full_name?.charAt(0) || userData.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {userData.user_metadata?.full_name || 'No name'}
                          </div>
                          <div className="text-sm text-gray-500">{userData.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <div className="font-medium">{userData.databaseCount}</div>
                        <div className="text-sm text-gray-500">databases</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <div className="font-medium">{userData.totalDbSize.toFixed(1)} MB</div>
                        <div className="text-sm text-gray-500">total size</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={userData.email_confirmed_at ? "default" : "secondary"}>
                        {userData.email_confirmed_at ? "Verified" : "Unverified"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(userData.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => viewUserProfile(userData)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Mail className="mr-2 h-4 w-4" />
                            Send Email
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>

        {/* User Profile Dialog */}
        <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Profile: {selectedUser?.email}
              </DialogTitle>
              <DialogDescription>
                Complete user information and database management
              </DialogDescription>
            </DialogHeader>

            {selectedUser && (
              <div className="space-y-6">
                {/* User Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>User Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Full Name</Label>
                        <p>{selectedUser.user_metadata?.full_name || 'Not provided'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Email</Label>
                        <p>{selectedUser.email}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Created</Label>
                        <p>{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Last Sign In</Label>
                        <p>{selectedUser.last_sign_in_at ? new Date(selectedUser.last_sign_in_at).toLocaleDateString() : 'Never'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Databases */}
                <Card>
                  <CardHeader>
                    <CardTitle>Databases ({selectedUser.databases.length})</CardTitle>
                    <CardDescription>
                      Total storage: {selectedUser.totalDbSize.toFixed(1)} MB
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedUser.databases.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No databases found</p>
                    ) : (
                      <div className="space-y-4">
                        {selectedUser.databases.map((database) => (
                          <div key={database.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Database className="h-5 w-5 text-blue-500" />
                                <div>
                                  <h4 className="font-medium">{database.name}</h4>
                                  <p className="text-sm text-gray-500">
                                    Created: {new Date(database.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="text-sm font-medium">{database.size_mb} MB</div>
                                  <div className="text-xs text-gray-500">{database.table_count} tables</div>
                                </div>

                                <Badge variant={database.is_active ? "default" : "secondary"}>
                                  {database.is_active ? "Active" : "Paused"}
                                </Badge>

                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleDatabaseStatus(database.id, database.is_active)}
                                    className="flex items-center gap-1"
                                  >
                                    {database.is_active ? (
                                      <>
                                        <Pause className="h-3 w-3" />
                                        Pause
                                      </>
                                    ) : (
                                      <>
                                        <Play className="h-3 w-3" />
                                        Activate
                                      </>
                                    )}
                                  </Button>

                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Database</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "{database.name}"? This action cannot be undone.
                                          All data in this database will be permanently lost.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteDatabase(database.id, database.name)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Delete Database
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUserDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}