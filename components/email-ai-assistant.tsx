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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Sparkles, Loader2, Mail, X, Minimize2, Maximize2, FileText, Wand2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Email template types
interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  content: string;
  variables: string[];
  category: string;
  description: string;
}

interface EmailCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface EmailAIAssistantProps {
  onGenerate: (subject: string, content: string, template?: EmailTemplate) => void
}

export function EmailAIAssistant({ onGenerate }: EmailAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [prompt, setPrompt] = useState("")
  const [generating, setGenerating] = useState(false)
  const [generatedSubject, setGeneratedSubject] = useState("")
  const [generatedContent, setGeneratedContent] = useState("")
  const [showResult, setShowResult] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [categories, setCategories] = useState<EmailCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      loadTemplates()
    }
  }, [isOpen])

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/email/templates');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to load templates');
      }
      setTemplates(data.data.templates || []);
      setCategories(data.data.categories || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Error",
        description: "Failed to load email templates",
        variant: "destructive"
      });
      // Set empty arrays as fallback
      setTemplates([]);
      setCategories([]);
    }
  }

  const filteredTemplates = templates.filter(template =>
    selectedCategory === "all" || template.category === selectedCategory
  )

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      toast({
        title: "Template required",
        description: "Please select an email template to customize",
        variant: "destructive"
      })
      return
    }

    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please describe how you want to customize the email",
        variant: "destructive"
      })
      return
    }

    setGenerating(true)
    setShowResult(false)

    try {
      const response = await fetch('/api/ai/generate-email-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          prompt: prompt.trim()
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

      // Set the generated content
      setGeneratedSubject(content.subject || 'Generated Email Subject')
      setGeneratedContent(content.html || content.content || 'Generated email content')

      setShowResult(true)
      toast({
        title: "Email generated!",
        description: "Review and use the customized email content",
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
    onGenerate(generatedSubject, generatedContent, selectedTemplate || undefined)
    setIsOpen(false)
    setShowResult(false)
    resetForm()
  }

  const resetForm = () => {
    setSelectedTemplate(null)
    setPrompt("")
    setGeneratedSubject("")
    setGeneratedContent("")
    setSelectedCategory("all")
    setPreviewMode(false)
  }

  const handleClose = () => {
    setIsOpen(false)
    setShowResult(false)
    resetForm()
  }

  return (
    <>
      {/* Floating Chat Bubble */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 z-50"
        size="icon"
      >
        <Wand2 className="h-6 w-6 text-white" />
      </Button>

      {/* Main Dialog */}
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className={`max-w-4xl ${isMinimized ? 'max-h-20' : 'max-h-[80vh]'} overflow-hidden`}>
          <DialogHeader className="flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-purple-600" />
                AI Email Assistant
              </DialogTitle>
              <DialogDescription>
                Generate customized email content using AI and templates
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {!isMinimized && (
            <div className="space-y-6 overflow-y-auto max-h-[60vh]">
              {!showResult ? (
                <>
                  {/* Template Selection */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Select Email Template
                      </CardTitle>
                      <CardDescription>
                        Choose a template to customize with AI
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Category Filter */}
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                          <SelectTrigger>
                            <SelectValue placeholder="All categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.icon} {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Template Selection */}
                      <div className="space-y-2">
                        <Label>Template</Label>
                        <Select
                          value={selectedTemplate?.id || ""}
                          onValueChange={(value) => {
                            const template = templates.find(t => t.id === value)
                            setSelectedTemplate(template || null)
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a template..." />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredTemplates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{template.name}</span>
                                  <span className="text-xs text-muted-foreground">{template.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedTemplate && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{selectedTemplate.type}</Badge>
                            <Badge variant="secondary">
                              {categories.find(c => c.id === selectedTemplate.category)?.icon}{' '}
                              {categories.find(c => c.id === selectedTemplate.category)?.name}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <strong>Subject:</strong> {selectedTemplate.subject}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            <strong>Variables:</strong> {selectedTemplate.variables.join(', ')}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Customization Prompt */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Customization Instructions
                      </CardTitle>
                      <CardDescription>
                        Describe how you want to customize the selected template
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., Make this welcome email more personalized for enterprise customers, add specific feature highlights, or customize the tone for a specific audience..."
                        rows={4}
                        className="resize-none"
                      />
                    </CardContent>
                  </Card>

                  {/* Generate Button */}
                  <div className="flex justify-end">
                    <Button
                      onClick={handleGenerate}
                      disabled={generating || !selectedTemplate || !prompt.trim()}
                      className="min-w-32"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Email
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                /* Results View */
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Generated Email Content
                    </CardTitle>
                    <CardDescription>
                      Review and customize the AI-generated content
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Subject */}
                    <div className="space-y-2">
                      <Label>Subject Line</Label>
                      <Textarea
                        value={generatedSubject}
                        onChange={(e) => setGeneratedSubject(e.target.value)}
                        rows={2}
                        className="resize-none"
                      />
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Email Content</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewMode(!previewMode)}
                        >
                          {previewMode ? 'Edit HTML' : 'Preview Email'}
                        </Button>
                      </div>
                      {previewMode ? (
                        <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                          <div dangerouslySetInnerHTML={{ __html: generatedContent }} />
                        </div>
                      ) : (
                        <Textarea
                          value={generatedContent}
                          onChange={(e) => setGeneratedContent(e.target.value)}
                          rows={12}
                          className="font-mono text-sm"
                        />
                      )}
                    </div>

                    {/* Template Info */}
                    {selectedTemplate && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="text-sm">
                          <strong>Based on template:</strong> {selectedTemplate.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Type:</strong> {selectedTemplate.type} • <strong>Category:</strong> {categories.find(c => c.id === selectedTemplate.category)?.name}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {showResult && !isMinimized && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResult(false)}>
                Back to Edit
              </Button>
              <Button onClick={handleUse} className="min-w-24">
                Use This Email
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
