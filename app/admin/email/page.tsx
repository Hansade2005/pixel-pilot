"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { checkAdminAccess } from "@/lib/admin-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Mail,
  Send,
  X,
  ArrowLeft,
  Star,
  CheckCircle,
  Loader2,
  User,
  Sparkles,
} from "lucide-react"
import {
  sendEmail,
  sendMarketingEmail,
  sendTransactionalEmail
} from "@/lib/email-client"
import {
  loadEmailTemplates,
  type EmailTemplate
} from "@/lib/email-templates"
import FloatingAIEmailGenerator from "@/components/FloatingAIEmailGenerator"

interface UserData {
  id: string
  email: string
  fullName: string | null
  emailConfirmed: boolean
}

const EMAIL_TYPES = [
  { value: 'notification', label: 'Notification' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'welcome', label: 'Welcome' },
  { value: 'support', label: 'Support' }
]

export default function AdminEmailPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserData[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])
  const [showCompose, setShowCompose] = useState(false)
  const [sending, setSending] = useState(false)
  const [showAIGenerator, setShowAIGenerator] = useState(false)

  // Compose form states
  const [recipients, setRecipients] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [emailType, setEmailType] = useState('notification')
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)

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
        loadTemplates()
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
      const response = await fetch('/api/admin/users')
      if (!response.ok) throw new Error('Failed to fetch users')
      
      const data = await response.json()
      const usersData = data.users || []
      
      const formattedUsers: UserData[] = usersData.map((user: any) => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName || user.full_name || null,
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

  const loadTemplates = async () => {
    try {
      const templatesData = await loadEmailTemplates()
      setEmailTemplates(templatesData.templates)
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  const filteredUsers = users.filter(user =>
    !searchQuery ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.fullName && user.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const addRecipient = (userEmail: string) => {
    if (!recipients.includes(userEmail)) {
      setRecipients([...recipients, userEmail])
    }
  }

  const removeRecipient = (userEmail: string) => {
    setRecipients(recipients.filter(email => email !== userEmail))
  }

  const clearCompose = () => {
    setRecipients([])
    setSubject('')
    setContent('')
    setEmailType('notification')
    setSelectedTemplate(null)
    setShowAIGenerator(false)
  }

  const handleAIContentApply = (aiSubject: string, aiContent: string) => {
    if (aiSubject && !subject) {
      setSubject(aiSubject)
    }
    setContent(aiContent)
  }

  const applyTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setEmailType(template.type)
    setSubject(template.subject)
    setContent(template.content.replace(/\n/g, '<br>'))
  }

  const sendEmails = async () => {
    if (recipients.length === 0) {
      toast({
        title: "No recipients",
        description: "Please add recipients",
        variant: "destructive"
      })
      return
    }

    if (!subject.trim() || !content.trim()) {
      toast({
        title: "Missing content",
        description: "Please provide subject and content",
        variant: "destructive"
      })
      return
    }

    setSending(true)
    let successCount = 0
    let failedCount = 0

    try {
      for (const email of recipients) {
        try {
          let result
          
          switch (emailType) {
            case 'marketing':
              result = await sendMarketingEmail({
                to: email,
                subject,
                html: content,
                text: content.replace(/<[^>]*>/g, ''),
                unsubscribeUrl: 'https://pipilot.dev/unsubscribe'
              })
              break
            case 'welcome':
              result = await sendTransactionalEmail({
                to: email,
                subject: `Welcome to PiPilot, ${email.split('@')[0]}!`,
                html: `
                  <h1>Welcome to PiPilot!</h1>
                  <p>Hi ${email.split('@')[0]},</p>
                  <p>Thank you for joining PiPilot!</p>
                  <p>Best regards,<br>The PiPilot Team</p>
                `,
                text: `Welcome to PiPilot!\n\nHi ${email.split('@')[0]},\n\nThank you for joining PiPilot!\n\nBest regards,\nThe PiPilot Team`
              })
              break
            default:
              result = await sendTransactionalEmail({
                to: email,
                subject,
                html: content,
                text: content.replace(/<[^>]*>/g, '')
              })
          }

          if (result.success) {
            successCount++
          } else {
            failedCount++
          }
        } catch (error) {
          failedCount++
        }
      }

      toast({
        title: "Emails sent",
        description: `${successCount} sent${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
        variant: failedCount > 0 ? "destructive" : "default"
      })

      setShowCompose(false)
      clearCompose()

    } catch (error) {
      console.error('Error sending emails:', error)
      toast({
        title: "Failed to send emails",
        description: "An error occurred",
        variant: "destructive"
      })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin')}
            className="text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Email Management</h1>
              <p className="text-muted-foreground">{users.length} users registered</p>
            </div>
          </div>
          <Button
            onClick={() => setShowCompose(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Mail className="h-4 w-4 mr-2" />
            Compose
          </Button>
        </div>
      </div>

      {/* User List */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Users</span>
            <span className="text-sm font-normal text-muted-foreground">
              {filteredUsers.length} of {users.length}
            </span>
          </CardTitle>
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredUsers.map(user => (
              <div
                key={user.id}
                className="p-4 rounded-lg border bg-card hover:border-border transition-colors cursor-pointer"
                onClick={() => addRecipient(user.email)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{user.fullName || 'No Name'}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.emailConfirmed ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gmail-style Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
          <Card className="w-full max-w-2xl mx-4 shadow-2xl bg-card">
            <CardHeader className="bg-muted border-b px-4 py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">New Message</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCompose(false)
                    clearCompose()
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 space-y-4">
                {/* Recipients */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-16">To:</span>
                  <div className="flex-1 flex flex-wrap gap-2">
                    {recipients.map(email => (
                      <div
                        key={email}
                        className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs flex items-center gap-1"
                      >
                        {email}
                        <button
                          onClick={() => removeRecipient(email)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <input
                      placeholder="Add recipients..."
                      className="flex-1 min-w-32 text-sm border-none outline-none bg-transparent text-foreground"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const email = (e.target as HTMLInputElement).value.trim()
                          if (email && !recipients.includes(email)) {
                            addRecipient(email)
                            ;(e.target as HTMLInputElement).value = ''
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Subject */}
                <div className="flex items-center gap-2 text-sm border-b pb-2 border-border">
                  <span className="text-muted-foreground w-16">Subject:</span>
                  <input
                    className="flex-1 text-sm border-none outline-none text-foreground"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter subject..."
                  />
                </div>

                {/* Templates */}
                {emailTemplates.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground w-16">Template:</span>
                    <Select 
                      value={selectedTemplate?.id || ''} 
                      onValueChange={(value) => {
                        const template = emailTemplates.find(t => t.id === value)
                        if (template) applyTemplate(template)
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Choose template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {emailTemplates.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="px-4 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Content</span>
                  <Button
                    onClick={() => setShowAIGenerator(!showAIGenerator)}
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    {showAIGenerator ? 'Hide' : 'AI'} Assistant
                  </Button>
                </div>
                <Textarea
                  placeholder="Compose your message..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={12}
                  className="resize-none border-0 shadow-none focus-visible:ring-0"
                />
              </div>

              {/* Actions */}
              <div className="bg-muted px-4 py-3 flex items-center justify-between border-t">
                <div className="flex items-center gap-2">
                  <Select value={emailType} onValueChange={setEmailType}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMAIL_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {recipients.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {recipients.length} recipient(s)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      setShowCompose(false)
                      clearCompose()
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Discard
                  </Button>
                  <Button
                    onClick={sendEmails}
                    disabled={sending || recipients.length === 0}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating AI Email Generator */}
      <FloatingAIEmailGenerator
        isVisible={showCompose && showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        onApplyContent={handleAIContentApply}
        currentSubject={subject}
        currentContent={content}
        emailType={emailType}
      />
    </div>
  )
}