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
  Database,
  Rocket,
  Calendar,
  Server,
  FolderOpen,
  Search,
  Filter,
  History,
  BarChart3,
  TrendingUp,
  Users,
  Shield
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

interface DeployedRepo {
  id: string
  projectId: string
  projectName: string
  githubUrl: string
  githubRepo: string
  vercelUrl?: string
  netlifyUrl?: string
  deployedAt: string
  lastUpdated: string
}

// Extended project interface for display
interface ProjectDisplay extends Project {
  url?: string
  platform: 'vercel' | 'netlify'
  lastDeployment?: Deployment
  environmentVariables: EnvironmentVariable[]
}

// Quick stats interface
interface QuickStats {
  projectsCount: number
  deploymentsCount: number
  lastActivity: string
  activeProjects: number
}

export default function ManagementPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [isLoading, setIsLoading] = useState(true)
  const [projects, setProjects] = useState<ProjectDisplay[]>([])
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([])
  const [deployedRepos, setDeployedRepos] = useState<DeployedRepo[]>([])
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
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [quickStats, setQuickStats] = useState<QuickStats>({
    projectsCount: 0,
    deploymentsCount: 0,
    lastActivity: 'Never',
    activeProjects: 0
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

  const calculateQuickStats = async (projects: ProjectDisplay[], deployments: Deployment[]) => {
    try {
      const stats: QuickStats = {
        projectsCount: projects.length,
        deploymentsCount: deployments.length,
        lastActivity: projects.length > 0 
          ? new Date(Math.max(...projects.map(p => new Date(p.lastActivity).getTime()))).toLocaleString()
          : 'Never',
        activeProjects: projects.filter(p => p.deploymentStatus === 'deployed').length
      }

      setQuickStats(stats)
    } catch (error) {
      console.error('Error calculating quick stats:', error)
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
      
      // Load deployed repositories
      await loadDeployedRepos()
      
      // Calculate quick stats
      await calculateQuickStats(projectsWithData, deployments)
      
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

  // Load deployed repositories from storage
  const loadDeployedRepos = async (projectsList?: ProjectDisplay[]) => {
    try {
      await storageManager.init()
      const [deployments, allProjects] = await Promise.all([
        storageManager.getDeployments(),
        storageManager.getWorkspaces(currentUserId)
      ])

      // Use provided projects or load all projects
      const projectsToUse = projectsList || allProjects.map(project => ({
        ...project,
        url: project.vercelDeploymentUrl || project.netlifyDeploymentUrl || project.githubRepoUrl,
        platform: (project.vercelDeploymentUrl ? 'vercel' : project.netlifyDeploymentUrl ? 'netlify' : 'github') as 'vercel' | 'netlify' | 'github',
        lastDeployment: undefined,
        environmentVariables: []
      } as ProjectDisplay))

      const repos: DeployedRepo[] = []

      for (const deployment of deployments) {
        const project = projectsToUse.find(p => p.id === deployment.workspaceId)
        if (project) {
          const existingRepo = repos.find(r => r.projectId === deployment.workspaceId)
          if (existingRepo) {
            // Update existing repo with new deployment info
            if (deployment.provider === 'vercel') {
              existingRepo.vercelUrl = deployment.url
            } else if (deployment.provider === 'netlify') {
              existingRepo.netlifyUrl = deployment.url
            } else if (deployment.provider === 'github') {
              // For GitHub deployments, the URL is the repo URL
              existingRepo.githubUrl = deployment.url
              existingRepo.githubRepo = deployment.url.split('/').slice(-2).join('/')
            }
            existingRepo.lastUpdated = deployment.createdAt || new Date().toISOString()
          } else {
            // Create new repo entry
            const repoEntry: DeployedRepo = {
              id: deployment.id,
              projectId: deployment.workspaceId,
              projectName: project.name,
              githubUrl: project.githubRepoUrl || (deployment.provider === 'github' ? deployment.url : ''),
              githubRepo: project.githubRepoUrl ? project.githubRepoUrl.split('/').slice(-2).join('/') :
                (deployment.provider === 'github' ? deployment.url.split('/').slice(-2).join('/') : ''),
              vercelUrl: deployment.provider === 'vercel' ? deployment.url : undefined,
              netlifyUrl: deployment.provider === 'netlify' ? deployment.url : undefined,
              deployedAt: deployment.createdAt || new Date().toISOString(),
              lastUpdated: deployment.createdAt || new Date().toISOString(),
            }

            // Only add if it has GitHub repo info
            if (repoEntry.githubUrl || deployment.provider === 'github') {
              repos.push(repoEntry)
            }
          }
        }
      }

      setDeployedRepos(repos)
      
      // Transform deployed repos to GitHubRepo format for display
      const githubReposDisplay: GitHubRepo[] = repos
        .filter(repo => repo.githubUrl)
        .map(repo => ({
          id: repo.id,
          name: repo.githubRepo.split('/')[1] || repo.projectName,
          fullName: repo.githubRepo,
          url: repo.githubUrl,
          defaultBranch: 'main', // Default value since we don't have this info
        }))

      setGithubRepos(githubReposDisplay)
    } catch (error) {
      console.error('Error loading deployed repos:', error)
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
        commitMessage: `Deployment triggered from management page`,
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

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
    
    if (filterStatus === 'all') return matchesSearch
    if (filterStatus === 'deployed') return matchesSearch && project.deploymentStatus === 'deployed'
    if (filterStatus === 'not_deployed') return matchesSearch && project.deploymentStatus !== 'deployed'
    return matchesSearch
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-900 text-white">
      <GlobalHeader 
        title="Project Management"
        showSettingsButton={false}
      />
      
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col space-y-2 mb-6">
            <h1 className="text-3xl font-bold">Project Management</h1>
            <p className="text-muted-foreground text-gray-400">
              Manage your projects, deployments, and environment variables
            </p>
          </div>

          {/* Quick Stats Row */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-900 rounded-lg">
                    <FolderOpen className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Projects</p>
                    <p className="text-2xl font-bold">{quickStats.projectsCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-900 rounded-lg">
                    <Rocket className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Deployments</p>
                    <p className="text-2xl font-bold">{quickStats.deploymentsCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-900 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Active Projects</p>
                    <p className="text-2xl font-bold">{quickStats.activeProjects}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-900 rounded-lg">
                    <Calendar className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Last Activity</p>
                    <p className="text-sm font-bold truncate">
                      {quickStats.lastActivity === 'Never' ? 'Never' : new Date(quickStats.lastActivity).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter Bar */}
          <Card className="mb-6 bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search projects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full sm:w-64 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    >
                      <option value="all" className="bg-gray-700">All Projects</option>
                      <option value="deployed" className="bg-gray-700">Deployed</option>
                      <option value="not_deployed" className="bg-gray-700">Not Deployed</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={exportData}
                    className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearAllData}
                    className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Improved responsive tabs */}
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2 bg-gray-800">
              <TabsTrigger value="overview" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white">Overview</TabsTrigger>
              <TabsTrigger value="deployments" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white">Deployments</TabsTrigger>
              <TabsTrigger value="environment" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white">Environment</TabsTrigger>
              <TabsTrigger value="github" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white">GitHub</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filteredProjects.map((project) => (
                  <Card key={project.id} className="bg-gray-800 border-gray-700 hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {project.platform === 'vercel' ? (
                            <Globe className="h-5 w-5 text-blue-500 flex-shrink-0" />
                          ) : (
                            <Globe className="h-5 w-5 text-green-500 flex-shrink-0" />
                          )}
                          <CardTitle className="text-lg truncate">
                            {project.name.length > 12 ? `${project.name.substring(0, 12)}...` : project.name}
                          </CardTitle>
                        </div>
                        <Badge variant="outline" className="ml-2 flex-shrink-0 bg-gray-700 text-gray-300 border-gray-600">
                          {project.platform}
                        </Badge>
                      </div>
                      <CardDescription className="text-gray-400">
                        {project.description ? (
                          <span className="truncate">{project.description.length > 30 ? `${project.description.substring(0, 30)}...` : project.description}</span>
                        ) : (
                          "No description"
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {project.url ? (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <ExternalLink className="h-4 w-4 text-gray-400" />
                            <a 
                              href={project.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline text-sm truncate"
                            >
                              {project.url.replace(/^https?:\/\//, '').length > 25 ? 
                                `${project.url.replace(/^https?:\/\//, '').substring(0, 25)}...` : 
                                project.url.replace(/^https?:\/\//, '')}
                            </a>
                          </div>
                          {project.lastDeployment ? (
                            <div className="flex items-center justify-between pt-2">
                              <span className="text-xs text-gray-400">Last Deployment</span>
                              {getStatusBadge(project.lastDeployment.status)}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 pt-2">
                              No deployments yet
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">
                          Not deployed
                        </div>
                      )}
                      <div className="flex justify-between items-center mt-4">
                        <span className="text-xs text-gray-400">
                          {new Date(project.lastActivity).toLocaleDateString()}
                        </span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => router.push(`/workspace/deployment?project=${project.id}`)}
                          className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                        >
                          Manage
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredProjects.length === 0 && (
                  <div className="col-span-full text-center py-12 text-gray-400">
                    <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-lg font-medium mb-2">No projects found</h3>
                    <p className="mb-4">
                      {searchQuery ? 'Try a different search term' : 'Get started by creating a new project'}
                    </p>
                    <Button 
                      onClick={() => router.push('/workspace')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Create Project
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Deployments Tab */}
            <TabsContent value="deployments" className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <Rocket className="h-5 w-5 text-blue-400" />
                    <span>Trigger New Deployment</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Deploy a specific commit or branch to your project
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="commit-sha" className="text-gray-300">Commit SHA (Optional)</Label>
                      <Input
                        id="commit-sha"
                        placeholder="abc123..."
                        value={newDeployment.commitSha}
                        onChange={(e) => setNewDeployment(prev => ({ ...prev, commitSha: e.target.value }))}
                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      />
                    </div>
                    <div>
                      <Label htmlFor="branch" className="text-gray-300">Branch (Optional)</Label>
                      <Input
                        id="branch"
                        placeholder="main"
                        value={newDeployment.branch}
                        onChange={(e) => setNewDeployment(prev => ({ ...prev, branch: e.target.value }))}
                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      />
                    </div>
                    <div>
                      <Label htmlFor="environment" className="text-gray-300">Environment</Label>
                      <select
                        id="environment"
                        className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
                        value={newDeployment.environment}
                        onChange={(e) => setNewDeployment(prev => ({ ...prev, environment: e.target.value }))}
                      >
                        <option value="production" className="bg-gray-700">Production</option>
                        <option value="preview" className="bg-gray-700">Preview</option>
                        <option value="development" className="bg-gray-700">Development</option>
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
                        className="flex-1 min-w-[150px] bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Deploy {project.name.length > 12 ? `${project.name.substring(0, 12)}...` : project.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {projects.map((project) => (
                  <Card key={project.id} className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-white">
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
                          <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                            <div className="flex items-center space-x-3">
                              {getStatusIcon(project.lastDeployment.status)}
                              <div>
                                <div className="font-medium text-white">
                                  {project.lastDeployment.commitMessage || 'Deployment'}
                                </div>
                                <div className="text-sm text-gray-400">
                                  {project.lastDeployment.commitSha && (
                                    <span className="font-mono text-xs">
                                      {project.lastDeployment.commitSha.substring(0, 7)}
                                    </span>
                                  )}
                                  {project.lastDeployment.branch && (
                                    <span className="ml-2 flex items-center">
                                      <GitBranch className="h-3 w-3 mr-1" />
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
                                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Rollback
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-400">
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
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <Settings className="h-5 w-5" />
                    <span>Add Environment Variable</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Add new environment variables to your projects
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {/* Improved responsive grid for environment variable form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor="env-key" className="text-gray-300">Key</Label>
                        <Input
                          id="env-key"
                          placeholder="API_KEY"
                          value={newEnvVar.key}
                          onChange={(e) => setNewEnvVar(prev => ({ ...prev, key: e.target.value }))}
                          className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        />
                      </div>
                      <div>
                        <Label htmlFor="env-value" className="text-gray-300">Value</Label>
                        <Input
                          id="env-value"
                          type={newEnvVar.isSecret ? "password" : "text"}
                          placeholder="your-value-here"
                          value={newEnvVar.value}
                          onChange={(e) => setNewEnvVar(prev => ({ ...prev, value: e.target.value }))}
                          className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        />
                      </div>
                      <div>
                        <Label htmlFor="env-environment" className="text-gray-300">Environment</Label>
                        <select
                          id="env-environment"
                          className="w-full px-3 py-2 h-10 border border-gray-600 bg-gray-700 text-white rounded-md"
                          value={newEnvVar.environment}
                          onChange={(e) => setNewEnvVar(prev => ({ ...prev, environment: e.target.value }))}
                        >
                          <option value="production" className="bg-gray-700">Production</option>
                          <option value="preview" className="bg-gray-700">Preview</option>
                          <option value="development" className="bg-gray-700">Development</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="env-project" className="text-gray-300">Project</Label>
                        <select
                          id="env-project"
                          className="w-full px-3 py-2 h-10 border border-gray-600 bg-gray-700 text-white rounded-md"
                          value={newEnvVar.selectedProjectId}
                          onChange={(e) => setNewEnvVar(prev => ({ ...prev, selectedProjectId: e.target.value }))}
                        >
                          <option value="" className="bg-gray-700">Select a project</option>
                          {projects.map(project => (
                            <option key={project.id} value={project.id} className="bg-gray-700">
                              {project.name.length > 20 ? `${project.name.substring(0, 20)}...` : project.name}
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
                          className="rounded bg-gray-700 border-gray-600 text-blue-500"
                        />
                        <span className="text-sm text-gray-300">Treat as secret (values will be hidden)</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button
                      onClick={addEnvironmentVariable}
                      disabled={!newEnvVar.key || !newEnvVar.value || !newEnvVar.selectedProjectId}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Environment Variable
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {projects.map((project) => (
                  <Card key={project.id} className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-white">
                        <Settings className="h-5 w-5" />
                        <span>{project.name} Environment Variables</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {project.environmentVariables.length > 0 ? (
                        <div className="space-y-3">
                          {project.environmentVariables.map((envVar, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                              <div>
                                <div className="font-medium text-white">{envVar.key}</div>
                                <div className="text-sm text-gray-400">
                                  {envVar.isSecret ? '••••••••' : envVar.value}
                                </div>
                                <Badge variant="outline" className="mt-1 bg-gray-600 text-gray-300 border-gray-500">
                                  {envVar.environment}
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteEnvironmentVariable(project.id, envVar.key, envVar.environment)}
                                className="text-gray-400 hover:text-white"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-400">
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
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <Github className="h-5 w-5" />
                    <span>Deployed Repositories</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    View your deployed GitHub repositories
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {deployedRepos.length > 0 ? (
                    <div className="space-y-3">
                      {deployedRepos
                        .filter(repo => repo.githubUrl)
                        .map((repo) => (
                        <div key={repo.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Github className="h-5 w-5" />
                            <div>
                              <div className="font-medium text-white">{repo.projectName}</div>
                              <div className="text-sm text-gray-400">{repo.githubRepo}</div>
                              <div className="text-xs text-gray-400 mt-1">
                                Deployed: {new Date(repo.deployedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(repo.githubUrl, '_blank')}
                              className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View Repo
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400">
                      No deployed repositories found. Deploy a project to GitHub to see it listed here.
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <FolderOpen className="h-5 w-5" />
                    <span>All Deployed Projects</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    View all your deployed projects across different platforms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {deployedRepos.length > 0 ? (
                    <div className="space-y-3">
                      {deployedRepos.map((repo) => (
                        <div key={repo.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              {repo.githubUrl && <Github className="h-5 w-5 text-gray-400" />}
                              {repo.vercelUrl && <Globe className="h-5 w-5 text-blue-400" />}
                              {repo.netlifyUrl && <Globe className="h-5 w-5 text-green-400" />}
                            </div>
                            <div>
                              <div className="font-medium text-white">{repo.projectName}</div>
                              <div className="text-sm text-gray-400">
                                {repo.githubRepo && <span>GitHub: {repo.githubRepo}</span>}
                                {repo.vercelUrl && <span>Vercel: {repo.vercelUrl.replace(/^https?:\/\//, '')}</span>}
                                {repo.netlifyUrl && <span>Netlify: {repo.netlifyUrl.replace(/^https?:\/\//, '')}</span>}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                Last updated: {new Date(repo.lastUpdated).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {repo.githubUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(repo.githubUrl, '_blank')}
                                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                              >
                                <Github className="h-4 w-4 mr-1" />
                                Repo
                              </Button>
                            )}
                            {repo.vercelUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(repo.vercelUrl!, '_blank')}
                                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                              >
                                <Globe className="h-4 w-4 mr-1 text-blue-400" />
                                Vercel
                              </Button>
                            )}
                            {repo.netlifyUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(repo.netlifyUrl!, '_blank')}
                                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                              >
                                <Globe className="h-4 w-4 mr-1 text-green-400" />
                                Netlify
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400">
                      No deployed projects found.
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