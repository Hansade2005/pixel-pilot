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
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { EmailAIAssistant } from "@/components/email-ai-assistant"
import {
  Mail,
  Send,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Settings,
  History,
  Plus,
  Trash2,
  Eye,
  Download,
  Upload,
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
  LineChart
} from "lucide-react"
import {
  sendEmail,
  sendNotificationEmail,
  sendTeamInvitation,
  sendWelcomeEmail,
  sendTeamMemberJoinedNotification
} from "@/lib/email"
import {
  loadEmailTemplates,
  getEmailCategories,
  type EmailTemplate,
  type EmailCategory
} from "@/lib/email-templates"

interface UserData {
  id: string
  email: string
  fullName: string | null
  subscriptionPlan: string
  subscriptionStatus: string
  createdAt: string
  emailConfirmed: boolean
  avatarUrl: string | null
  isAdmin: boolean
}

interface EmailCampaign {
  id: string
  name: string
  type: string
  subject: string
  recipientCount: number
  sentCount: number
  status: 'draft' | 'sending' | 'completed' | 'failed'
  createdAt: string
  sentAt?: string
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

export default function AdminEmailPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserData[]>([])
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [emailType, setEmailType] = useState<string>('notification')
  const [emailSubject, setEmailSubject] = useState<string>('')
  const [emailContent, setEmailContent] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [sendProgress, setSendProgress] = useState(0)
  const [sendResults, setSendResults] = useState<{success: number, failed: number}>({success: 0, failed: 0})
  const [showComposeDialog, setShowComposeDialog] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])
  const [emailCategories, setEmailCategories] = useState<EmailCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showTemplatePreview, setShowTemplatePreview] = useState(false)

  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    checkAccessAndLoadData()
  }, [])

  const checkAccessAndLoadData = async () => {
    try {
      const supabase = createClient()
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

      // Load email templates from API
      const templatesData = await loadEmailTemplates()
      setEmailTemplates(templatesData.templates)
      setEmailCategories(templatesData.categories)

      await Promise.all([
        fetchUsers(),
        fetchEmailCampaigns()
      ])
    } catch (error) {
      console.error('Error checking access:', error)
      router.push('/auth/login')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      // Fetch all users from admin API (same as admin/users page)
      const response = await fetch('/api/admin/users')

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to fetch users: ${response.status}`)
      }

      const data = await response.json()
      const usersData = data.users || []

      // Format users for email page (simplified version)
      const formattedUsers: UserData[] = usersData.map((user: any) => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName || user.full_name || null,
        subscriptionPlan: user.subscriptionPlan || user.subscription_plan || 'free',
        subscriptionStatus: user.subscriptionStatus || user.subscription_status || 'inactive',
        createdAt: user.createdAt || user.created_at,
        emailConfirmed: user.emailConfirmed !== undefined ? user.emailConfirmed : !!user.email_confirmed_at
      }))

      setUsers(formattedUsers)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: "Error loading users",
        description: "Failed to fetch user data",
        variant: "destructive"
      })
    }
  }

  const fetchEmailCampaigns = async () => {
    try {
      const response = await fetch('/api/admin/email-campaigns')
      if (response.ok) {
        const data = await response.json()
        setCampaigns(data.campaigns || [])
      }
    } catch (error) {
      console.error('Error fetching email campaigns:', error)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.fullName && user.fullName.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesPlan = planFilter === 'all' || user.subscriptionPlan === planFilter
    const matchesStatus = statusFilter === 'all' || user.subscriptionStatus === statusFilter

    return matchesSearch && matchesPlan && matchesStatus
  })

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)))
    }
  }

  const applyTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setEmailType(template.type)
    setEmailSubject(template.subject)
    setEmailContent(template.content)
  }

  const handleAIGenerate = (subject: string, content: string, template?: EmailTemplate) => {
    setEmailSubject(subject)
    setEmailContent(content)
    if (template) {
      setSelectedTemplate(template)
      setEmailType(template.type)
    }
  }

  const sendBulkEmails = async () => {
    if (selectedUsers.size === 0) {
      toast({
        title: "No recipients selected",
        description: "Please select at least one user to send emails to",
        variant: "destructive"
      })
      return
    }

    if (!emailSubject.trim() || !emailContent.trim()) {
      toast({
        title: "Email content required",
        description: "Please provide both subject and content for the email",
        variant: "destructive"
      })
      return
    }

    setSending(true)
    setSendProgress(0)
    setSendResults({success: 0, failed: 0})

    const recipientEmails = users
      .filter(u => selectedUsers.has(u.id))
      .map(u => u.email)

    const totalEmails = recipientEmails.length
    let successCount = 0
    let failedCount = 0

    try {
      // Send emails in batches to avoid overwhelming the API
      const batchSize = 5
      for (let i = 0; i < recipientEmails.length; i += batchSize) {
        const batch = recipientEmails.slice(i, i + batchSize)

        const promises = batch.map(async (email) => {
          try {
            let result
            switch (emailType) {
              case 'notification':
                result = await sendNotificationEmail(email, emailSubject, emailContent)
                break
              case 'marketing':
                result = await sendEmail({
                  to: email,
                  subject: emailSubject,
                  type: 'marketing',
                  message: emailContent
                })
                break
              case 'newsletter':
                result = await sendEmail({
                  to: email,
                  subject: emailSubject,
                  type: 'newsletter',
                  title: emailSubject,
                  content: emailContent,
                  unsubscribe_url: 'https://pipilot.dev/unsubscribe'
                })
                break
              case 'security':
                result = await sendEmail({
                  to: email,
                  subject: emailSubject,
                  type: 'security',
                  title: emailSubject,
                  content: emailContent,
                  action_url: 'https://pipilot.dev/security'
                })
                break
              case 'feature':
                result = await sendEmail({
                  to: email,
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
                  to: email,
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
                  to: email,
                  subject: emailSubject,
                  type: 'support',
                  title: emailSubject,
                  content: emailContent,
                  ticket_id: 'N/A',
                  support_url: 'https://pipilot.dev/support'
                })
                break
              case 'welcome':
                result = await sendWelcomeEmail(email, email.split('@')[0], 'Pixel Pilot')
                break
              default:
                result = await sendNotificationEmail(email, emailSubject, emailContent)
            }

            if (result.success) {
              successCount++
            } else {
              failedCount++
              console.error(`Failed to send email to ${email}:`, result.error)
            }
          } catch (error) {
            failedCount++
            console.error(`Error sending email to ${email}:`, error)
          }
        })

        await Promise.all(promises)

        // Update progress
        const progress = Math.round(((i + batch.length) / totalEmails) * 100)
        setSendProgress(progress)
        setSendResults({success: successCount, failed: failedCount})
      }

      // Final update
      setSendProgress(100)
      setSendResults({success: successCount, failed: failedCount})

      toast({
        title: "Bulk email campaign completed",
        description: `Successfully sent ${successCount} emails${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
        variant: failedCount > 0 ? "destructive" : "default"
      })

      // Reset form
      setSelectedUsers(new Set())
      setEmailSubject('')
      setEmailContent('')
      setShowComposeDialog(false)

    } catch (error) {
      console.error('Error in bulk email sending:', error)
      toast({
        title: "Bulk email failed",
        description: "An error occurred while sending emails",
        variant: "destructive"
      })
    } finally {
      setSending(false)
    }
  }

  const handleExportEmailReport = () => {
    // Export email campaign report
    // For now, just show an alert
    alert('Exporting email report... This feature is not yet implemented. Please check back later.')
  }

  const handleEmailSettings = () => {
    // Navigate to email settings
    // For now, just show an alert
    alert('Opening email settings... This feature is not yet implemented. Please check back later.')
  }

  const handleCreateTemplate = () => {
    // Navigate to create email template
    // For now, just show an alert
    alert('Creating email template... This feature is not yet implemented. Please check back later.')
  }

  const handleViewAnalytics = () => {
    // Navigate to email analytics dashboard
    // For now, just show an alert
    alert('Viewing email analytics... This feature is not yet implemented. Please check back later.')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-slate-400" />
          <p className="text-slate-600 dark:text-slate-400">Loading email management...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Modern Dashboard Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-700">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin')}
                className="text-slate-300 hover:text-white hover:bg-slate-700"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="p-3 bg-slate-700/50 rounded-xl">
                <Mail className="h-7 w-7 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Email Management</h1>
                <p className="text-slate-300 mt-1">Send bulk emails, manage campaigns, and track communications</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                Admin Access
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Horizontal Action Bar */}
        <div className="flex items-center justify-between mb-8 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search users by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
              />
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-40 border-slate-200 dark:border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="teams">Teams</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 border-slate-200 dark:border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setShowComposeDialog(true)} className="border-slate-200 dark:border-slate-700">
              <Plus className="h-4 w-4 mr-2" />
              Compose Email
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Primary KPI Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Users</p>
                  <p className="text-3xl font-bold">{users.length}</p>
                  <p className="text-blue-200 text-xs mt-1">
                    <Users className="h-3 w-3 inline mr-1" />
                    Registered users
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Emails Sent</p>
                  <p className="text-3xl font-bold">1,247</p>
                  <p className="text-green-200 text-xs mt-1">
                    <Send className="h-3 w-3 inline mr-1" />
                    This month
                  </p>
                </div>
                <Send className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Open Rate</p>
                  <p className="text-3xl font-bold">68.5%</p>
                  <p className="text-purple-200 text-xs mt-1">
                    <Target className="h-3 w-3 inline mr-1" />
                    Above average
                  </p>
                </div>
                <Target className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Active Campaigns</p>
                  <p className="text-3xl font-bold">{campaigns.length}</p>
                  <p className="text-orange-200 text-xs mt-1">
                    <Activity className="h-3 w-3 inline mr-1" />
                    Currently running
                  </p>
                </div>
                <Activity className="h-8 w-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <UserCheck className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {users.filter(u => u.emailConfirmed).length}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Verified Emails</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">94.2%</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Delivery Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Clock className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">2.4h</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Avg. Response Time</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">23</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Templates Available</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

          {/* Main Email Management Content */}
          <div className="col-span-8">
            <Tabs defaultValue="compose" className="space-y-6">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="users">Select Recipients</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Compose Email Campaign
              </CardTitle>
              <CardDescription>
                Create and send bulk emails to selected users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email-type">Email Type</Label>
                  <Select value={emailType} onValueChange={setEmailType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select email type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMAIL_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Recipients Selected</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {selectedUsers.size} users selected
                    </Badge>
                    {selectedUsers.size > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUsers(new Set())}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Enter email subject..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Email Content</Label>
                <Textarea
                  id="content"
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  placeholder="Enter email content..."
                  rows={10}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={sendBulkEmails}
                  disabled={sending || selectedUsers.size === 0}
                  className="flex-1"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending Emails...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send to {selectedUsers.size} Recipients
                    </>
                  )}
                </Button>
              </div>

              {sending && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{sendProgress}%</span>
                  </div>
                  <Progress value={sendProgress} />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Success: {sendResults.success}</span>
                    <span>Failed: {sendResults.failed}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Select Recipients
              </CardTitle>
              <CardDescription>
                Choose which users to send emails to
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search users by email or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="teams">Teams</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                    <SelectItem value="past_due">Past Due</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedUsers.size === filteredUsers.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Badge variant="secondary">
                  {selectedUsers.size} of {filteredUsers.length} selected
                </Badge>
              </div>

              <div className="border rounded-lg">
                {/* Mobile Card Layout */}
                <div className="block md:hidden divide-y">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="p-4 flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        className="rounded"
                      />
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatarUrl || undefined} />
                        <AvatarFallback>
                          {user.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{user.fullName || 'No name'}</h3>
                          {user.isAdmin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground truncate mb-2">{user.email}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs">{user.subscriptionPlan}</Badge>
                          <Badge variant="secondary" className="text-xs capitalize">{user.subscriptionStatus}</Badge>
                          <span className="text-xs text-muted-foreground">
                            Joined {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                          onChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.id)}
                            onChange={() => handleSelectUser(user.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.fullName || 'No name'}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {user.subscriptionPlan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.subscriptionStatus === 'active' ? 'default' : 'secondary'}
                            className="capitalize"
                          >
                            {user.subscriptionStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Email Templates
              </CardTitle>
              <CardDescription>
                Use pre-built templates for common email types
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Category Filter */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filter by category:</span>
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {emailCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Templates Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {emailTemplates
                  .filter(template => selectedCategory === 'all' || template.category === selectedCategory)
                  .map((template) => (
                    <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="w-fit capitalize">
                            {template.type}
                          </Badge>
                          <Badge variant="secondary" className="w-fit text-xs">
                            {emailCategories.find(cat => cat.id === template.category)?.icon} {emailCategories.find(cat => cat.id === template.category)?.name}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-1 font-medium">
                          {template.subject}
                        </p>
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                          {template.description}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => applyTemplate(template)}
                            className="flex-1"
                            variant="outline"
                            size="sm"
                          >
                            Use Template
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedTemplate(template)
                              setShowTemplatePreview(true)
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>

              {emailTemplates.filter(template => selectedCategory === 'all' || template.category === selectedCategory).length === 0 && (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No templates found in this category.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Email Campaign History
              </CardTitle>
              <CardDescription>
                View past email campaigns and their results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No email campaigns yet</p>
                <p className="text-sm">Campaign history will appear here after sending emails</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
          </div>

          {/* Email Activity Sidebar */}
          <div className="col-span-4">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm sticky top-8">
              <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                <CardTitle className="text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Email Insights
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Key metrics and campaign performance
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Insights */}
                <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900 dark:text-green-100">High Engagement</span>
                  </div>
                  <p className="text-xs text-green-800 dark:text-green-200">
                    68.5% open rate is excellent for email marketing campaigns.
                  </p>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Delivery Success</span>
                  </div>
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    94.2% delivery rate ensures your messages reach the intended recipients.
                  </p>
                </div>

                <div className="p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900 dark:text-purple-100">User Coverage</span>
                  </div>
                  <p className="text-xs text-purple-800 dark:text-purple-200">
                    {users.filter(u => u.emailConfirmed).length} of {users.length} users have verified emails for communication.
                  </p>
                </div>

                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-900 dark:text-yellow-100">Response Time</span>
                  </div>
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    Average 2.4 hour response time for support communications.
                  </p>
                </div>

                {/* Quick Actions */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-6">
                  <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Quick Actions</h4>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={handleExportEmailReport}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Email Report
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={handleEmailSettings}>
                      <Settings className="h-4 w-4 mr-2" />
                      Email Settings
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={handleCreateTemplate}>
                      <FileText className="h-4 w-4 mr-2" />
                      Create Template
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={handleViewAnalytics}>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Analytics
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Compose Email Dialog */}
        <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compose Email Campaign</DialogTitle>
            <DialogDescription>
              Create a new email campaign to send to selected users
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email Type</Label>
                <Select value={emailType} onValueChange={setEmailType}>
                  <SelectTrigger>
                    <SelectValue />
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
              <div className="space-y-2">
                <Label>Recipients</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {selectedUsers.size} users selected
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {/* Navigate to users tab */}}
                  >
                    Manage Recipients
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Enter email subject..."
              />
            </div>

            <div className="space-y-2">
              <Label>Email Content</Label>
              <Textarea
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                placeholder="Enter email content..."
                rows={12}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowComposeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={sendBulkEmails} disabled={sending || selectedUsers.size === 0}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Campaign
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog open={showTemplatePreview} onOpenChange={setShowTemplatePreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Template Preview: {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              Preview how this email template will appear to recipients
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-6">
              {/* Template Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Category</Label>
                  <p className="text-sm text-muted-foreground">
                    {emailCategories.find(cat => cat.id === selectedTemplate.category)?.icon}{' '}
                    {emailCategories.find(cat => cat.id === selectedTemplate.category)?.name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <p className="text-sm text-muted-foreground capitalize">{selectedTemplate.type}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium">Variables</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedTemplate.variables.map((variable) => (
                      <Badge key={variable} variant="outline" className="text-xs">
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Email Preview */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-800 p-4 border-b">
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">FROM</Label>
                      <p className="text-sm">PiPilot &lt;hello@pipilot.dev&gt;</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">SUBJECT</Label>
                      <p className="text-sm font-medium">{selectedTemplate.subject}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-white dark:bg-slate-900">
                  <div className="max-w-2xl mx-auto">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {selectedTemplate.content.split('\n').map((line, index) => (
                        <p key={index} className={line.trim() === '' ? 'mb-4' : ''}>
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowTemplatePreview(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  applyTemplate(selectedTemplate)
                  setShowTemplatePreview(false)
                  setShowComposeDialog(true)
                }}>
                  Use This Template
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Email Assistant */}
      <EmailAIAssistant onGenerate={handleAIGenerate} />
    </div>
  )
}