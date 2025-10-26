"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { checkAdminAccess } from "@/lib/admin-utils"
import { sendEmail, sendNotificationEmail } from "@/lib/email"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  ArrowLeft,
  Users,
  UserCheck,
  UserX,
  Crown,
  RotateCcw,
  CheckSquare,
  Square,
  Download,
  Upload,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit,
  Trash2
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
  deploymentsThisMonth: number
  githubPushesThisMonth: number
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  lastPaymentDate: string | null
  cancelAtPeriodEnd: boolean
  isAdmin: boolean
  hasProfile: boolean
  hasSettings: boolean
}

const EMAIL_TYPES = [
  { value: 'notification', label: 'General Notification', description: 'Send general announcements or updates' },
  { value: 'marketing', label: 'Marketing Campaign', description: 'Promotional content and feature announcements' },
  { value: 'newsletter', label: 'Newsletter', description: 'Regular updates and company news' },
  { value: 'security', label: 'Security Alert', description: 'Important security notifications' },
  { value: 'feature', label: 'Feature Announcement', description: 'New feature releases and updates' },
  { value: 'billing', label: 'Billing Notification', description: 'Payment and billing related communications' },
  { value: 'support', label: 'Support Response', description: 'Customer support communications' },
  { value: 'welcome', label: 'Welcome Message', description: 'Welcome new users or team members' }
]

export default function AdminUsersPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserData[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [showUserDialog, setShowUserDialog] = useState(false)

  // Bulk selection state
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  // Email functionality state
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emailRecipients, setEmailRecipients] = useState<UserData[]>([])
  const [emailSubject, setEmailSubject] = useState('')
  const [emailContent, setEmailContent] = useState('')
  const [emailType, setEmailType] = useState('notification')
  const [sendingEmail, setSendingEmail] = useState(false)

  // Filter states
  const [planFilter, setPlanFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

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
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to fetch users: ${response.status}`)
      }

      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error loading users:', error)
      setUsers([])

      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('service role')) {
        alert('Admin user management requires Supabase service role configuration. Please check SUPABASE_SERVICE_ROLE_SETUP.md for setup instructions.')
      } else {
        alert(`Failed to load users: ${errorMessage}`)
      }
    }
  }

  // Bulk selection functions
  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)))
    }
  }

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  // Bulk actions
  const performBulkAction = async (action: string, targetPlan?: string) => {
    if (selectedUsers.size === 0) {
      alert('Please select users first')
      return
    }

    const confirmMessage = `Are you sure you want to ${action} ${selectedUsers.size} user(s)?`
    if (!confirm(confirmMessage)) return

    setBulkActionLoading(true)

    try {
      const userIds = Array.from(selectedUsers)
      const results = []

      for (const userId of userIds) {
        const response = await fetch('/api/admin/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            action,
            data: targetPlan ? { plan: targetPlan } : {}
          })
        })

        if (response.ok) {
          results.push({ userId, success: true })
        } else {
          const error = await response.json()
          results.push({ userId, success: false, error: error.error })
        }
      }

      const successCount = results.filter(r => r.success).length
      const failureCount = results.filter(r => !r.success).length

      if (successCount > 0) {
        alert(`✅ Successfully ${action} ${successCount} user(s)`)
      }
      if (failureCount > 0) {
        alert(`❌ Failed to ${action} ${failureCount} user(s)`)
      }

      // Clear selection and reload
      setSelectedUsers(new Set())
      await loadUsers()

    } catch (error) {
      console.error('Bulk action error:', error)
      alert('Error performing bulk action')
    } finally {
      setBulkActionLoading(false)
    }
  }

  // Email functionality
  const openEmailDialog = (recipients: UserData[]) => {
    setEmailRecipients(recipients)
    setEmailSubject('')
    setEmailContent('')
    setEmailType('notification')
    setShowEmailDialog(true)
  }

  const sendEmailToUsers = async () => {
    if (!emailSubject.trim() || !emailContent.trim()) {
      alert('Please provide both subject and content for the email')
      return
    }

    setSendingEmail(true)

    try {
      let successCount = 0
      let failedCount = 0

      for (const recipient of emailRecipients) {
        try {
          let result
          switch (emailType) {
            case 'notification':
              result = await sendNotificationEmail(recipient.email, emailSubject, emailContent)
              break
            case 'marketing':
              result = await sendEmail({
                to: recipient.email,
                subject: emailSubject,
                type: 'marketing',
                message: emailContent
              })
              break
            case 'newsletter':
              result = await sendEmail({
                to: recipient.email,
                subject: emailSubject,
                type: 'newsletter',
                title: emailSubject,
                content: emailContent,
                unsubscribe_url: 'https://pipilot.dev/unsubscribe'
              })
              break
            case 'security':
              result = await sendEmail({
                to: recipient.email,
                subject: emailSubject,
                type: 'security',
                title: emailSubject,
                content: emailContent,
                action_url: 'https://pipilot.dev/security'
              })
              break
            case 'feature':
              result = await sendEmail({
                to: recipient.email,
                subject: emailSubject,
                type: 'feature',
                title: emailSubject,
                feature_name: 'New Feature',
                content: emailContent,
                try_url: 'https://pipilot.dev/features'
              })
              break
            case 'billing':
              result = await sendEmail({
                to: recipient.email,
                subject: emailSubject,
                type: 'billing',
                title: emailSubject,
                content: emailContent,
                amount: '$0.00',
                action_url: 'https://pipilot.dev/billing'
              })
              break
            case 'support':
              result = await sendEmail({
                to: recipient.email,
                subject: emailSubject,
                type: 'support',
                title: emailSubject,
                content: emailContent,
                ticket_id: 'N/A',
                support_url: 'https://pipilot.dev/support'
              })
              break
            case 'welcome':
              result = await sendEmail({
                to: recipient.email,
                subject: emailSubject,
                type: 'welcome',
                user_name: recipient.fullName || recipient.email.split('@')[0],
                organization_name: 'Pixel Pilot'
              })
              break
            default:
              result = await sendNotificationEmail(recipient.email, emailSubject, emailContent)
          }

          if (result.success) {
            successCount++
          } else {
            failedCount++
            console.error(`Failed to send email to ${recipient.email}:`, result.error)
          }
        } catch (error) {
          failedCount++
          console.error(`Error sending email to ${recipient.email}:`, error)
        }
      }

      alert(`Email campaign completed!\n✅ Successfully sent: ${successCount}\n❌ Failed: ${failedCount}`)

      setShowEmailDialog(false)
      setEmailRecipients([])
      setEmailSubject('')
      setEmailContent('')

    } catch (error) {
      console.error('Error in email sending:', error)
      alert('An error occurred while sending emails')
    } finally {
      setSendingEmail(false)
    }
  }

  // Enhanced filtering
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (user.fullName && user.fullName.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesPlan = planFilter === "all" || user.subscriptionPlan === planFilter
    const matchesStatus = statusFilter === "all" || user.subscriptionStatus === statusFilter

    return matchesSearch && matchesPlan && matchesStatus
  })

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
                    {users.reduce((sum, u) => sum + u.deploymentsThisMonth, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Deployments (Month)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-500" />
                Pro Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.subscriptionPlan === 'pro').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-500" />
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.subscriptionStatus === 'active').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Past Due
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.subscriptionStatus === 'past_due').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
            <CardDescription>
              Manage user accounts, subscriptions, and access levels with powerful bulk operations
            </CardDescription>

            {/* Bulk Actions Toolbar */}
            {selectedUsers.size > 0 && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm font-medium text-blue-900">
                  {selectedUsers.size} user(s) selected
                </span>

                <div className="flex gap-2 ml-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => performBulkAction('upgrade_to_pro')}
                    disabled={bulkActionLoading}
                    className="text-green-700 border-green-300 hover:bg-green-50"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    {bulkActionLoading ? 'Upgrading...' : 'Upgrade to Pro'}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => performBulkAction('downgrade_to_free')}
                    disabled={bulkActionLoading}
                    className="text-orange-700 border-orange-300 hover:bg-orange-50"
                  >
                    <TrendingDown className="h-4 w-4 mr-2" />
                    {bulkActionLoading ? 'Downgrading...' : 'Downgrade to Free'}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => performBulkAction('reset_usage')}
                    disabled={bulkActionLoading}
                    className="text-blue-700 border-blue-300 hover:bg-blue-50"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {bulkActionLoading ? 'Resetting...' : 'Reset Usage'}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const selectedUserData = users.filter(u => selectedUsers.has(u.id))
                      openEmailDialog(selectedUserData)
                    }}
                    disabled={bulkActionLoading}
                    className="text-purple-700 border-purple-300 hover:bg-purple-50"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </Button>
                </div>
              </div>
            )}

            {/* Filters and Search */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users by email or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Plans</option>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="trialing">Trial</option>
                <option value="past_due">Past Due</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      className="p-0 h-auto"
                    >
                      {selectedUsers.size === filteredUsers.length && filteredUsers.length > 0 ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((userData) => (
                  <TableRow key={userData.id}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectUser(userData.id)}
                        className="p-0 h-auto"
                      >
                        {selectedUsers.has(userData.id) ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
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
                        <div className="text-xs text-muted-foreground">
                          Deployments: {userData.deploymentsThisMonth}/{userData.subscriptionPlan === 'pro' ? 10 : 5}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          GitHub: {userData.githubPushesThisMonth}/2
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
                          <DropdownMenuItem onClick={() => openEmailDialog([userData])}>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />

                          {/* Subscription Management */}
                          {userData.subscriptionPlan !== 'pro' && (
                            <DropdownMenuItem
                              onClick={async () => {
                                if (confirm(`Upgrade ${userData.email} to Pro plan?`)) {
                                  try {
                                    const response = await fetch('/api/admin/users', {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        userId: userData.id,
                                        action: 'upgrade_to_pro'
                                      })
                                    })

                                    if (response.ok) {
                                      alert('User upgraded to Pro successfully!')
                                      await loadUsers()
                                    } else {
                                      const err = await response.json()
                                      alert(err.error || 'Failed to upgrade user')
                                    }
                                  } catch (error) {
                                    console.error('Error upgrading user:', error)
                                    alert('Error upgrading user')
                                  }
                                }
                              }}
                              className="text-green-600"
                            >
                              <TrendingUp className="h-4 w-4 mr-2" />
                              Upgrade to Pro
                            </DropdownMenuItem>
                          )}

                          {userData.subscriptionPlan === 'pro' && (
                            <DropdownMenuItem
                              onClick={async () => {
                                if (confirm(`Downgrade ${userData.email} to Free plan?`)) {
                                  try {
                                    const response = await fetch('/api/admin/users', {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        userId: userData.id,
                                        action: 'downgrade_to_free'
                                      })
                                    })

                                    if (response.ok) {
                                      alert('User downgraded to Free successfully!')
                                      await loadUsers()
                                    } else {
                                      const err = await response.json()
                                      alert(err.error || 'Failed to downgrade user')
                                    }
                                  } catch (error) {
                                    console.error('Error downgrading user:', error)
                                    alert('Error downgrading user')
                                  }
                                }
                              }}
                              className="text-orange-600"
                            >
                              <TrendingDown className="h-4 w-4 mr-2" />
                              Downgrade to Free
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            onClick={async () => {
                              if (confirm(`Reset usage counters for ${userData.email}?`)) {
                                try {
                                  const response = await fetch('/api/admin/users', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      userId: userData.id,
                                      action: 'reset_usage'
                                    })
                                  })

                                  if (response.ok) {
                                    alert('Usage counters reset successfully!')
                                    await loadUsers()
                                  } else {
                                    const err = await response.json()
                                    alert(err.error || 'Failed to reset usage')
                                  }
                                } catch (error) {
                                  console.error('Error resetting usage:', error)
                                  alert('Error resetting usage')
                                }
                              }
                            }}
                            className="text-blue-600"
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reset Usage
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={async () => {
                              if (confirm(`Permanently delete user ${userData.email}? This cannot be undone.`)) {
                                try {
                                  const response = await fetch('/api/admin/users', {
                                    method: 'DELETE',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: userData.id })
                                  })

                                  if (response.ok) {
                                    alert('User deleted successfully!')
                                    await loadUsers()
                                  } else {
                                    const err = await response.json().catch(() => ({}))
                                    alert(err.error || 'Failed to delete user')
                                  }
                                } catch (error) {
                                  console.error('Error deleting user:', error)
                                  alert('Error deleting user')
                                }
                              }
                            }}
                          >
                            Delete User
                          </DropdownMenuItem>
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
                              const action = confirm('Reset monthly usage counters for this user?')
                              if (action) {
                                try {
                                  const response = await fetch('/api/admin/users', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      userId: userData.id,
                                      action: 'reset_usage',
                                      data: {}
                                    })
                                  })

                                  if (response.ok) {
                                    alert('Usage counters reset successfully!')
                                    await loadUsers()
                                  } else {
                                    alert('Failed to reset usage counters')
                                  }
                                } catch (error) {
                                  console.error('Error resetting usage counters:', error)
                                  alert('Error resetting usage counters')
                                }
                              }
                            }}
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            Reset Usage
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

                {/* Usage Details */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium">Deployments</span>
                      </div>
                      <p className="text-2xl font-bold">{selectedUser.deploymentsThisMonth}</p>
                      <p className="text-xs text-muted-foreground">
                        Limit: {selectedUser.subscriptionPlan === 'pro' ? 10 : 5}/month
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium">GitHub Pushes</span>
                      </div>
                      <p className="text-2xl font-bold">{selectedUser.githubPushesThisMonth}</p>
                      <p className="text-xs text-muted-foreground">
                        Limit: 2/month
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

        {/* Email Composition Dialog */}
        <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Send Email</DialogTitle>
              <DialogDescription>
                Compose and send an email to {emailRecipients.length} recipient{emailRecipients.length !== 1 ? 's' : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Recipients Preview */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Recipients</label>
                <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
                  {emailRecipients.map((recipient) => (
                    <Badge key={recipient.id} variant="secondary" className="text-xs">
                      {recipient.email}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Email Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Type</label>
                <Select value={emailType} onValueChange={setEmailType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select email type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMAIL_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Enter email subject..."
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  placeholder="Enter your message..."
                  rows={8}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={sendEmailToUsers}
                disabled={sendingEmail || !emailSubject.trim() || !emailContent.trim()}
              >
                {sendingEmail ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email{emailRecipients.length > 1 ? ` (${emailRecipients.length})` : ''}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
