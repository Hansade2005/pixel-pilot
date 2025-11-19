"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { checkAdminAccess } from "@/lib/admin-utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Bell,
  Send,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Filter,
  Search,
  Loader2,
  ArrowLeft,
  Shield,
  Activity,
  Target,
  TrendingUp,
  BarChart3,
  PieChart,
  Zap,
  Globe,
  LineChart,
  Eye,
  EyeOff
} from "lucide-react"

interface AdminNotification {
  id: string
  title: string
  message: string
  type: string
  target_audience: string
  specific_user_ids: string[]
  url?: string
  image_url?: string
  priority: number
  expires_at?: string
  is_active: boolean
  sent_at: string
  created_at: string
  sent_by_profile?: {
    email: string
    full_name: string | null
  }
}

interface NotificationStats {
  total: number
  read: number
  unread: number
}

export default function AdminNotificationsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [stats, setStats] = useState<NotificationStats>({ total: 0, read: 0, unread: 0 })
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 })
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [audienceFilter, setAudienceFilter] = useState<string>('all')

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    targetAudience: 'all_users',
    specificUserIds: [] as string[],
    url: '',
    imageUrl: '',
    priority: 1,
    expiresAt: ''
  })

  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    checkAccessAndLoadData()
  }, [])

  const checkAccessAndLoadData = async () => {
    try {
      const supabase = createClient()
      const { data: { user: currentUser } } = await supabase.auth.getUser()

      if (!currentUser || !checkAdminAccess(currentUser)) {
        router.push('/')
        return
      }

      setUser(currentUser)
      await loadNotifications()
    } catch (error) {
      console.error('Error checking access:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const loadNotifications = async (page = 1) => {
    try {
      const response = await fetch(`/api/admin/notifications?page=${page}&limit=${pagination.limit}`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setPagination(data.pagination || pagination)
        setStats(data.stats || stats)
      } else {
        toast({
          title: "Error",
          description: "Failed to load notifications",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive"
      })
    }
  }

  const handleCreateNotification = async () => {
    if (!formData.title || !formData.message) {
      toast({
        title: "Error",
        description: "Title and message are required",
        variant: "destructive"
      })
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Success",
          description: `Notification sent to ${data.recipientsCount} users`,
        })
        setShowCreateDialog(false)
        setFormData({
          title: '',
          message: '',
          type: 'info',
          targetAudience: 'all_users',
          specificUserIds: [],
          url: '',
          imageUrl: '',
          priority: 1,
          expiresAt: ''
        })
        await loadNotifications()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to send notification",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error creating notification:', error)
      toast({
        title: "Error",
        description: "Failed to send notification",
        variant: "destructive"
      })
    } finally {
      setSending(false)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'info': return 'bg-blue-100 text-blue-800'
      case 'success': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'announcement': return 'bg-purple-100 text-purple-800'
      case 'feature': return 'bg-indigo-100 text-indigo-800'
      case 'maintenance': return 'bg-orange-100 text-orange-800'
      case 'security': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getAudienceLabel = (audience: string) => {
    switch (audience) {
      case 'all_users': return 'All Users'
      case 'specific_users': return 'Specific Users'
      case 'plan_free': return 'Free Plan Users'
      case 'plan_pro': return 'Pro Plan Users'
      case 'plan_teams': return 'Teams Plan Users'
      case 'plan_enterprise': return 'Enterprise Plan Users'
      case 'active_users': return 'Active Users'
      case 'inactive_users': return 'Inactive Users'
      default: return audience
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Notifications</h1>
          <p className="text-muted-foreground">Send notifications to users and manage notification campaigns</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Send Notification
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Send New Notification</DialogTitle>
              <DialogDescription>
                Create and send a notification to users. Choose your target audience and notification details.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="col-span-3"
                  placeholder="Notification title"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="message" className="text-right">Message</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="col-span-3"
                  placeholder="Notification message"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="feature">Feature</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="audience" className="text-right">Target Audience</Label>
                <Select value={formData.targetAudience} onValueChange={(value) => setFormData({ ...formData, targetAudience: value })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_users">All Users</SelectItem>
                    <SelectItem value="plan_free">Free Plan Users</SelectItem>
                    <SelectItem value="plan_pro">Pro Plan Users</SelectItem>
                    <SelectItem value="plan_teams">Teams Plan Users</SelectItem>
                    <SelectItem value="plan_enterprise">Enterprise Plan Users</SelectItem>
                    <SelectItem value="active_users">Active Users (30 days)</SelectItem>
                    <SelectItem value="inactive_users">Inactive Users (30+ days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="url" className="text-right">URL (optional)</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="col-span-3"
                  placeholder="https://..."
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="priority" className="text-right">Priority</Label>
                <Select value={formData.priority.toString()} onValueChange={(value) => setFormData({ ...formData, priority: parseInt(value) })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Low</SelectItem>
                    <SelectItem value="2">Normal</SelectItem>
                    <SelectItem value="3">High</SelectItem>
                    <SelectItem value="4">Urgent</SelectItem>
                    <SelectItem value="5">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateNotification} disabled={sending}>
                {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Notification
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Sent to users
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Read</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.read}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.read / stats.total) * 100) : 0}% read rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unread}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting user attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Notifications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Notification History</CardTitle>
          <CardDescription>
            View all notifications sent to users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="announcement">Announcement</SelectItem>
                <SelectItem value="feature">Feature</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="security">Security</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Sent By</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications
                .filter(notification =>
                  (searchQuery === '' ||
                    notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    notification.message.toLowerCase().includes(searchQuery.toLowerCase())) &&
                  (typeFilter === 'all' || notification.type === typeFilter)
                )
                .map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{notification.title}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {notification.message}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(notification.type)}>
                        {notification.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{getAudienceLabel(notification.target_audience)}</TableCell>
                    <TableCell>
                      {notification.sent_by_profile?.full_name || notification.sent_by_profile?.email || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {new Date(notification.sent_at).toLocaleDateString()} at{' '}
                      {new Date(notification.sent_at).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={notification.is_active ? "default" : "secondary"}>
                        {notification.is_active ? 'Active' : 'Expired'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>

          {notifications.length === 0 && (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No notifications yet</h3>
              <p className="text-muted-foreground">Send your first notification to users</p>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} notifications
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadNotifications(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadNotifications(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}