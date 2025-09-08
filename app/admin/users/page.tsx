"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { checkAdminAccess } from "@/lib/admin-utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  Search,
  Filter,
  MoreHorizontal,
  UserPlus,
  Mail,
  Calendar,
  CreditCard,
  Zap,
  Shield,
  Ban,
  CheckCircle,
  AlertTriangle,
  ArrowLeft
} from "lucide-react"

interface UserData {
  id: string
  email: string
  emailConfirmed: boolean
  createdAt: string
  lastSignIn: string | null
  fullName: string | null
  avatarUrl: string | null
  subscriptionPlan: string
  subscriptionStatus: string
  creditsRemaining: number
  creditsUsedThisMonth: number
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  lastPaymentDate: string | null
  cancelAtPeriodEnd: boolean
  isAdmin: boolean
  hasProfile: boolean
  hasSettings: boolean
}

export default function AdminUsersPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserData[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [showUserDialog, setShowUserDialog] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAndLoadUsers()
  }, [])

  const checkAdminAndLoadUsers = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        router.push('/auth/login')
        return
      }

      if (!checkAdminAccess(user)) {
        router.push('/workspace')
        return
      }

      setUser(user)
      await loadUsers()
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/workspace')
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      // Fetch all users from admin API
      const response = await fetch('/api/admin/users')

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`)
      }

      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error loading users:', error)
      setUsers([])
    }
  }

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.fullName && user.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>
      case 'trialing':
        return <Badge className="bg-blue-100 text-blue-800">Trial</Badge>
      case 'past_due':
        return <Badge className="bg-yellow-100 text-yellow-800">Past Due</Badge>
      case 'canceled':
        return <Badge className="bg-red-100 text-red-800">Canceled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'free':
        return <Badge variant="outline">Free</Badge>
      case 'pro':
        return <Badge className="bg-purple-100 text-purple-800">Pro</Badge>
      case 'teams':
        return <Badge className="bg-blue-100 text-blue-800">Teams</Badge>
      case 'enterprise':
        return <Badge className="bg-orange-100 text-orange-800">Enterprise</Badge>
      default:
        return <Badge variant="outline">{plan}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading user management...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin')}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">User Management</h1>
                <p className="text-sm text-muted-foreground">Manage system users and their subscriptions</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Admin Access
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Shield className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {users.filter(u => u.subscriptionStatus === 'active').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Active Subscribers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {users.filter(u => u.subscriptionPlan !== 'free').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Paid Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                  <Zap className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {users.reduce((sum, u) => sum + u.creditsUsedThisMonth, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Credits Used (Month)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
            <CardDescription>
              Manage user accounts, subscriptions, and access levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((userData) => (
                  <TableRow key={userData.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={userData.avatarUrl || undefined} />
                          <AvatarFallback>
                            {userData.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{userData.fullName || 'No name set'}</p>
                          <p className="text-sm text-muted-foreground">{userData.email}</p>
                          {userData.isAdmin && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              Admin
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getPlanBadge(userData.subscriptionPlan)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(userData.subscriptionStatus)}
                        {!userData.emailConfirmed && (
                          <Badge variant="outline" className="text-xs">
                            Email not confirmed
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{userData.creditsRemaining}</span>
                        <div className="text-xs text-muted-foreground">
                          Used: {userData.creditsUsedThisMonth}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(userData.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {userData.hasProfile ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                        <span className="text-xs">
                          {userData.hasProfile ? 'Complete' : 'Incomplete'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedUser(userData)
                            setShowUserDialog(true)
                          }}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {!userData.hasProfile && (
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  const response = await fetch('/api/admin/users', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      userId: userData.id,
                                      action: 'create_profile',
                                      data: { fullName: userData.email.split('@')[0] }
                                    })
                                  })

                                  if (response.ok) {
                                    alert('Profile created successfully!')
                                    await loadUsers()
                                  } else {
                                    alert('Failed to create profile')
                                  }
                                } catch (error) {
                                  console.error('Error creating profile:', error)
                                  alert('Error creating profile')
                                }
                              }}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Create Profile
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={async () => {
                              const newCredits = prompt('Enter new credit amount:', userData.creditsRemaining.toString())
                              if (newCredits && !isNaN(Number(newCredits))) {
                                try {
                                  const response = await fetch('/api/admin/users', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      userId: userData.id,
                                      action: 'update_credits',
                                      data: { credits: Number(newCredits) }
                                    })
                                  })

                                  if (response.ok) {
                                    alert('Credits updated successfully!')
                                    await loadUsers()
                                  } else {
                                    alert('Failed to update credits')
                                  }
                                } catch (error) {
                                  console.error('Error updating credits:', error)
                                  alert('Error updating credits')
                                }
                              }
                            }}
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            Update Credits
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={async () => {
                              const newPlan = prompt('Enter new plan (free/pro/teams/enterprise):', userData.subscriptionPlan)
                              if (newPlan && ['free', 'pro', 'teams', 'enterprise'].includes(newPlan)) {
                                try {
                                  const response = await fetch('/api/admin/users', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      userId: userData.id,
                                      action: 'update_plan',
                                      data: { plan: newPlan }
                                    })
                                  })

                                  if (response.ok) {
                                    alert('Plan updated successfully!')
                                    await loadUsers()
                                  } else {
                                    alert('Failed to update plan')
                                  }
                                } catch (error) {
                                  console.error('Error updating plan:', error)
                                  alert('Error updating plan')
                                }
                              }
                            }}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Change Plan
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={async () => {
                              if (confirm(`Are you sure you want to suspend user ${userData.email}?`)) {
                                try {
                                  const response = await fetch('/api/admin/users', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      userId: userData.id,
                                      action: 'suspend_user'
                                    })
                                  })

                                  if (response.ok) {
                                    alert('User suspended successfully!')
                                    await loadUsers()
                                  } else {
                                    alert('Failed to suspend user')
                                  }
                                } catch (error) {
                                  console.error('Error suspending user:', error)
                                  alert('Error suspending user')
                                }
                              }
                            }}
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Suspend User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* User Details Dialog */}
        <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                Detailed information about {selectedUser?.email}
              </DialogDescription>
            </DialogHeader>

            {selectedUser && (
              <div className="space-y-6">
                {/* User Info */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedUser.avatarUrl || undefined} />
                    <AvatarFallback className="text-lg">
                      {selectedUser.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {selectedUser.fullName || 'No name set'}
                    </h3>
                    <p className="text-muted-foreground">{selectedUser.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {getPlanBadge(selectedUser.subscriptionPlan)}
                      {getStatusBadge(selectedUser.subscriptionStatus)}
                      {selectedUser.isAdmin && (
                        <Badge variant="secondary" className="bg-red-100 text-red-800">
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Account Details */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Email Status</span>
                      </div>
                      <p className="text-lg font-semibold">
                        {selectedUser.emailConfirmed ? 'Verified' : 'Unverified'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last sign in: {selectedUser.lastSignIn
                          ? new Date(selectedUser.lastSignIn).toLocaleDateString()
                          : 'Never'
                        }
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <UserPlus className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Profile Status</span>
                      </div>
                      <p className="text-lg font-semibold">
                        {selectedUser.hasProfile ? 'Complete' : 'Incomplete'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Settings: {selectedUser.hasSettings ? 'Configured' : 'Not set'}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Subscription Details */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium">Credits</span>
                      </div>
                      <p className="text-2xl font-bold">{selectedUser.creditsRemaining}</p>
                      <p className="text-xs text-muted-foreground">
                        Used this month: {selectedUser.creditsUsedThisMonth}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Member Since</span>
                      </div>
                      <p className="text-lg font-semibold">
                        {new Date(selectedUser.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Math.floor((Date.now() - new Date(selectedUser.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days ago
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Billing Information */}
                {selectedUser.stripeCustomerId && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium">Stripe Information</span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Customer ID: {selectedUser.stripeCustomerId}</p>
                        {selectedUser.stripeSubscriptionId && (
                          <p>Subscription ID: {selectedUser.stripeSubscriptionId}</p>
                        )}
                        {selectedUser.lastPaymentDate && (
                          <p>Last Payment: {new Date(selectedUser.lastPaymentDate).toLocaleDateString()}</p>
                        )}
                        {selectedUser.cancelAtPeriodEnd && (
                          <p className="text-red-600">Cancels at period end</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage Subscription
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Shield className="h-4 w-4 mr-2" />
                    User Settings
                  </Button>
                </div>
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
