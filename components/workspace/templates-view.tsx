"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Info, Eye, Sparkles } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { storageManager } from '@/lib/storage-manager'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface PublicTemplate {
  id: string
  name: string
  description: string | null
  thumbnail_url: string | null
  author_name: string | null
  usage_count: number
  files: any
  created_at: string
  preview_url?: string | null
}

interface TemplatesViewProps {
  userId: string
}

export function TemplatesView({ userId }: TemplatesViewProps) {
  const [templates, setTemplates] = useState<PublicTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<PublicTemplate | null>(null)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [isUsingTemplate, setIsUsingTemplate] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('public_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewInfo = (template: PublicTemplate) => {
    setSelectedTemplate(template)
    setIsInfoModalOpen(true)
  }

  const handleUseTemplate = async (template: PublicTemplate) => {
    if (!userId) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to use templates',
        variant: 'destructive'
      })
      return
    }

    setIsUsingTemplate(true)

    try {
      const supabase = createClient()

      // Increment usage count
      await supabase.rpc('increment_template_usage', { template_id: template.id })

      // Create new project from template
      await storageManager.init()
      
      const slug = template.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      
      const workspace = await storageManager.createWorkspace({
        name: template.name,
        description: template.description || undefined,
        userId: userId,
        isPublic: false,
        isTemplate: false,
        lastActivity: new Date().toISOString(),
        deploymentStatus: 'not_deployed',
        slug
      })

      // Copy files from template to new project
      if (workspace && template.files) {
        const files = Array.isArray(template.files) ? template.files : []
        
        for (const file of files) {
          await storageManager.createFile({
            workspaceId: workspace.id,
            name: file.name,
            content: file.content,
            path: file.path || '/',
            type: file.type || 'file',
            fileType: file.fileType || 'text',
            size: file.content?.length || 0,
            isDirectory: false
          })
        }
      }

      toast({
        title: 'Success',
        description: `Project created from template: ${template.name}`,
      })

      // Close modal and redirect
      setIsInfoModalOpen(false)
      
      // Navigate to the new project
      const params = new URLSearchParams()
      params.set('projectId', workspace.id)
      params.set('newProject', workspace.id)
      router.push(`/workspace?${params.toString()}`)

    } catch (error) {
      console.error('Error using template:', error)
      toast({
        title: 'Error',
        description: 'Failed to create project from template',
        variant: 'destructive'
      })
    } finally {
      setIsUsingTemplate(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-900">
      {/* Header Section */}
      <div className="relative bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
            <Sparkles className="h-8 w-8" />
            Community Templates
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Start your next project with professionally crafted templates from our community
          </p>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {templates.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Templates Yet</h3>
            <p className="text-white/60">Be the first to publish a template!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card key={template.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300 overflow-hidden group">
                <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-blue-900/50 via-purple-900/50 to-pink-900/50">
                  {template.thumbnail_url ? (
                    <Image
                      src={template.thumbnail_url}
                      alt={template.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/40 text-6xl">
                      📄
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="absolute top-3 right-3">
                    <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-gray-900 border-white/30 font-medium shadow-lg">
                      {template.usage_count || 0} uses
                    </Badge>
                  </div>
                </div>
                
                <CardContent className="p-5 bg-gradient-to-b from-white/5 to-transparent">
                  <h3 className="text-white font-bold text-lg mb-2 line-clamp-1">
                    {template.name}
                  </h3>
                  <p className="text-white/60 text-sm line-clamp-2 mb-3">
                    {template.description || 'No description provided'}
                  </p>
                  <div className="text-xs text-white/50 mb-4">
                    by {template.author_name || 'Anonymous'}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleUseTemplate(template)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      size="sm"
                    >
                      Use Template
                    </Button>
                    <Button
                      asChild
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      size="sm"
                      disabled={!template.preview_url}
                    >
                      {template.preview_url ? (
                        <a href={template.preview_url} target="_blank" rel="noopener noreferrer">View Preview</a>
                      ) : (
                        'View Preview'
                      )}
                    </Button>
                    <Button
                      onClick={() => handleViewInfo(template)}
                      variant="outline"
                      size="sm"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Template Info Modal */}
      <Dialog open={isInfoModalOpen} onOpenChange={setIsInfoModalOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl max-h-[600px] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-2xl">{selectedTemplate?.name}</DialogTitle>
            <DialogDescription className="text-gray-400">
              Template Details
            </DialogDescription>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              {selectedTemplate.thumbnail_url && (
                <div className="relative aspect-video rounded-lg overflow-hidden">
                  <Image
                    src={selectedTemplate.thumbnail_url}
                    alt={selectedTemplate.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-1">Description</h4>
                  <p className="text-white">{selectedTemplate.description || 'No description provided'}</p>
                </div>
                {selectedTemplate.preview_url && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-400 mb-1">Preview URL</h4>
                    <a
                      href={selectedTemplate.preview_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 underline break-all"
                    >
                      {selectedTemplate.preview_url}
                    </a>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-400 mb-1">Created By</h4>
                    <p className="text-white">{selectedTemplate.author_name || 'Anonymous'}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-gray-400 mb-1">Times Used</h4>
                    <p className="text-white">{selectedTemplate.usage_count || 0}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-1">Created</h4>
                  <p className="text-white">{new Date(selectedTemplate.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex-shrink-0 gap-2">
            <Button
              variant="outline"
              onClick={() => setIsInfoModalOpen(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Close
            </Button>
            <div className="flex w-full gap-2">
              <Button
                onClick={() => selectedTemplate && handleUseTemplate(selectedTemplate)}
                disabled={isUsingTemplate}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isUsingTemplate ? 'Creating...' : 'Use Template'}
              </Button>
              <Button
                asChild
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={!selectedTemplate?.preview_url}
              >
                {selectedTemplate?.preview_url ? (
                  <a href={selectedTemplate.preview_url!} target="_blank" rel="noopener noreferrer">View Preview</a>
                ) : (
                  'View Preview'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
