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
  Github,
  Globe,
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
  Zap
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { storageManager, type Workspace as Project, type Deployment, type EnvironmentVariable } from "@/lib/storage-manager"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
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

interface ProjectDisplay extends Project {
  url?: string
  platform: 'vercel' | 'netlify' | 'github'
  lastDeployment?: Deployment
  environmentVariables: EnvironmentVariable[]
}

export default function DeploymentPage() {
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project')

  const [activeTab, setActiveTab] = useState("github")
  const [isLoading, setIsLoading] = useState(true)
  const [projects, setProjects] = useState<ProjectDisplay[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>("sample-user")
  const [deploymentState, setDeploymentState] = useState({
    isDeploying: false,
    currentStep: 'idle' as 'idle' | 'connecting' | 'deploying' | 'complete',
    githubConnected: false,
    vercelConnected: false,
    netlifyConnected: false,
  })

  // Form states for each platform
  const [githubForm, setGithubForm] = useState({
    token: '',
    repoName: '',
    repoDescription: '',
    isPrivate: false,
  })

  const [vercelForm, setVercelForm] = useState({
    token: '',
    projectName: '',
    framework: 'nextjs',
  })

  const [netlifyForm, setNetlifyForm] = useState({
    token: '',
    siteName: '',
    buildCommand: 'npm run build',
    publishDir: 'out',
  })

  useEffect(() => {
    getCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUserId) {
      loadData()
    }
  }, [currentUserId])

  useEffect(() => {
    if (projectId && projects.length > 0) {
      const project = projects.find(p => p.id === projectId)
      if (project) {
        setSelectedProject(project)
        // Pre-fill form data
        setGithubForm(prev => ({
          ...prev,
          repoName: project.name.toLowerCase().replace(/\s+/g, '-'),
          repoDescription: project.description || '',
        }))
        setVercelForm(prev => ({
          ...prev,
          projectName: project.name.toLowerCase().replace(/\s+/g, '-'),
        }))
        setNetlifyForm(prev => ({
          ...prev,
          siteName: project.name.toLowerCase().replace(/\s+/g, '-'),
        }))
      }
    }
  }, [projectId, projects])

  // Handle GitHub OAuth callback
  useEffect(() => {
    const handleGitHubCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')

      if (code) {
        try {
          // Exchange code for token
          const tokenResponse = await fetch('/api/auth/github/oauth-callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
          })

          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json()

            // Update GitHub form with token
            setGithubForm(prev => ({
              ...prev,
              token: tokenData.access_token
            }))

            setDeploymentState(prev => ({
              ...prev,
              githubConnected: true,
              isDeploying: false
            }))

            // Restore project selection if it was stored
            const storedProjectId = sessionStorage.getItem('github_oauth_project')
            if (storedProjectId && projects.length > 0) {
              const project = projects.find(p => p.id === storedProjectId)
              if (project) {
                setSelectedProject(project)
              }
            }

            // Clean up sessionStorage
            sessionStorage.removeItem('github_oauth_return_url')
            sessionStorage.removeItem('github_oauth_project')

            toast({
              title: "GitHub Connected",
              description: "Successfully connected to GitHub",
            })

            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        } catch (error) {
          console.error('GitHub callback error:', error)
          toast({
            title: "Connection Failed",
            description: "Failed to connect to GitHub",
            variant: "destructive"
          })
          setDeploymentState(prev => ({ ...prev, isDeploying: false }))
        }
      }
    }

    handleGitHubCallback()
  }, [projects])

  const getCurrentUser = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    } catch (error) {
      console.error('Error getting current user:', error)
    }
  }

  const loadData = async () => {
    try {
      setIsLoading(true)
      await storageManager.init()

      const [projectsData, deployments, envVars] = await Promise.all([
        storageManager.getWorkspaces(currentUserId),
        storageManager.getDeployments(),
        storageManager.getEnvironmentVariables()
      ])

      const projectsWithData: ProjectDisplay[] = projectsData.map(project => {
        const projectDeployments = deployments.filter(d => d.workspaceId === project.id)
        const projectEnvVars = envVars.filter(e => e.workspaceId === project.id)

        const lastDeployment = projectDeployments
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

        let platform: 'vercel' | 'netlify' | 'github' = 'github'
        if (project.vercelDeploymentUrl) platform = 'vercel'
        else if (project.netlifyDeploymentUrl) platform = 'netlify'

        return {
          ...project,
          url: project.vercelDeploymentUrl || project.netlifyDeploymentUrl || project.githubRepoUrl,
          platform,
          lastDeployment,
          environmentVariables: projectEnvVars
        }
      })

      setProjects(projectsWithData)

      // Set default selected project if none specified
      if (!projectId && projectsWithData.length > 0) {
        setSelectedProject(projectsWithData[0])
      }

    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to load deployment data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGitHubConnect = async () => {
    if (!selectedProject) return

    setDeploymentState(prev => ({ ...prev, isDeploying: true, currentStep: 'connecting' }))

    try {
      const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID
      if (!clientId) {
        toast({
          title: "Configuration Error",
          description: "GitHub client ID not configured",
          variant: "destructive"
        })
        setDeploymentState(prev => ({ ...prev, isDeploying: false }))
        return
      }

      const redirectUri = encodeURIComponent(`${window.location.origin}/workspace/deployment`)
      const scope = encodeURIComponent('repo,user')
      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`

      // Store current state in sessionStorage
      sessionStorage.setItem('github_oauth_return_url', window.location.href)
      sessionStorage.setItem('github_oauth_project', selectedProject.id)

      window.location.href = githubAuthUrl

    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to GitHub",
        variant: "destructive"
      })
      setDeploymentState(prev => ({ ...prev, isDeploying: false }))
    }
  }

  const handleGitHubDeploy = async () => {
    if (!selectedProject) return

    setDeploymentState(prev => ({ ...prev, isDeploying: true, currentStep: 'deploying' }))

    try {
      // First create the GitHub repository
      const repoResponse = await fetch('/api/github/create-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: githubForm.repoName,
          description: githubForm.repoDescription,
          private: githubForm.isPrivate,
          token: githubForm.token,
        })
      })

      if (!repoResponse.ok) {
        const errorData = await repoResponse.json()
        throw new Error(errorData.error || 'Failed to create repository')
      }

      const repoData = await repoResponse.json()

      // Update project with GitHub repo URL
      await storageManager.updateWorkspace(selectedProject.id, {
        githubRepoUrl: repoData.html_url,
        deploymentStatus: 'deployed',
        lastActivity: new Date().toISOString(),
      })

      // Deploy code to the repository
      const deployResponse = await fetch('/api/github/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoName: githubForm.repoName,
          repoOwner: githubForm.token ? 'authenticated-user' : 'unknown', // This should be extracted from token
          token: githubForm.token,
          workspaceId: selectedProject.id,
        })
      })

      if (!deployResponse.ok) {
        const errorData = await deployResponse.json()
        throw new Error(errorData.error || 'Failed to deploy code')
      }

      const deployData = await deployResponse.json()

      // Create deployment record
      await storageManager.createDeployment({
        workspaceId: selectedProject.id,
        url: repoData.html_url,
        status: 'ready',
        commitSha: deployData.commitSha || 'initial',
        commitMessage: deployData.commitMessage || 'Repository created and code deployed',
        branch: 'main',
        environment: 'production',
        provider: 'github'
      })

      setDeploymentState(prev => ({ ...prev, currentStep: 'complete' }))

      toast({
        title: "Deployment Complete",
        description: `Repository created at ${repoData.html_url} and code deployed successfully`,
      })

      // Reload data
      await loadData()

    } catch (error) {
      console.error('Deployment error:', error)
      toast({
        title: "Deployment Failed",
        description: error instanceof Error ? error.message : "Failed to create GitHub repository",
        variant: "destructive"
      })
    } finally {
      setDeploymentState(prev => ({ ...prev, isDeploying: false }))
    }
  }

  const handleVercelDeploy = async () => {
    if (!selectedProject) return

    setDeploymentState(prev => ({ ...prev, isDeploying: true, currentStep: 'deploying' }))

    try {
      // Deploy to Vercel
      const deployResponse = await fetch('/api/vercel/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: vercelForm.projectName,
          framework: vercelForm.framework,
          token: vercelForm.token,
          workspaceId: selectedProject.id,
          githubRepo: selectedProject.githubRepoUrl ? selectedProject.githubRepoUrl.replace('https://github.com/', '') : undefined,
        })
      })

      if (!deployResponse.ok) {
        const errorData = await deployResponse.json()
        throw new Error(errorData.error || 'Failed to deploy to Vercel')
      }

      const deployData = await deployResponse.json()

      // Update project with Vercel deployment URL
      await storageManager.updateWorkspace(selectedProject.id, {
        vercelDeploymentUrl: deployData.url,
        deploymentStatus: 'deployed',
        lastActivity: new Date().toISOString(),
      })

      // Create deployment record
      await storageManager.createDeployment({
        workspaceId: selectedProject.id,
        url: deployData.url,
        status: 'ready',
        commitSha: deployData.commitSha || 'vercel-deploy',
        commitMessage: 'Deployed to Vercel',
        branch: 'main',
        environment: 'production',
        provider: 'vercel'
      })

      setDeploymentState(prev => ({ ...prev, currentStep: 'complete' }))

      toast({
        title: "Deployment Complete",
        description: `Successfully deployed to ${deployData.url}`,
      })

      // Reload data
      await loadData()

    } catch (error) {
      console.error('Vercel deployment error:', error)
      toast({
        title: "Deployment Failed",
        description: error instanceof Error ? error.message : "Failed to deploy to Vercel",
        variant: "destructive"
      })
    } finally {
      setDeploymentState(prev => ({ ...prev, isDeploying: false }))
    }
  }

  const handleNetlifyDeploy = async () => {
    if (!selectedProject) return

    setDeploymentState(prev => ({ ...prev, isDeploying: true, currentStep: 'deploying' }))

    try {
      // Deploy to Netlify
      const deployResponse = await fetch('/api/netlify/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteName: netlifyForm.siteName,
          buildCommand: netlifyForm.buildCommand,
          publishDir: netlifyForm.publishDir,
          token: netlifyForm.token,
          workspaceId: selectedProject.id,
          githubRepo: selectedProject.githubRepoUrl ? selectedProject.githubRepoUrl.replace('https://github.com/', '') : undefined,
        })
      })

      if (!deployResponse.ok) {
        const errorData = await deployResponse.json()
        throw new Error(errorData.error || 'Failed to deploy to Netlify')
      }

      const deployData = await deployResponse.json()

      // Update project with Netlify deployment URL
      await storageManager.updateWorkspace(selectedProject.id, {
        netlifyDeploymentUrl: deployData.url,
        deploymentStatus: 'deployed',
        lastActivity: new Date().toISOString(),
      })

      // Create deployment record
      await storageManager.createDeployment({
        workspaceId: selectedProject.id,
        url: deployData.url,
        status: 'ready',
        commitSha: deployData.commitSha || 'netlify-deploy',
        commitMessage: 'Deployed to Netlify',
        branch: 'main',
        environment: 'production',
        provider: 'netlify'
      })

      setDeploymentState(prev => ({ ...prev, currentStep: 'complete' }))

      toast({
        title: "Deployment Complete",
        description: `Successfully deployed to ${deployData.url}`,
      })

      // Reload data
      await loadData()

    } catch (error) {
      console.error('Netlify deployment error:', error)
      toast({
        title: "Deployment Failed",
        description: error instanceof Error ? error.message : "Failed to deploy to Netlify",
        variant: "destructive"
      })
    } finally {
      setDeploymentState(prev => ({ ...prev, isDeploying: false }))
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Ready</Badge>
      case 'building':
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Building</Badge>
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <GlobalHeader />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col space-y-2 mb-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center space-x-2"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Deploy Project</h1>
                <p className="text-muted-foreground">
                  Deploy your project to GitHub, Vercel, or Netlify
                </p>
              </div>
            </div>
          </div>

          {/* Project Selection */}
          {projects.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Select Project</CardTitle>
                <CardDescription>Choose which project to deploy</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project) => (
                    <Card
                      key={project.id}
                      className={`cursor-pointer transition-all ${
                        selectedProject?.id === project.id
                          ? 'ring-2 ring-primary border-primary'
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => setSelectedProject(project)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">{project.name}</h3>
                          <Badge variant="outline">{project.platform}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {project.description || 'No description'}
                        </p>
                        {project.lastDeployment && (
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(project.lastDeployment.status)}
                            <span className="text-xs text-muted-foreground">
                              {new Date(project.lastDeployment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedProject && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 gap-2">
                <TabsTrigger value="github" className="flex items-center space-x-2">
                  <Github className="h-4 w-4" />
                  <span>GitHub</span>
                </TabsTrigger>
                <TabsTrigger value="vercel" className="flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <span>Vercel</span>
                </TabsTrigger>
                <TabsTrigger value="netlify" className="flex items-center space-x-2">
                  <Globe className="h-4 w-4" />
                  <span>Netlify</span>
                </TabsTrigger>
              </TabsList>

              {/* GitHub Tab */}
              <TabsContent value="github" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Github className="h-5 w-5" />
                      <span>Deploy to GitHub</span>
                    </CardTitle>
                    <CardDescription>
                      Create a GitHub repository for your project
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="github-token">GitHub Token</Label>
                        <Input
                          id="github-token"
                          type="password"
                          placeholder="ghp_xxxxxxxxxxxx"
                          value={githubForm.token}
                          onChange={(e) => setGithubForm(prev => ({ ...prev, token: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="repo-name">Repository Name</Label>
                        <Input
                          id="repo-name"
                          placeholder="my-awesome-project"
                          value={githubForm.repoName}
                          onChange={(e) => setGithubForm(prev => ({ ...prev, repoName: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="repo-description">Description</Label>
                      <Textarea
                        id="repo-description"
                        placeholder="A brief description of your project"
                        value={githubForm.repoDescription}
                        onChange={(e) => setGithubForm(prev => ({ ...prev, repoDescription: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is-private"
                        checked={githubForm.isPrivate}
                        onChange={(e) => setGithubForm(prev => ({ ...prev, isPrivate: e.target.checked }))}
                      />
                      <Label htmlFor="is-private">Private repository</Label>
                    </div>
                    <div className="flex space-x-4">
                      <Button
                        onClick={handleGitHubConnect}
                        disabled={!githubForm.token || deploymentState.isDeploying}
                        variant="outline"
                      >
                        {deploymentState.isDeploying && deploymentState.currentStep === 'connecting' ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Github className="h-4 w-4 mr-2" />
                        )}
                        Connect to GitHub
                      </Button>
                      <Button
                        onClick={handleGitHubDeploy}
                        disabled={!githubForm.token || !githubForm.repoName || !deploymentState.githubConnected || deploymentState.isDeploying}
                      >
                        {deploymentState.isDeploying && deploymentState.currentStep === 'deploying' ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Rocket className="h-4 w-4 mr-2" />
                        )}
                        Create Repository
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Vercel Tab */}
              <TabsContent value="vercel" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Zap className="h-5 w-5" />
                      <span>Deploy to Vercel</span>
                    </CardTitle>
                    <CardDescription>
                      Deploy your project to Vercel for fast, global hosting
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="vercel-token">Vercel Token</Label>
                        <Input
                          id="vercel-token"
                          type="password"
                          placeholder="vercel_xxxxxxxxxxxx"
                          value={vercelForm.token}
                          onChange={(e) => setVercelForm(prev => ({ ...prev, token: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="project-name">Project Name</Label>
                        <Input
                          id="project-name"
                          placeholder="my-awesome-project"
                          value={vercelForm.projectName}
                          onChange={(e) => setVercelForm(prev => ({ ...prev, projectName: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="framework">Framework</Label>
                      <select
                        id="framework"
                        className="w-full px-3 py-2 border border-input bg-background rounded-md"
                        value={vercelForm.framework}
                        onChange={(e) => setVercelForm(prev => ({ ...prev, framework: e.target.value }))}
                      >
                        <option value="nextjs">Next.js</option>
                        <option value="react">React</option>
                        <option value="vue">Vue.js</option>
                        <option value="angular">Angular</option>
                        <option value="svelte">Svelte</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <Button
                      onClick={handleVercelDeploy}
                      disabled={!vercelForm.token || !vercelForm.projectName || deploymentState.isDeploying}
                      className="w-full"
                    >
                      {deploymentState.isDeploying ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Rocket className="h-4 w-4 mr-2" />
                      )}
                      Deploy to Vercel
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Netlify Tab */}
              <TabsContent value="netlify" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Globe className="h-5 w-5" />
                      <span>Deploy to Netlify</span>
                    </CardTitle>
                    <CardDescription>
                      Deploy your project to Netlify with continuous deployment
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="netlify-token">Netlify Token</Label>
                        <Input
                          id="netlify-token"
                          type="password"
                          placeholder="netlify_xxxxxxxxxxxx"
                          value={netlifyForm.token}
                          onChange={(e) => setNetlifyForm(prev => ({ ...prev, token: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="site-name">Site Name</Label>
                        <Input
                          id="site-name"
                          placeholder="my-awesome-site"
                          value={netlifyForm.siteName}
                          onChange={(e) => setNetlifyForm(prev => ({ ...prev, siteName: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="build-command">Build Command</Label>
                        <Input
                          id="build-command"
                          placeholder="npm run build"
                          value={netlifyForm.buildCommand}
                          onChange={(e) => setNetlifyForm(prev => ({ ...prev, buildCommand: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="publish-dir">Publish Directory</Label>
                        <Input
                          id="publish-dir"
                          placeholder="dist"
                          value={netlifyForm.publishDir}
                          onChange={(e) => setNetlifyForm(prev => ({ ...prev, publishDir: e.target.value }))}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleNetlifyDeploy}
                      disabled={!netlifyForm.token || !netlifyForm.siteName || deploymentState.isDeploying}
                      className="w-full"
                    >
                      {deploymentState.isDeploying ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Rocket className="h-4 w-4 mr-2" />
                      )}
                      Deploy to Netlify
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {!selectedProject && projects.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Projects Found</h3>
                <p className="text-muted-foreground mb-4">
                  Create a project first before deploying
                </p>
                <Button onClick={() => router.push('/workspace')}>
                  Go to Workspace
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
