"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { 
  Send, 
  Loader2, 
  Sparkles, 
  RefreshCw,
  Wand2,
  Code,
  Eye
} from "lucide-react"
import { Lead } from "@/lib/leads-parser"

interface EmailComposeModalProps {
  open: boolean
  onClose: () => void
  lead: Lead
}

export function EmailComposeModal({ open, onClose, lead }: EmailComposeModalProps) {
  const { toast } = useToast()
  const [subject, setSubject] = useState("")
  const [content, setContent] = useState("")
  const [html, setHtml] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState<"preview" | "html">("preview")

  // Generate AI email
  const generateEmail = async (improveType?: 'grammar' | 'tone' | 'length' | 'clarity' | 'engagement') => {
    setLoading(true)
    try {
      const response = await fetch('/api/leads/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadName: lead.name,
          leadEmail: lead.email,
          segment: lead.segment,
          company: lead.company,
          context: lead.context,
          source: lead.source,
          improveType,
          currentContent: improveType ? content : undefined,
          regenerate: !improveType && content.length > 0
        })
      })

      const data = await response.json()

      if (data.success) {
        setSubject(data.subject)
        setContent(data.content)
        setHtml(data.html)
        toast({
          title: improveType ? "Email improved!" : "Email generated!",
          description: `Personalized ${lead.segment} email ready to send`,
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate email",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Send email
  const sendEmail = async () => {
    if (!subject || !content) {
      toast({
        title: "Missing information",
        description: "Please generate an email first",
        variant: "destructive"
      })
      return
    }

    setSending(true)
    try {
      // Track in database
      const trackResponse = await fetch('/api/leads/track-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadEmail: lead.email,
          leadName: lead.name,
          segment: lead.segment,
          company: lead.company,
          context: lead.context,
          source: lead.source,
          subject,
          content,
          html
        })
      })

      if (!trackResponse.ok) {
        throw new Error('Failed to track email')
      }

      // Send email
      const sendResponse = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: lead.email,
          subject,
          html,
          text: content,
          from: 'hello@pipilot.dev',
          replyTo: 'hello@pipilot.dev'
        })
      })

      const sendData = await sendResponse.json()

      if (sendData.success) {
        toast({
          title: "Email sent! ✅",
          description: `Message sent to ${lead.name}`,
        })
        onClose()
      } else {
        throw new Error(sendData.error)
      }
    } catch (error: any) {
      toast({
        title: "Send failed",
        description: error.message || "Failed to send email",
        variant: "destructive"
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Compose Email to {lead.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {lead.email} • {lead.segment.charAt(0).toUpperCase() + lead.segment.slice(1)}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Subject Line */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
              className="font-medium"
            />
          </div>

          {/* AI Generation Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => generateEmail()}
              disabled={loading}
              size="sm"
              variant={content ? "outline" : "default"}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {content ? "Regenerate" : "Generate Email"}
            </Button>

            {content && (
              <>
                <Button
                  onClick={() => generateEmail('tone')}
                  disabled={loading}
                  size="sm"
                  variant="outline"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Improve Tone
                </Button>
                <Button
                  onClick={() => generateEmail('clarity')}
                  disabled={loading}
                  size="sm"
                  variant="outline"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Make Clearer
                </Button>
                <Button
                  onClick={() => generateEmail('engagement')}
                  disabled={loading}
                  size="sm"
                  variant="outline"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  More Engaging
                </Button>
              </>
            )}
          </div>

          {/* Content Tabs: Preview & HTML */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="html" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                HTML Code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="mt-4 space-y-4">
              {/* Plain Text Editor */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Message (Plain Text)</label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Email message content..."
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>

              {/* HTML Preview */}
              {html && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Preview</label>
                  <div className="border rounded-lg p-4 bg-white max-h-[400px] overflow-auto">
                    <div dangerouslySetInnerHTML={{ __html: html }} />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="html" className="mt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">HTML Source Code</label>
                  <p className="text-xs text-muted-foreground">
                    Edit to customize the email design
                  </p>
                </div>
                <Textarea
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  placeholder="HTML email code will appear here..."
                  className="min-h-[400px] font-mono text-xs"
                  spellCheck={false}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {loading && "Generating with AI..."}
            {!loading && content && `${content.length} characters`}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={onClose}
              variant="outline"
              disabled={loading || sending}
            >
              Cancel
            </Button>
            <Button
              onClick={sendEmail}
              disabled={loading || sending || !subject || !content}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
