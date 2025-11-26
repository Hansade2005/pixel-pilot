"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sparkles,
  Wand2,
  RefreshCw,
  X,
  Loader2,
  Lightbulb,
  Target,
  MessageSquare
} from 'lucide-react'
import { generateEmailContent, improveEmailContent, type EmailGenerationOptions } from '@/lib/ai-email-generator'
import { useToast } from '@/hooks/use-toast'

interface FloatingAIEmailGeneratorProps {
  isVisible: boolean
  onClose: () => void
  onApplyContent: (subject: string, content: string) => void
  currentSubject?: string
  currentContent?: string
  emailType?: string
}

export default function FloatingAIEmailGenerator({
  isVisible,
  onClose,
  onApplyContent,
  currentSubject = '',
  currentContent = '',
  emailType = 'notification'
}: FloatingAIEmailGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isImproving, setIsImproving] = useState(false)
  const [generationOptions, setGenerationOptions] = useState<EmailGenerationOptions>({
    type: emailType as any,
    subject: currentSubject,
    context: '',
    tone: 'professional',
    length: 'medium',
    recipientType: 'individual'
  })
  const [improvementType, setImprovementType] = useState<'grammar' | 'tone' | 'length' | 'clarity' | 'engagement'>('clarity')
  const { toast } = useToast()

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const result = await generateEmailContent({
        ...generationOptions,
        subject: generationOptions.subject || undefined
      })

      onApplyContent(result.subject, result.content)

      toast({
        title: "Email generated successfully!",
        description: "AI-generated content has been applied to your email.",
      })

      onClose()
    } catch (error) {
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate email content",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleImprove = async () => {
    if (!currentContent.trim()) {
      toast({
        title: "No content to improve",
        description: "Please add some content to your email first.",
        variant: "destructive"
      })
      return
    }

    setIsImproving(true)
    try {
      const improvedContent = await improveEmailContent(currentContent, improvementType)

      // Apply only the content, keep existing subject
      onApplyContent(currentSubject, improvedContent)

      toast({
        title: "Content improved!",
        description: `Email content has been improved for better ${improvementType}.`,
      })
    } catch (error) {
      toast({
        title: "Improvement failed",
        description: error instanceof Error ? error.message : "Failed to improve email content",
        variant: "destructive"
      })
    } finally {
      setIsImproving(false)
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className="w-96 shadow-2xl border-2 border-primary/20 bg-card/95 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Email Assistant
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Generation Options */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Email Type</Label>
                <Select
                  value={generationOptions.type}
                  onValueChange={(value) => setGenerationOptions(prev => ({ ...prev, type: value as any }))}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="notification">Notification</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="welcome">Welcome</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Tone</Label>
                <Select
                  value={generationOptions.tone}
                  onValueChange={(value) => setGenerationOptions(prev => ({ ...prev, tone: value as any }))}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Length</Label>
                <Select
                  value={generationOptions.length}
                  onValueChange={(value) => setGenerationOptions(prev => ({ ...prev, length: value as any }))}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="long">Long</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Audience</Label>
                <Select
                  value={generationOptions.recipientType}
                  onValueChange={(value) => setGenerationOptions(prev => ({ ...prev, recipientType: value as any }))}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                    <SelectItem value="all">All Users</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Subject (optional)</Label>
              <input
                type="text"
                placeholder="Enter subject or leave blank for AI generation"
                value={generationOptions.subject}
                onChange={(e) => setGenerationOptions(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full h-8 px-2 text-sm border rounded-md bg-background"
              />
            </div>

            <div>
              <Label className="text-xs">Context (optional)</Label>
              <Textarea
                placeholder="Add any specific context or requirements..."
                value={generationOptions.context}
                onChange={(e) => setGenerationOptions(prev => ({ ...prev, context: e.target.value }))}
                rows={2}
                className="text-sm resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Email
                </>
              )}
            </Button>

            {currentContent.trim() && (
              <>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      value={improvementType}
                      onValueChange={(value) => setImprovementType(value as any)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clarity">Clarity</SelectItem>
                        <SelectItem value="grammar">Grammar</SelectItem>
                        <SelectItem value="tone">Tone</SelectItem>
                        <SelectItem value="length">Length</SelectItem>
                        <SelectItem value="engagement">Engagement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleImprove}
                    disabled={isImproving}
                    variant="outline"
                    size="sm"
                    className="h-8 px-3"
                  >
                    {isImproving ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Lightbulb className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Tips */}
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <div className="flex items-center gap-1 mb-1">
              <Target className="h-3 w-3" />
              <span className="font-medium">Tips:</span>
            </div>
            <ul className="space-y-1 text-xs">
              <li>• Add context for more personalized emails</li>
              <li>• Use "Improve" to enhance existing content</li>
              <li>• Different tones work better for different audiences</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}