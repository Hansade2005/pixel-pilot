"use client"

import React, { useState, useEffect } from "react"
import type { User } from "@supabase/supabase-js"
import type { Workspace as Project } from "@/lib/storage-manager"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search, 
  Folder, 
  Settings, 
  LogOut, 
  Sparkles, 
  PanelLeft,
  Trash2,
  Pin,
  PinOff,
  Edit,
  Copy,
  MoreHorizontal,
  ArrowUpDown,
  Calendar,
  Star
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useCredits } from "@/hooks/use-credits"
import { Zap, TrendingUp, AlertTriangle, Shield, CheckCircle } from "lucide-react"

interface SidebarProps {
  user: User
  projects: Project[]
  selectedProject: Project | null
  onSelectProject: (project: Project) => void
  onProjectCreated?: (newProject: Project) => Promise<void>
  collapsed: boolean
  onToggleCollapse: () => void
  isMobile?: boolean
}

export function Sidebar({
  user,
  projects,
  selectedProject,
  onSelectProject,
  onProjectCreated,
  collapsed,
  onToggleCollapse,
  isMobile = false,
}: SidebarProps) {
  
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<'name' | 'lastActivity' | 'created'>('lastActivity')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null)
  const [renameProject, setRenameProject] = useState<Project | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [cloneProject, setCloneProject] = useState<Project | null>(null)
  const [cloneName, setCloneName] = useState("")
  const router = useRouter()

  // Credit status hook
  const { creditStatus, loading: creditsLoading, isLowOnCredits, isOutOfCredits, usagePercentage } = useCredits(user.id)

  // Advanced filter and sort projects
  const filteredAndSortedProjects = React.useMemo(() => {
    let filtered = projects.filter((project) => 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    // Sort projects
    filtered.sort((a, b) => {
      // Pinned projects always come first
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      
      // Then sort by selected criteria
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'lastActivity':
          comparison = new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime()
          break
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        default:
          comparison = 0
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [projects, searchQuery, sortBy, sortOrder])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  // Pin/Unpin project
  const handleTogglePin = async (project: Project) => {
    try {
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      await storageManager.updateWorkspace(project.id, {
        isPinned: !project.isPinned
      })
      // Refresh projects
      window.location.reload()
    } catch (error) {
      console.error('Error toggling pin status:', error)
    }
  }

  // Delete project
  const handleDeleteProject = async (projectId: string) => {
    try {
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      
      // Delete all files first
      const files = await storageManager.getFiles(projectId)
      for (const file of files) {
        await storageManager.deleteFile(projectId, file.path)
      }
      
      // Delete project
      await storageManager.deleteWorkspace(projectId)
      
      // If this was the selected project, clear selection
      if (selectedProject?.id === projectId) {
        const remainingProjects = projects.filter(p => p.id !== projectId)
        if (remainingProjects.length > 0) {
          onSelectProject(remainingProjects[0])
        }
      }
      
      // Refresh page to update project list
      window.location.reload()
      setDeleteProjectId(null)
    } catch (error) {
      console.error('Error deleting project:', error)
    }
  }

  // Rename project
  const handleRenameProject = async () => {
    if (!renameProject || !renameValue.trim()) return
    
    try {
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      
      const slug = renameValue.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      await storageManager.updateWorkspace(renameProject.id, {
        name: renameValue.trim(),
        slug,
        updatedAt: new Date().toISOString()
      })
      
      setRenameProject(null)
      setRenameValue("")
      window.location.reload()
    } catch (error) {
      console.error('Error renaming project:', error)
    }
  }

  // Clone project
  const handleCloneProject = async () => {
    if (!cloneProject || !cloneName.trim()) return
    
    try {
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      
      // Create new project
      const slug = cloneName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const newProject = await storageManager.createWorkspace({
        name: cloneName.trim(),
        description: `Cloned from ${cloneProject.name}`,
        slug,
        userId: user.id,
        isPublic: false,
        isTemplate: false,
        lastActivity: new Date().toISOString(),
        deploymentStatus: 'not_deployed'
      })
      
      // Copy all files from original project
      const originalFiles = await storageManager.getFiles(cloneProject.id)
      for (const file of originalFiles) {
        await storageManager.createFile({
          workspaceId: newProject.id,
          name: file.name,
          path: file.path,
          content: file.content,
          fileType: file.fileType,
          type: file.type,
          size: file.size,
          isDirectory: file.isDirectory
        })
      }
      
      setCloneProject(null)
      setCloneName("")
      
      // Select the new project
      onSelectProject(newProject)
      if (onProjectCreated) {
        await onProjectCreated(newProject)
      }
      
      window.location.reload()
    } catch (error) {
      console.error('Error cloning project:', error)
    }
  }

  if (collapsed) {
    return (
      <div className="w-16 border-r border-border bg-sidebar flex flex-col">
        <div className="p-4">
          <Button variant="ghost" size="sm" onClick={onToggleCollapse}>
            <PanelLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1" />
        <div className="p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.user_metadata?.avatar_url || "https://randomuser.me/api/portraits/men/62.jpg"} />
                  <AvatarFallback className="text-xs">{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={`${isMobile ? 'z-[70]' : 'z-50'}`}>
              <DropdownMenuItem onClick={() => router.push('/workspace/account')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  }

  return (
    <div className={`${isMobile ? 'w-full' : 'w-80 border-r border-border'} bg-sidebar flex flex-col relative z-10`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
            className="h-8 w-8 p-0"
            title="Refresh page"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
          <h2 className="text-lg font-semibold">Projects</h2>
        </div>
        {/* Only show toggle button on desktop, not in mobile sheet */}
        {!isMobile && (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="h-8 w-8 p-0"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Credit Status Section */}
      {!creditsLoading && creditStatus && (
        <div className="px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">
                {creditStatus.plan === 'admin' ? 'Admin Access' :
                 creditStatus.plan === 'free_mode' ? 'Free Mode' :
                 'Credits'}
              </span>
            </div>
            {creditStatus.plan !== 'admin' && isOutOfCredits && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs"
                onClick={() => router.push('/pricing')}
              >
                Upgrade
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {creditStatus.plan === 'admin' ? (
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-xs text-green-600 font-medium">
                  Unlimited credits (Admin)
                </span>
              </div>
            ) : creditStatus.plan === 'free_mode' ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-blue-600 font-medium">
                  Unlimited credits (Free Mode)
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {creditStatus.remaining} / {creditStatus.limit}
                  </span>
                  <span className="text-xs font-medium">
                    {usagePercentage}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      isOutOfCredits ? 'bg-red-500' :
                      isLowOnCredits ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                  />
                </div>
              </>
            )}

            {/* Status Messages */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {creditStatus.plan} plan
              </span>
              {creditStatus.plan === 'admin' ? (
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle className="h-3 w-3" />
                  <span className="text-xs">Admin</span>
                </div>
              ) : (
                <>
                  {isLowOnCredits && (
                    <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                      <AlertTriangle className="h-3 w-3" />
                      <span className="text-xs">Low</span>
                    </div>
                  )}
                  {isOutOfCredits && (
                    <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <AlertTriangle className="h-3 w-3" />
                      <span className="text-xs">Empty</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search and Sort */}
      <div className="p-4 border-b space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-sidebar-accent"
          />
        </div>
        
        {/* Sort Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  <ArrowUpDown className="h-3 w-3 mr-1" />
                  Sort by {sortBy === 'lastActivity' ? 'Activity' : sortBy === 'name' ? 'Name' : 'Created'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setSortBy('lastActivity')}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Last Activity
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('name')}>
                  <Folder className="mr-2 h-4 w-4" />
                  Name
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('created')}>
                  <Star className="mr-2 h-4 w-4" />
                  Created Date
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              <ArrowUpDown className={`h-3 w-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground">
            {filteredAndSortedProjects.length} project{filteredAndSortedProjects.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Projects */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-sidebar-foreground">Your Projects</h3>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-20"
              onClick={() => window.open('/workspace/deployment', '_blank')}
            >
              Deploy
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-20"
              onClick={() => window.open('/workspace/management', '_blank')}
            >
              Manage
            </Button>
          </div>
        </div>
      </div>

      {/* Projects Container - Fixed height with scrolling for mobile */}
      <div className="flex-1 overflow-hidden">
        {isMobile ? (
          <div className={filteredAndSortedProjects.length > 3 ? "max-h-70 overflow-y-auto px-4" : "px-4"}>
            <div className="space-y-1 pb-4">
              {filteredAndSortedProjects.map((project) => (
                <div key={project.id + '-' + project.slug} className="group relative">
                  <Button
                    variant={selectedProject?.id === project.id ? "secondary" : "ghost"}
                    className="w-full justify-start h-auto p-3 text-left pr-12"
                    onClick={() => onSelectProject(project)}
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <Folder className="h-4 w-4 text-sidebar-primary flex-shrink-0" />
                        {project.isPinned && (
                          <Pin className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">
                          {project.name.length > 12 ? `${project.name.substring(0, 12)}...` : project.name}
                        </div>
                        {project.description && (
                          <div className="text-xs text-muted-foreground truncate">{project.description}</div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {new Date(project.lastActivity).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </Button>
                  {/* Project Management Menu */}
                  <div className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className={`w-48 ${isMobile ? 'z-[70]' : 'z-50'}`}>
                        <DropdownMenuItem onClick={() => handleTogglePin(project)}>
                          {project.isPinned ? (
                            <><PinOff className="mr-2 h-4 w-4" />Unpin Project</>
                          ) : (
                            <><Pin className="mr-2 h-4 w-4" />Pin Project</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setRenameProject(project)
                          setRenameValue(project.name)
                        }}>
                          <Edit className="mr-2 h-4 w-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setCloneProject(project)
                          setCloneName(`${project.name} Copy`)
                        }}>
                          <Copy className="mr-2 h-4 w-4" />
                          Clone
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setDeleteProjectId(project.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
              {filteredAndSortedProjects.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {searchQuery ? 'No projects found' : 'No projects found'}
                  </p>
                  {searchQuery && (
                    <p className="text-xs mt-1">Try a different search term</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full px-4">
            <div className="space-y-1 pb-4">
              {filteredAndSortedProjects.map((project) => (
                <div key={project.id + '-' + project.slug} className="group relative">
                  <Button
                    variant={selectedProject?.id === project.id ? "secondary" : "ghost"}
                    className="w-full justify-start h-auto p-3 text-left pr-12"
                    onClick={() => onSelectProject(project)}
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <Folder className="h-4 w-4 text-sidebar-primary flex-shrink-0" />
                        {project.isPinned && (
                          <Pin className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">
                          {project.name.length > 12 ? `${project.name.substring(0, 12)}...` : project.name}
                        </div>
                        {project.description && (
                          <div className="text-xs text-muted-foreground truncate">{project.description}</div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {new Date(project.lastActivity).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </Button>
                  {/* Project Management Menu */}
                  <div className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className={`w-48 ${isMobile ? 'z-[70]' : 'z-50'}`}>
                        <DropdownMenuItem onClick={() => handleTogglePin(project)}>
                          {project.isPinned ? (
                            <><PinOff className="mr-2 h-4 w-4" />Unpin Project</>
                          ) : (
                            <><Pin className="mr-2 h-4 w-4" />Pin Project</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setRenameProject(project)
                          setRenameValue(project.name)
                        }}>
                          <Edit className="mr-2 h-4 w-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setCloneProject(project)
                          setCloneName(`${project.name} Copy`)
                        }}>
                          <Copy className="mr-2 h-4 w-4" />
                          Clone
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setDeleteProjectId(project.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
              {filteredAndSortedProjects.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {searchQuery ? 'No projects found' : 'No projects found'}
                  </p>
                  {searchQuery && (
                    <p className="text-xs mt-1">Try a different search term</p>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Footer - User Menu */}
      <div className="mt-auto border-t border-sidebar-border bg-sidebar">
        <div className="p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start p-2">
                <Avatar className="h-6 w-6 mr-3">
                  <AvatarImage src={user.user_metadata?.avatar_url || "https://randomuser.me/api/portraits/men/62.jpg"} />
                  <AvatarFallback className="text-xs">{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="text-left min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{user.user_metadata?.full_name || user.email}</div>
                  <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={`w-56 ${isMobile ? 'z-[70]' : 'z-50'}`}>
              <DropdownMenuItem onClick={() => router.push('/workspace/account')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete Project Confirmation Dialog */}
      <AlertDialog open={!!deleteProjectId} onOpenChange={() => setDeleteProjectId(null)}>
        <AlertDialogContent className={isMobile ? 'z-[80]' : ''}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
              All files and data in this project will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProjectId && handleDeleteProject(deleteProjectId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Project Dialog */}
      <Dialog open={!!renameProject} onOpenChange={(open) => {
        if (!open) setRenameProject(null)
        // Close sidebar on mobile when modal opens
        if (open && isMobile && onToggleCollapse) {
          onToggleCollapse()
        }
      }}>
        <DialogContent className={isMobile ? 'z-[80]' : ''}>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>
              Enter a new name for "{renameProject?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rename">Project Name</Label>
              <Input
                id="rename"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Enter new project name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameProject(null)}>
              Cancel
            </Button>
            <Button onClick={handleRenameProject} disabled={!renameValue.trim()}>
              Rename Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone Project Dialog */}
      <Dialog open={!!cloneProject} onOpenChange={(open) => {
        if (!open) setCloneProject(null)
        // Close sidebar on mobile when modal opens
        if (open && isMobile && onToggleCollapse) {
          onToggleCollapse()
        }
      }}>
        <DialogContent className={isMobile ? 'z-[80]' : ''}>
          <DialogHeader>
            <DialogTitle>Clone Project</DialogTitle>
            <DialogDescription>
              Create a copy of "{cloneProject?.name}" with all its files.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="clone">New Project Name</Label>
              <Input
                id="clone"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="Enter name for cloned project"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneProject(null)}>
              Cancel
            </Button>
            <Button onClick={handleCloneProject} disabled={!cloneName.trim()}>
              Clone Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
