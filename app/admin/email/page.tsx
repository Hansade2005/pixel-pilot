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
  Loader2
} from "lucide-react"
import {
  sendEmail,
  sendNotificationEmail,
  sendTeamInvitation,
  sendWelcomeEmail,
  sendTeamMemberJoinedNotification
} from "@/lib/email"

interface UserData {
  id: string
  email: string
  fullName: string | null
  subscriptionPlan: string
  subscriptionStatus: string
  createdAt: string
  emailConfirmed: boolean
}

interface EmailTemplate {
  id: string
  name: string
  type: string
  subject: string
  content: string
  variables: string[]
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

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome-new-users',
    name: 'Welcome New Users',
    type: 'welcome',
    subject: 'Welcome to Pixel Pilot! 🎉',
    content: `Hi {{name}},

Welcome to Pixel Pilot! We're excited to have you join our community of developers and creators.

Here's what you can do to get started:
• Explore our AI-powered coding features
• Create your first project
• Join our community forums
• Check out our documentation

If you have any questions, feel free to reach out to our support team.

Happy coding!
The Pixel Pilot Team`,
    variables: ['name']
  },
  {
    id: 'feature-update',
    name: 'New Feature Announcement',
    type: 'feature',
    subject: '🚀 New Feature: {{feature_name}} is now available!',
    content: `Hi {{name}},

We're thrilled to announce that {{feature_name}} is now available in Pixel Pilot!

{{content}}

Try it out today and let us know what you think!

Best regards,
The Pixel Pilot Team`,
    variables: ['name', 'feature_name', 'content', 'try_url']
  },
  {
    id: 'security-alert',
    name: 'Security Alert',
    type: 'security',
    subject: '🔒 Security Alert: {{title}}',
    content: `Hi {{name}},

{{content}}

For your account security, we recommend:
• Change your password immediately
• Review your recent account activity
• Enable two-factor authentication if not already enabled

If you didn't initiate this activity, please contact our support team immediately.

Stay safe,
The Pixel Pilot Team`,
    variables: ['name', 'title', 'content', 'action_url']
  },
  {
    id: 'newsletter-monthly',
    name: 'Monthly Newsletter',
    type: 'newsletter',
    subject: '📧 {{title}}',
    content: `Hi {{name}},

{{content}}

What's New This Month:
• Feature updates and improvements
• Community highlights
• Tips and best practices

{{unsubscribe_content}}

Best regards,
The Pixel Pilot Team`,
    variables: ['name', 'title', 'content', 'unsubscribe_content', 'unsubscribe_url']
  }
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
  const [searchQuery, setSearchQuery] = useState('')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

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
      const supabase = createClient()

      // Get all users with their profile and settings data
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          created_at,
          email_confirmed_at,
          user_settings!inner (
            subscription_plan,
            subscription_status
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedUsers: UserData[] = (data || []).map((user: any) => ({
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        subscriptionPlan: user.user_settings?.[0]?.subscription_plan || 'free',
        subscriptionStatus: user.user_settings?.[0]?.subscription_status || 'inactive',
        createdAt: user.created_at,
        emailConfirmed: !!user.email_confirmed_at
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
    // For now, we'll use local state. In production, this would be stored in database
    setCampaigns([])
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Management</h1>
          <p className="text-muted-foreground">Send bulk emails and manage communications</p>
        </div>
        <Button onClick={() => setShowComposeDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Compose Email
        </Button>
      </div>

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {EMAIL_TEMPLATES.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge variant="outline" className="w-fit capitalize">
                        {template.type}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {template.subject}
                      </p>
                      <Button
                        onClick={() => applyTemplate(template)}
                        className="w-full"
                        variant="outline"
                      >
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
    </div>
  )
}