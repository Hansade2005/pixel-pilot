'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Plus, Sparkles, Zap } from 'lucide-react'
import { dbManager } from '@/lib/indexeddb'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ProjectCreatorProps {
  onProjectCreated?: (project: any) => void
  onCancel?: () => void
}

export default function ProjectCreator({ onProjectCreated, onCancel }: ProjectCreatorProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<'vite-react' | 'nextjs'>('vite-react')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: false
  })
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Project name is required",
        variant: "destructive"
      })
      return
    }

    setIsCreating(true)

    try {
      // Client-side project creation
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const workspace = await storageManager.createWorkspace({
        name: formData.name,
        description: formData.description,
        userId: 'currentUserId', // Replace with actual user ID
        isPublic: formData.isPublic,
        isTemplate: false,
        lastActivity: new Date().toISOString(),
        deploymentStatus: 'not_deployed',
        slug
      })
      // Apply template files based on selection
      const { TemplateService } = await import('@/lib/template-service')
      if (selectedTemplate === 'nextjs') {
        await TemplateService.applyNextJSTemplate(workspace.id)
      } else {
        await TemplateService.applyViteReactTemplate(workspace.id)
      }
      toast({
        title: "Success!",
        description: "Project created and persisted successfully.",
      })
      // Reset form
      setFormData({
        name: '',
        description: '',
        isPublic: false
      })
      // Call callback
      if (onProjectCreated) {
        onProjectCreated(workspace)
      }

    } catch (error) {
      console.error('Error creating project:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create project",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create New Project
        </CardTitle>
        <CardDescription>
          Create a new project with your chosen framework template
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My Awesome Project"
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="A brief description of your project..."
              rows={3}
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template">Template</Label>
            <Select value={selectedTemplate} onValueChange={(value: 'vite-react' | 'nextjs') => setSelectedTemplate(value)} disabled={isCreating}>
              <SelectTrigger id="template">
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vite-react">Vite</SelectItem>
                <SelectItem value="nextjs">Next.js</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPublic"
              checked={formData.isPublic}
              onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked as boolean })}
              disabled={isCreating}
            />
            <Label htmlFor="isPublic" className="text-sm">
              Make this project public
            </Label>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
              <Sparkles className="h-4 w-4" />
              <span className="font-medium">What's Included:</span>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {selectedTemplate === 'nextjs' 
                ? 'Next.js + TypeScript + Tailwind CSS with AI development guidelines'
                : 'Vite React + TypeScript + Tailwind CSS with AI development guidelines'
              }
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={isCreating || !formData.name.trim()}
              className="flex-1"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </>
              )}
            </Button>
            
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isCreating}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
