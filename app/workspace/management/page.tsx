"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Globe, 
  Github, 
  Settings, 
  RefreshCw, 
  RotateCcw, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  GitBranch,
  GitCommit,
  ChevronLeft,
  Database
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { storageManager, type Workspace as Project, type Deployment, type EnvironmentVariable } from "@/lib/storage-manager"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { GlobalHeader } from "../../../components/workspace/global-header"

interface GitHubRepo {
  id: string
  name: string
  fullName: string
  url: string
  defaultBranch: string
  lastCommit?: {
    sha: string
    message: string
    date: string
  }
}

// Extended project interface for display
interface ProjectDisplay extends Project {
  url?: string
  platform: 'vercel' | 'netlify'
  lastDeployment?: Deployment
  environmentVariables: EnvironmentVariable[]
}

export default function ManagementPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [isLoading, setIsLoading] = useState(true)
  const [projects, setProjects] = useState<ProjectDisplay[]>([])
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>("sample-user") // Default fallback
  const [newDeployment, setNewDeployment] = useState({
    commitSha: "",
    branch: "",
    environment: "production"
  })
  const [newEnvVar, setNewEnvVar] = useState({
    key: "",
    value: "",
    environment: "production",
    isSecret: false,
    selectedProjectId: "" // Added selectedProjectId to track which project is selected
  })

  useEffect(() => {
    getCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUserId) {
      loadData()
    }
  }, [currentUserId])

  const getCurrentUser = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    } catch (error) {
      console.error('Error getting current user:', error)
      // Keep default "sample-user" fallback
    }
  }

  const initializeSampleData = async () => {
    try {
      // Ensure storage is initialized
      await storageManager.init()
      
      const projects = await storageManager.getWorkspaces(currentUserId)
      if (projects.length === 0) {
        // Import template service
        const { TemplateService } = await import('@/lib/template-service')
        
        // Create sample projects with templates
        const sampleProject1 = await TemplateService.createWorkspaceWithTemplate({
          name: "Sample React App",
          description: "A sample React application for testing",
          userId: currentUserId,
          isPublic: false,
          isTemplate: false,
          lastActivity: new Date().toISOString(),
          deploymentStatus: "deployed",
          vercelDeploymentUrl: "https://sample-react-app.vercel.app",
          githubRepoUrl: "https://github.com/user/sample-react-app"
        })

        const sampleProject2 = await TemplateService.createWorkspaceWithTemplate({
          name: "Portfolio Site",
          description: "Personal portfolio website",
          userId: currentUserId,
          isPublic: false,
          isTemplate: false,
          lastActivity: new Date().toISOString(),
          deploymentStatus: "deployed",
          netlifyDeploymentUrl: "https://portfolio-site.netlify.app",
          githubRepoUrl: "https://github.com/user/portfolio-site"
        })

        // Create sample deployments
        await storageManager.createDeployment({
          workspaceId: sampleProject1.id,
          url: "https://sample-react-app.vercel.app",
          status: "ready",
          commitSha: "abc123def456",
          commitMessage: "Initial deployment",
          branch: "main",
          environment: "production",
          provider: "vercel"
        })

        await storageManager.createDeployment({
          workspaceId: sampleProject2.id,
          url: "https://portfolio-site.netlify.app",
          status: "ready",
          commitSha: "def456ghi789",
          commitMessage: "Portfolio launch",
          branch: "main",
          environment: "production",
          provider: "netlify"
        })

        // Create sample environment variables
        await storageManager.createEnvironmentVariable({
          workspaceId: sampleProject1.id,
          key: "API_KEY",
          value: "sk-1234567890abcdef",
          environment: "production",
          isSecret: true
        })

        await storageManager.createEnvironmentVariable({
          workspaceId: sampleProject1.id,
          key: "NODE_ENV",
          value: "production",
          environment: "production",
          isSecret: false
        })

        await storageManager.createEnvironmentVariable({
          workspaceId: sampleProject2.id,
          key: "CONTACT_EMAIL",
          value: "contact@example.com",
          environment: "production",
          isSecret: false
        })

        // Reload data to show the new sample projects
        loadData()
      }
    } catch (error) {
      console.error('Error initializing sample data:', error)
    }
  }

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Initialize storage manager
      await storageManager.init()
      
      // Load projects, deployments, and environment variables from IndexedDB
      const [projects, deployments, envVars] = await Promise.all([
        storageManager.getWorkspaces(currentUserId), // Use the current user ID
        storageManager.getDeployments(),
        storageManager.getEnvironmentVariables()
      ])
      
      // Transform projects to include display data
      const projectsWithData: ProjectDisplay[] = projects.map(project => {
        const projectDeployments = deployments.filter(d => d.workspaceId === project.id)
        const projectEnvVars = envVars.filter(e => e.workspaceId === project.id)
        
        // Get the latest deployment
        const lastDeployment = projectDeployments
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        
        // Determine platform based on deployment URLs
        let platform: 'vercel' | 'netlify' = 'vercel'
        if (project.netlifyDeploymentUrl && !project.vercelDeploymentUrl) {
          platform = 'netlify'
        }
        
        return {
          ...project,
          url: project.vercelDeploymentUrl || project.netlifyDeploymentUrl,
          platform,
          lastDeployment,
          environmentVariables: projectEnvVars
        }
      })
      
      setProjects(projectsWithData)
      
      // For now, we'll keep GitHub repos empty since we're not using Supabase
      setGithubRepos([])
      
      // Initialize sample data if no projects exist
      if (projects.length === 0) {
        await initializeSampleData()
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to load management data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const triggerDeployment = async (projectId: string) => {
    if (!newDeployment.commitSha && !newDeployment.branch) {
      toast({
        title: "Missing Information",
        description: "Please provide either a commit SHA or branch name",
        variant: "destructive"
      })
      return
    }

    try {
      // Create deployment record in IndexedDB
      const deployment = await storageManager.createDeployment({
        workspaceId: projectId,
        url: '', // Will be updated when deployment completes
        status: 'building',
        commitSha: newDeployment.commitSha,
        branch: newDeployment.branch,
        environment: newDeployment.environment,
        provider: 'vercel'
      })

      toast({
        title: "Deployment Triggered",
        description: "Your deployment has been started"
      })

      // Reset form and reload data
      setNewDeployment({ commitSha: "", branch: "", environment: "production" })
      loadData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to trigger deployment",
        variant: "destructive"
      })
    }
  }

  const rollbackDeployment = async (projectId: string, deploymentId: string) => {
    try {
      // Update deployment status in IndexedDB
      await storageManager.updateDeployment(deploymentId, { status: 'cancelled' })

      toast({
        title: "Rollback Successful",
        description: "Deployment has been rolled back"
      })

      loadData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rollback deployment",
        variant: "destructive"
      })
    }
  }

  const addEnvironmentVariable = async () => {
    if (!newEnvVar.key || !newEnvVar.value || !newEnvVar.selectedProjectId) {
      toast({
        title: "Missing Information",
        description: "Please provide key, value, and select a project",
        variant: "destructive"
      })
      return
    }

    try {
      // Check if environment variable already exists
      const envVars = await storageManager.getEnvironmentVariables(newEnvVar.selectedProjectId)
      const existingVar = envVars.find(ev => ev.key === newEnvVar.key && ev.environment === newEnvVar.environment)
      
      if (existingVar) {
        // Update existing variable
        await storageManager.updateEnvironmentVariable(existingVar.id, {
          value: newEnvVar.value,
          isSecret: newEnvVar.isSecret
        })
      } else {
        // Create new variable
        await storageManager.createEnvironmentVariable({
          workspaceId: newEnvVar.selectedProjectId,
          key: newEnvVar.key,
          value: newEnvVar.value,
          environment: newEnvVar.environment,
          isSecret: newEnvVar.isSecret
        })
      }

      toast({
        title: "Environment Variable Added",
        description: "Variable has been added successfully"
      })

      // Reset form and reload data
      setNewEnvVar({ 
        key: "", 
        value: "", 
        environment: "production", 
        isSecret: false,
        selectedProjectId: "" 
      })
      loadData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add environment variable",
        variant: "destructive"
      })
    }
  }

  const deleteEnvironmentVariable = async (projectId: string, key: string, environment: string) => {
    try {
      // Find the environment variable to get its ID
      const envVars = await storageManager.getEnvironmentVariables(projectId)
      const envVar = envVars.find(ev => ev.key === key && ev.environment === environment)
      
      if (envVar) {
        await storageManager.deleteEnvironmentVariable(envVar.id)
        
        toast({
          title: "Environment Variable Deleted",
          description: "Variable has been removed successfully"
        })
      } else {
        toast({
          title: "Error",
          description: "Environment variable not found",
          variant: "destructive"
        })
      }

      loadData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete environment variable",
        variant: "destructive"
      })
    }
  }

  const clearAllData = async () => {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      try {
        await storageManager.clearAll()
        setProjects([])
        setGithubRepos([])
        
        toast({
          title: "Data Cleared",
          description: "All data has been cleared successfully"
        })
      } catch (error) {
        toast({
          title: "Clear Failed",
          description: "Failed to clear data",
          variant: "destructive"
        })
      }
    }
  }

  const exportData = async () => {
    try {
      const data = await storageManager.exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `deployment-manager-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Data Exported",
        description: "All data has been exported successfully"
      })
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data",
        variant: "destructive"
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'building':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'cancelled':
        return <Clock className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      ready: "default",
      building: "secondary",
      error: "destructive",
      cancelled: "outline"
    }
    
    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <GlobalHeader 
        title="Project Management"
        showSettingsButton={false}
      />
      
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col space-y-2 mb-6">
            <h1 className="text-3xl font-bold">Project Management</h1>
            <p className="text-muted-foreground">
              Manage your projects, deployments, and environment variables
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Improved responsive tabs */}
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="deployments">Deployments</TabsTrigger>
              <TabsTrigger value="environment">Environment</TabsTrigger>
              <TabsTrigger value="github">GitHub</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {projects.map((project) => (
                  <Card key={project.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {project.platform === 'vercel' ? (
                            <Globe className="h-5 w-5 text-blue-500 flex-shrink-0" />
                          ) : (
                            <Globe className="h-5 w-5 text-green-500 flex-shrink-0" />
                          )}
                          <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                        </div>
                        <Badge variant="outline" className="ml-2 flex-shrink-0">{project.platform}</Badge>
                      </div>
                      <CardDescription>
                        {project.url ? (
                          <a 
                            href={project.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline flex items-center space-x-1"
                          >
                            <span className="truncate">{project.url.replace(/^https?:\/\//, '')}</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        ) : (
                          "No deployment URL"
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {project.lastDeployment ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Last Deployment</span>
                            {getStatusBadge(project.lastDeployment.status)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(project.lastDeployment.createdAt).toLocaleDateString()} {new Date(project.lastDeployment.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          No deployments yet
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Deployments Tab */}
            <TabsContent value="deployments" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Trigger New Deployment</CardTitle>
                  <CardDescription>
                    Deploy a specific commit or branch to your project
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="commit-sha">Commit SHA (Optional)</Label>
                      <Input
                        id="commit-sha"
                        placeholder="abc123..."
                        value={newDeployment.commitSha}
                        onChange={(e) => setNewDeployment(prev => ({ ...prev, commitSha: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="branch">Branch (Optional)</Label>
                      <Input
                        id="branch"
                        placeholder="main"
                        value={newDeployment.branch}
                        onChange={(e) => setNewDeployment(prev => ({ ...prev, branch: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="environment">Environment</Label>
                      <select
                        id="environment"
                        className="w-full px-3 py-2 border border-input rounded-md"
                        value={newDeployment.environment}
                        onChange={(e) => setNewDeployment(prev => ({ ...prev, environment: e.target.value }))}
                      >
                        <option value="production">Production</option>
                        <option value="preview">Preview</option>
                        <option value="development">Development</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {projects.map((project) => (
                      <Button
                        key={project.id}
                        onClick={() => triggerDeployment(project.id)}
                        disabled={!newDeployment.commitSha && !newDeployment.branch}
                        variant="outline"
                        className="flex-1 min-w-[150px]"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Deploy {project.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {projects.map((project) => (
                  <Card key={project.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        {project.platform === 'vercel' ? (
                          <Globe className="h-5 w-5 text-blue-500" />
                        ) : (
                          <Globe className="h-5 w-5 text-green-500" />
                        )}
                        <span>{project.name} Deployments</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {project.lastDeployment ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center space-x-3">
                              {getStatusIcon(project.lastDeployment.status)}
                              <div>
                                <div className="font-medium">
                                  {project.lastDeployment.commitMessage || 'Deployment'}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {project.lastDeployment.commitSha && (
                                    <span className="font-mono text-xs">
                                      {project.lastDeployment.commitSha.substring(0, 7)}
                                    </span>
                                  )}
                                  {project.lastDeployment.branch && (
                                    <span className="ml-2">
                                      <GitBranch className="h-3 w-3 inline mr-1" />
                                      {project.lastDeployment.branch}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getStatusBadge(project.lastDeployment.status)}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => rollbackDeployment(project.id, project.lastDeployment!.id)}
                                disabled={project.lastDeployment.status !== 'ready'}
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Rollback
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          No deployments found
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Environment Variables Tab */}
            <TabsContent value="environment" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Add Environment Variable</CardTitle>
                  <CardDescription>
                    Add new environment variables to your projects
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {/* Improved responsive grid for environment variable form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor="env-key">Key</Label>
                        <Input
                          id="env-key"
                          placeholder="API_KEY"
                          value={newEnvVar.key}
                          onChange={(e) => setNewEnvVar(prev => ({ ...prev, key: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="env-value">Value</Label>
                        <Input
                          id="env-value"
                          type={newEnvVar.isSecret ? "password" : "text"}
                          placeholder="your-value-here"
                          value={newEnvVar.value}
                          onChange={(e) => setNewEnvVar(prev => ({ ...prev, value: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="env-environment">Environment</Label>
                        <select
                          id="env-environment"
                          className="w-full px-3 py-2 h-10 border border-input bg-background rounded-md"
                          value={newEnvVar.environment}
                          onChange={(e) => setNewEnvVar(prev => ({ ...prev, environment: e.target.value }))}
                        >
                          <option value="production">Production</option>
                          <option value="preview">Preview</option>
                          <option value="development">Development</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="env-project">Project</Label>
                        <select
                          id="env-project"
                          className="w-full px-3 py-2 h-10 border border-input bg-background rounded-md"
                          value={newEnvVar.selectedProjectId}
                          onChange={(e) => setNewEnvVar(prev => ({ ...prev, selectedProjectId: e.target.value }))}
                        >
                          <option value="">Select a project</option>
                          {projects.map(project => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newEnvVar.isSecret}
                          onChange={(e) => setNewEnvVar(prev => ({ ...prev, isSecret: e.target.checked }))}
                          className="rounded"
                        />
                        <span className="text-sm">Treat as secret (values will be hidden)</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button
                      onClick={addEnvironmentVariable}
                      disabled={!newEnvVar.key || !newEnvVar.value || !newEnvVar.selectedProjectId}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Environment Variable
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {projects.map((project) => (
                  <Card key={project.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Settings className="h-5 w-5" />
                        <span>{project.name} Environment Variables</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {project.environmentVariables.length > 0 ? (
                        <div className="space-y-3">
                          {project.environmentVariables.map((envVar, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div>
                                <div className="font-medium">{envVar.key}</div>
                                <div className="text-sm text-muted-foreground">
                                  {envVar.isSecret ? '••••••••' : envVar.value}
                                </div>
                                <Badge variant="outline" className="mt-1">
                                  {envVar.environment}
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteEnvironmentVariable(project.id, envVar.key, envVar.environment)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          No environment variables found
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* GitHub Tab */}
            <TabsContent value="github" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Github className="h-5 w-5" />
                    <span>GitHub Repositories</span>
                  </CardTitle>
                  <CardDescription>
                    Manage your connected GitHub repositories and trigger deployments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {githubRepos.length > 0 ? (
                    <div className="space-y-3">
                      {githubRepos.map((repo) => (
                        <div key={repo.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Github className="h-5 w-5" />
                            <div>
                              <div className="font-medium">{repo.name}</div>
                              <div className="text-sm text-muted-foreground">{repo.fullName}</div>
                              {repo.lastCommit && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  <GitCommit className="h-3 w-3 inline mr-1" />
                                  {repo.lastCommit.sha.substring(0, 7)} - {repo.lastCommit.message}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{repo.defaultBranch}</Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(repo.url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      No GitHub repositories found. Connect your GitHub account to get started.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}