"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Loader2, Mail, X, Minimize2, Maximize2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface EmailAIAssistantProps {
  onGenerate: (subject: string, content: string) => void
}

export function EmailAIAssistant({ onGenerate }: EmailAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [generating, setGenerating] = useState(false)
  const [generatedSubject, setGeneratedSubject] = useState("")
  const [generatedContent, setGeneratedContent] = useState("")
  const [showResult, setShowResult] = useState(false)
  const { toast } = useToast()

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please describe what email you want to generate",
        variant: "destructive"
      })
      return
    }

    setGenerating(true)
    setShowResult(false)

    try {
      const response = await fetch('/api/ai/generate-notification-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `Generate an email with the following requirements:\n\n${prompt}\n\nPlease provide a professional email subject line and content.`
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.success || !data.content) {
        throw new Error('Invalid response format from API')
      }

      const content = data.content

      // Use the generated title as subject and message as content
      setGeneratedSubject(content.title || 'Generated Email Subject')
      setGeneratedContent(content.message || 'Generated email content')

      setShowResult(true)
      toast({
        title: "Email generated!",
        description: "Review and use the generated content",
      })

    } catch (error) {
      console.error('Error generating email:', error)
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate email content",
        variant: "destructive"
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleUse = () => {
    onGenerate(generatedSubject, generatedContent)
    setIsOpen(false)
    setShowResult(false)
    setPrompt("")
    setGeneratedSubject("")
    setGeneratedContent("")
    toast({
      title: "Email populated!",
      description: "The generated content has been added to your email form",
    })
  }

  const handleClose = () => {
    setIsOpen(false)
    setIsMinimized(false)
    setShowResult(false)
  }

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all duration-300 group"
        >
          <Sparkles className="h-6 w-6 group-hover:scale-110 transition-transform" />
        </Button>
      </div>

      {/* AI Assistant Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle>AI Email Assistant</DialogTitle>
                  <DialogDescription>
                    Describe the email you want to create
                  </DialogDescription>
                </div>
              </div>
              <Badge variant="outline" className="gap-1">
                <Mail className="h-3 w-3" />
                AI Assistant
              </Badge>
            </div>
          </DialogHeader>

          {!showResult ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Email Description</Label>
                <Textarea
                  id="prompt"
                  placeholder="Example: Create a welcome email for new users introducing our AI coding platform with key features and getting started steps"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Be specific about the purpose, tone, and key points to include
                </p>
              </div>

              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Uses the same AI models as the notification assistant for consistent content generation
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>Subject Line</Label>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="font-medium">{generatedSubject}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email Content</Label>
                <div className="p-4 bg-muted/50 rounded-lg whitespace-pre-wrap text-sm">
                  {generatedContent}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {!showResult ? (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleGenerate} disabled={generating || !prompt.trim()}>
                  {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {generating ? 'Generating...' : 'Generate Email'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowResult(false)
                    setGeneratedSubject("")
                    setGeneratedContent("")
                  }}
                >
                  Regenerate
                </Button>
                <Button onClick={handleUse}>
                  Use This Email
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
