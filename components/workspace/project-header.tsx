"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, GitBranch, Share, Settings, Plus, Rocket, Upload } from "lucide-react"
import { Logo } from "@/components/ui/logo"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import React, { useState, useEffect } from 'react'
import type { Workspace as Project } from "@/lib/storage-manager"
import { ModelSelector } from "@/components/ui/model-selector"
import { useGitHubPush } from "@/hooks/use-github-push"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface ProjectHeaderProps {
  project: Project | null
  // onShare will be called after a successful copy with the share URL
  onShare?: (shareUrl?: string) => void
  onSettings?: () => void
  onDeploy?: () => void
  selectedModel?: string
  onModelChange?: (modelId: string) => void
  userPlan?: string
  subscriptionStatus?: string
  user?: any
  onProjectCreated?: (newProject: Project) => Promise<void>
  openDialog?: boolean
  initialName?: string
  initialDescription?: string
  onDialogOpenChange?: (open: boolean) => void
}

export function ProjectHeader({
  project,
  onShare,
  onSettings,
  onDeploy,
  selectedModel,
  onModelChange,
  userPlan,
  subscriptionStatus,
  user,
  onProjectCreated,
  openDialog,
  initialName,
  initialDescription,
  onDialogOpenChange
}: ProjectHeaderProps) {
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState(project?.name || "")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectDescription, setNewProjectDescription] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [gitHubConnected, setGitHubConnected] = useState(false)

  // GitHub push functionality
  const { pushToGitHub, checkGitHubConnection, isPushing } = useGitHubPush()

  React.useEffect(() => {
    setNameInput(project?.name || "")
  }, [project?.name])

  // Check GitHub connection status when project changes
  useEffect(() => {
    const checkConnection = async () => {
      if (!project) {
        setGitHubConnected(false)
        return
      }

      const connectionStatus = await checkGitHubConnection(project)
      setGitHubConnected(connectionStatus.connected)
    }

    checkConnection()
  }, [project, checkGitHubConnection])

  // Handle external dialog open control
  React.useEffect(() => {
    if (openDialog !== undefined) {
      setIsCreateDialogOpen(openDialog)
    }
  }, [openDialog])

  // Handle initial name and description from external control
  React.useEffect(() => {
    if (openDialog) {
      if (initialName) {
        setNewProjectName(initialName)
      }
      if (initialDescription) {
        setNewProjectDescription(initialDescription)
      }
    }
  }, [initialName, initialDescription, openDialog])

  const handleShareClick = async () => {
    if (!project) return
    const shareUrl = `${window.location.origin}/workspace?projectId=${project.id}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      onShare?.(shareUrl)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy share link', err)
      // Still call onShare so parent can show fallback
      onShare?.(shareUrl)
    }
  }

  const handleNameSave = async () => {
    if (!project || !nameInput.trim() || nameInput === project.name) {
      setEditing(false)
      return
    }
    try {
      const { storageManager } = await import("@/lib/storage-manager")
      await storageManager.init()
      await storageManager.updateWorkspace(project.id, { name: nameInput.trim() })
      setEditing(false)
    } catch (err) {
      console.error("Failed to update project name", err)
      setEditing(false)
    }
  }

  const handlePushToGitHub = async () => {
    if (!project) return
    
    await pushToGitHub(project, {
      commitMessage: `Update project files - ${new Date().toLocaleString()}`,
      onSuccess: (data) => {
        // Optionally refresh or update UI state
      },
      onError: (error) => {
        console.error('Push failed:', error)
      }
    })
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !user) return

    setIsCreating(true)

    try {
      console.log('Creating new project:', newProjectName)
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      const slug = newProjectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const workspace = await storageManager.createWorkspace({
        name: newProjectName,
        description: newProjectDescription || undefined,
        userId: user.id,
        isPublic: false,
        isTemplate: false,
        lastActivity: new Date().toISOString(),
        deploymentStatus: 'not_deployed',
        slug
      })
      // Apply template files
      const { TemplateService } = await import('@/lib/template-service')
      await TemplateService.applyViteReactTemplate(workspace.id)
      // Close dialog and reset form
      setIsCreateDialogOpen(false)
      onDialogOpenChange?.(false)
      setNewProjectName("")
      setNewProjectDescription("")
      // Notify parent to refresh projects
      if (onProjectCreated && workspace) {
        await onProjectCreated(workspace)
      }
    } catch (error) {
      console.error("Error creating project:", error)
    } finally {
      setIsCreating(false)
    }
  }
  if (!project) {
    return (
      <div className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Logo variant="icon" size="sm" />
          <div>
            <h1 className="text-lg font-semibold text-card-foreground">Welcome to PixelPilot</h1>
            <p className="text-sm text-muted-foreground">Create your first project to get started</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Model selector even when no project */}
          {selectedModel && onModelChange && (
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={onModelChange}
            />
          )}
          {/* Create project button */}
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open)
            onDialogOpenChange?.(open)
          }}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Start building your next app with AI assistance.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    placeholder="My Awesome App"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="A brief description of your project"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateProject} disabled={!newProjectName.trim() || isCreating}>
                  {isCreating ? "Creating..." : "Create Project"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    )
  }

  return (
    <div className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <Logo variant="icon" size="sm" />
        <div>
          {editing ? (
            <input
              type="text"
              className="text-lg font-semibold text-card-foreground bg-background border border-border rounded px-2 py-1 w-40 focus:outline-none focus:ring-2 focus:ring-primary"
              value={nameInput}
              autoFocus
              onChange={e => setNameInput(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={e => {
                if (e.key === "Enter") handleNameSave()
                if (e.key === "Escape") setEditing(false)
              }}
            />
          ) : (
            <h1
              className="text-lg font-semibold text-card-foreground cursor-pointer hover:underline"
              title="Click to edit project name"
              onClick={() => setEditing(true)}
            >
              {project.name}
            </h1>
          )}
          {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
        </div>
        <Badge variant="secondary">
          <GitBranch className="h-3 w-3 mr-1" />
          main
        </Badge>
        {/* Model label and selector */}
        {selectedModel && onModelChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Model:</span>
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={onModelChange}
              userPlan={userPlan}
              subscriptionStatus={subscriptionStatus}
              compact={true}
            />
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open)
          onDialogOpenChange?.(open)
          if (!open) {
            // Reset form when closing
            setNewProjectName("")
            setNewProjectDescription("")
          }
        }}>
          <DialogTrigger asChild>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0 sm:w-auto sm:px-3">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">New</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Create New Project</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DialogTrigger>
          <DialogContent className="z-50">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>Start building your next app with AI assistance.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  placeholder="My Awesome App"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what your app will do..."
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateProject} disabled={!newProjectName.trim() || isCreating}>
                {isCreating ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleShareClick}
                disabled={!project}
                className="h-8 w-8 p-0 sm:w-auto sm:px-3"
              >
                <Share className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">
                  {copied ? 'Copied!' : 'Share'}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{copied ? 'Link copied to clipboard!' : 'Share project'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onSettings}
                disabled={!project}
                className="h-8 w-8 p-0 sm:w-auto sm:px-3"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Settings</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Project Settings</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* GitHub Push Button - only show when connected */}
        {gitHubConnected && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePushToGitHub}
                  disabled={!project || isPushing}
                  className="h-8 w-8 p-0 sm:w-auto sm:px-3 transition-all"
                >
                  <Upload className={`h-4 w-4 ${isPushing ? 'animate-pulse' : ''}`} />
                  <span className="hidden sm:inline ml-2">
                    {isPushing ? "Pushing..." : "Push"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p>{isPushing ? "Pushing changes to GitHub..." : "Push latest changes to GitHub repository"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="sm" 
                onClick={onDeploy} 
                disabled={!project}
                className="h-8 px-3"
              >
                <Rocket className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Deploy</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Deploy Project</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}