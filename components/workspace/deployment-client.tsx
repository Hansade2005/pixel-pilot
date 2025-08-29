"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { GlobalHeader } from "@/components/workspace/global-header"

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

// Utility function to generate valid GitHub repository names
const generateValidRepoName = (input: string): string => {
  if (!input) return ''

  // Convert to lowercase and replace spaces with hyphens
  let name = input.toLowerCase().replace(/\s+/g, '-')

  // Remove invalid characters (only allow letters, numbers, hyphens, underscores, periods)
  name = name.replace(/[^a-z0-9._-]/g, '')

  // Remove multiple consecutive hyphens, underscores, or periods
  name = name.replace(/[-_.]{2,}/g, (match) => match[0])

  // Remove leading/trailing hyphens, underscores, or periods
  name = name.replace(/^[-_.]+|[-_.]+$/g, '')

  // Ensure it's not empty and doesn't exceed 100 characters
  if (!name) name = 'my-project'
  if (name.length > 100) name = name.substring(0, 100)

  return name
}

export default function DeploymentClient() {
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

  // Token states
  const [savedTokens, setSavedTokens] = useState({
    github: null as any,
    vercel: null as any,
    netlify: null as any,
  })

  // Helper function to extract GitHub repo in owner/repo format
  const getGitHubRepo = (project: Project | null): string | undefined => {
    if (!project?.githubRepoUrl) return undefined
    const match = project.githubRepoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    return match ? `${match[1]}/${match[2]}` : undefined
  }

  // Generate a valid GitHub repository name
  const generateValidRepoName = (projectName: string): string => {
    return projectName
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '-') // Replace invalid characters with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .substring(0, 100) // Limit to 100 characters
      || 'my-project' // Fallback if name becomes empty
  }

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
          repoName: generateValidRepoName(project.name),
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
      const searchParams = new URLSearchParams(window.location.search)
      const oauthSuccess = searchParams.get('oauth_success')
      const accessToken = searchParams.get('access_token')
      const tokenType = searchParams.get('token_type')
      const scope = searchParams.get('scope')
      const error = searchParams.get('error')

      // Handle OAuth errors
      if (error) {
        console.error('GitHub OAuth error:', error)
        toast({
          title: "Connection Failed",
          description: `GitHub OAuth error: ${error}`,
          variant: "destructive"
        })
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname)
        return
      }

      // Handle successful OAuth
      if (oauthSuccess === 'true' && accessToken) {
        try {
          // Save token to storage
          await storageManager.createToken({
            userId: currentUserId,
            provider: 'github',
            token: accessToken
          })

          setSavedTokens(prev => ({ ...prev, github: { token: accessToken } }))
          setGithubForm(prev => ({
            ...prev,
            token: accessToken
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

        } catch (error) {
          console.error('GitHub callback error:', error)
          toast({
            title: "Connection Failed",
            description: "Failed to save GitHub token",
            variant: "destructive"
          })
          setDeploymentState(prev => ({ ...prev, isDeploying: false }))
        }
      }
    }

    handleGitHubCallback()
  }, [projects, currentUserId])

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

      // Load saved tokens
      const [githubToken, vercelToken, netlifyToken] = await Promise.all([
        storageManager.getToken(currentUserId, 'github').catch(() => null),
        storageManager.getToken(currentUserId, 'vercel').catch(() => null),
        storageManager.getToken(currentUserId, 'netlify').catch(() => null),
      ])

      setSavedTokens({
        github: githubToken,
        vercel: vercelToken,
        netlify: netlifyToken,
      })

      // Auto-populate forms with saved tokens
      if (githubToken) {
        setGithubForm(prev => ({ ...prev, token: githubToken.token }))
        setDeploymentState(prev => ({ ...prev, githubConnected: true }))
      }
      if (vercelToken) {
        setVercelForm(prev => ({ ...prev, token: vercelToken.token }))
        setDeploymentState(prev => ({ ...prev, vercelConnected: true }))
      }
      if (netlifyToken) {
        setNetlifyForm(prev => ({ ...prev, token: netlifyToken.token }))
        setDeploymentState(prev => ({ ...prev, netlifyConnected: true }))
      }

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
      // GitHub OAuth App configuration - Fallback credentials
      const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || 'Ov23lihgU0dNPk4ct1Au'
      const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_URL || 'https://dev.pixelways.co'

      const redirectUri = encodeURIComponent(`${APP_DOMAIN}/api/auth/github/oauth-callback`)
      const scope = encodeURIComponent('repo,user')
      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`

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
    if (!selectedProject) {
      toast({
        title: "No Project Selected",
        description: "Please select a project to deploy",
        variant: "destructive"
      })
      return
    }

    if (!githubForm.repoName) {
      toast({
        title: "Repository Name Required",
        description: "Please enter a repository name",
        variant: "destructive"
      })
      return
    }

    if (!githubForm.token) {
      toast({
        title: "Token Required",
        description: "Please provide a GitHub token",
        variant: "destructive"
      })
      return
    }

    // Validate repository name format
    const nameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!nameRegex.test(githubForm.repoName)) {
      toast({
        title: "Invalid Repository Name",
        description: "Repository name can only contain letters, numbers, hyphens, underscores, and periods",
        variant: "destructive"
      })
      return
    }

    if (githubForm.repoName.length > 100) {
      toast({
        title: "Repository Name Too Long",
        description: "Repository name must be 100 characters or less",
        variant: "destructive"
      })
      return
    }

    setDeploymentState(prev => ({ ...prev, isDeploying: true, currentStep: 'connecting' }))

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
        console.error('Repository creation failed:', errorData)

        // Provide specific error messages based on status code
        if (repoResponse.status === 422) {
          toast({
            title: "Repository Creation Failed",
            description: errorData.error || "Repository name may already exist or is invalid. Try using a different name.",
            variant: "destructive"
          })
        } else if (repoResponse.status === 401) {
          toast({
            title: "Authentication Failed",
            description: "Invalid GitHub token. Please check your token and try again.",
            variant: "destructive"
          })
        } else if (repoResponse.status === 403) {
          toast({
            title: "Access Forbidden",
            description: "You don't have permission to create repositories. Check your token permissions.",
            variant: "destructive"
          })
        } else {
          toast({
            title: "Repository Creation Failed",
            description: errorData.error || "Failed to create repository",
            variant: "destructive"
          })
        }

        setDeploymentState(prev => ({ ...prev, isDeploying: false }))
        return
      }

      const repoData = await repoResponse.json()
      setDeploymentState(prev => ({ ...prev, currentStep: 'deploying' }))

      // Update project with GitHub repo URL
      await storageManager.updateWorkspace(selectedProject.id, {
        githubRepoUrl: repoData.url,
        deploymentStatus: 'in_progress',
        lastActivity: new Date().toISOString(),
      })

      // Get all files from the workspace for deployment
      await storageManager.init()
      const projectFiles = await storageManager.getFiles(selectedProject.id)

      if (projectFiles.length === 0) {
        toast({
          title: "No Files Found",
          description: "No files found in the workspace to deploy",
          variant: "destructive"
        })
        setDeploymentState(prev => ({ ...prev, isDeploying: false }))
        return
      }

      // Deploy code to the repository
      const deployResponse = await fetch('/api/github/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoName: githubForm.repoName,
          repoOwner: repoData.fullName.split('/')[0],
          token: githubForm.token,
          workspaceId: selectedProject.id,
          files: projectFiles, // Include files in the request
        })
      })

      if (!deployResponse.ok) {
        const errorData = await deployResponse.json()
        throw new Error(errorData.error || 'Failed to deploy code')
      }

      const deployData = await deployResponse.json()

      // Update project with deployment status
      await storageManager.updateWorkspace(selectedProject.id, {
        deploymentStatus: 'deployed',
        lastActivity: new Date().toISOString(),
      })

      // Create deployment record
      await storageManager.createDeployment({
        workspaceId: selectedProject.id,
        url: repoData.url,
        status: 'ready',
        commitSha: deployData.commitSha || 'initial',
        commitMessage: deployData.commitMessage || 'Repository created and code deployed',
        branch: 'main',
        environment: 'production',
        provider: 'github'
      })

      toast({
        title: 'Deployment Successful',
        description: `Successfully deployed ${deployData.filesUploaded || 'all'} files to ${repoData.url}`
      })
      setDeploymentState(prev => ({ ...prev, isDeploying: false, currentStep: 'complete' }))

    } catch (error) {
      console.error('GitHub deploy error:', error)
      toast({
        title: 'Deployment Failed',
        description: (error as Error).message || 'Failed to deploy to GitHub',
        variant: "destructive"
      })
      setDeploymentState(prev => ({ ...prev, isDeploying: false }))
    }
  }

  // ...existing UI rendering code...
  return (
    <div>
      <GlobalHeader />
      <div className="p-6">
        {/* Deployment Status */}
        {deploymentState.isDeploying && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Deploying...</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${deploymentState.currentStep === 'deploying' ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                  <span className={deploymentState.currentStep === 'deploying' ? 'text-blue-600' : 'text-gray-500'}>
                    Deploying to {activeTab === 'vercel' ? 'Vercel' : activeTab === 'netlify' ? 'Netlify' : 'GitHub'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${deploymentState.currentStep === 'complete' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                  <span className={deploymentState.currentStep === 'complete' ? 'text-green-600' : 'text-gray-500'}>
                    Deployment complete
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Project Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Project</CardTitle>
            <CardDescription>Choose a project to deploy</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedProject?.id || ''} onValueChange={(value) => {
              const project = projects.find(p => p.id === value)
              setSelectedProject(project || null)
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a project to deploy" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Deployment Tabs */}
        <Card>
          <CardContent>
            <Tabs defaultValue="github">
              <TabsList>
                <TabsTrigger value="github">GitHub</TabsTrigger>
                <TabsTrigger value="vercel">Vercel</TabsTrigger>
                <TabsTrigger value="netlify">Netlify</TabsTrigger>
              </TabsList>
              <TabsContent value="github">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="repo-name">Repository Name</Label>
                    <div className="flex space-x-2 mt-1">
                      <Input
                        id="repo-name"
                        value={githubForm.repoName}
                        onChange={(e) => setGithubForm(prev => ({ ...prev, repoName: e.target.value }))}
                        placeholder="my-awesome-project"
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (selectedProject) {
                            const validName = generateValidRepoName(selectedProject.name)
                            setGithubForm(prev => ({ ...prev, repoName: validName }))
                          }
                        }}
                        disabled={!selectedProject}
                      >
                        Generate
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Only letters, numbers, hyphens, underscores, and periods allowed. Max 100 characters.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="repo-description">Repository Description (Optional)</Label>
                    <Textarea
                      id="repo-description"
                      value={githubForm.repoDescription}
                      onChange={(e) => setGithubForm(prev => ({ ...prev, repoDescription: e.target.value }))}
                      placeholder="A brief description of your project"
                      rows={2}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is-private"
                      checked={githubForm.isPrivate}
                      onChange={(e) => setGithubForm(prev => ({ ...prev, isPrivate: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="is-private">Make repository private</Label>
                  </div>

                  <div>
                    <Label htmlFor="github-token">Personal Access Token</Label>
                    <Input
                      id="github-token"
                      type="password"
                      value={githubForm.token}
                      onChange={(e) => setGithubForm(prev => ({ ...prev, token: e.target.value }))}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      className="mt-1"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      <a
                        href="https://github.com/settings/tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Create a Personal Access Token
                      </a> with repo permissions
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={async () => {
                        if (!githubForm.token) {
                          toast({
                            title: "Token Required",
                            description: "Please enter your GitHub token",
                            variant: "destructive"
                          })
                          return
                        }
                        await storageManager.createToken({ userId: currentUserId, provider: 'github', token: githubForm.token })
                        setSavedTokens(prev => ({ ...prev, github: { token: githubForm.token } }))
                        setDeploymentState(prev => ({ ...prev, githubConnected: true }))
                        toast({ title: 'Saved', description: 'GitHub token saved successfully' })
                      }}
                      disabled={!githubForm.token}
                    >
                      Save Token
                    </Button>
                    <Button variant="secondary" onClick={handleGitHubConnect}>
                      Connect via OAuth
                    </Button>
                    <Button
                      variant="default"
                      onClick={handleGitHubDeploy}
                      disabled={deploymentState.isDeploying || !githubForm.repoName || !githubForm.token || !selectedProject}
                    >
                      {deploymentState.isDeploying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deploying...
                        </>
                      ) : (
                        <>
                          <Github className="mr-2 h-4 w-4" />
                          Deploy to GitHub
                        </>
                      )}
                    </Button>
                  </div>

                  {!githubForm.repoName && selectedProject && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <p className="text-sm text-blue-800">
                        💡 Tip: Click "Generate" to auto-create a repository name from your project, or enter a custom name above.
                      </p>
                    </div>
                  )}

                  {githubForm.repoName && !/^[a-zA-Z0-9._-]+$/.test(githubForm.repoName) && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <p className="text-sm text-yellow-800">
                        ⚠️ Repository name contains invalid characters. Only letters, numbers, hyphens, underscores, and periods are allowed.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="vercel">
                <div className="space-y-4">
                  <Label>Vercel Personal Token</Label>
                  <Input value={vercelForm.token} onChange={(e) => setVercelForm(prev => ({ ...prev, token: e.target.value }))} />
                  <Label>Project Name</Label>
                  <Input value={vercelForm.projectName} onChange={(e) => setVercelForm(prev => ({ ...prev, projectName: e.target.value }))} />
                  <div className="flex items-center space-x-2">
                    <Button onClick={async () => {
                      if (!vercelForm.token) return
                      await storageManager.createToken({ userId: currentUserId, provider: 'vercel', token: vercelForm.token })
                      setSavedTokens(prev => ({ ...prev, vercel: { token: vercelForm.token } }))
                      setDeploymentState(prev => ({ ...prev, vercelConnected: true }))
                      toast({ title: 'Saved', description: 'Vercel token saved' })
                    }}>Save Token</Button>
                    <Button variant="default" onClick={async () => {
                      if (!selectedProject || !vercelForm.token) return

                      setDeploymentState(prev => ({ ...prev, isDeploying: true, currentStep: 'deploying' }))

                      try {
                        // Get all files from the workspace for deployment
                        await storageManager.init()
                        const projectFiles = await storageManager.getFiles(selectedProject.id)

                        if (projectFiles.length === 0) {
                          toast({
                            title: "No Files Found",
                            description: "No files found in the workspace to deploy",
                            variant: "destructive"
                          })
                          setDeploymentState(prev => ({ ...prev, isDeploying: false }))
                          return
                        }

                        // Deploy to Vercel
                        const deployResponse = await fetch('/api/vercel/deploy', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            projectName: vercelForm.projectName,
                            framework: vercelForm.framework,
                            token: vercelForm.token,
                            workspaceId: selectedProject.id,
                            githubRepo: selectedProject.githubRepoUrl ? `${githubForm.repoName}` : undefined,
                            files: projectFiles, // Include files in the request
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
                          commitSha: deployData.commitSha || 'initial',
                          commitMessage: 'Deployed to Vercel',
                          branch: 'main',
                          environment: 'production',
                          provider: 'vercel'
                        })

                        toast({ title: 'Deployment Ready', description: 'Successfully deployed to Vercel' })
                        setDeploymentState(prev => ({ ...prev, isDeploying: false, currentStep: 'complete' }))

                      } catch (error) {
                        console.error('Vercel deploy error:', error)
                        toast({ title: 'Deployment Failed', description: (error as Error).message || 'Failed to deploy to Vercel', variant: 'destructive' })
                        setDeploymentState(prev => ({ ...prev, isDeploying: false }))
                      }
                    }} disabled={deploymentState.isDeploying || !vercelForm.token}>
                      {deploymentState.isDeploying ? 'Deploying...' : 'Deploy to Vercel'}
                    </Button>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="netlify">
                <div className="space-y-4">
                  <Label>Netlify Personal Access Token</Label>
                  <Input value={netlifyForm.token} onChange={(e) => setNetlifyForm(prev => ({ ...prev, token: e.target.value }))} />
                  <Label>Site Name</Label>
                  <Input value={netlifyForm.siteName} onChange={(e) => setNetlifyForm(prev => ({ ...prev, siteName: e.target.value }))} />
                  <div className="flex items-center space-x-2">
                    <Button onClick={async () => {
                      if (!netlifyForm.token) return
                      await storageManager.createToken({ userId: currentUserId, provider: 'netlify', token: netlifyForm.token })
                      setSavedTokens(prev => ({ ...prev, netlify: { token: netlifyForm.token } }))
                      setDeploymentState(prev => ({ ...prev, netlifyConnected: true }))
                      toast({ title: 'Saved', description: 'Netlify token saved' })
                    }}>Save Token</Button>
                    <Button variant="default" onClick={async () => {
                      if (!selectedProject || !netlifyForm.token) return

                      setDeploymentState(prev => ({ ...prev, isDeploying: true, currentStep: 'deploying' }))

                      try {
                        // Get all files from the workspace for deployment
                        await storageManager.init()
                        const projectFiles = await storageManager.getFiles(selectedProject.id)

                        if (projectFiles.length === 0) {
                          toast({
                            title: "No Files Found",
                            description: "No files found in the workspace to deploy",
                            variant: "destructive"
                          })
                          setDeploymentState(prev => ({ ...prev, isDeploying: false }))
                          return
                        }

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
                            githubRepo: selectedProject.githubRepoUrl ? `${githubForm.repoName}` : undefined,
                            files: projectFiles, // Include files in the request
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
                          commitSha: deployData.commitSha || 'initial',
                          commitMessage: 'Deployed to Netlify',
                          branch: 'main',
                          environment: 'production',
                          provider: 'netlify'
                        })

                        toast({ title: 'Deployment Ready', description: 'Successfully deployed to Netlify' })
                        setDeploymentState(prev => ({ ...prev, isDeploying: false, currentStep: 'complete' }))

                      } catch (error) {
                        console.error('Netlify deploy error:', error)
                        toast({ title: 'Deployment Failed', description: (error as Error).message || 'Failed to deploy to Netlify', variant: 'destructive' })
                        setDeploymentState(prev => ({ ...prev, isDeploying: false }))
                      }
                    }} disabled={deploymentState.isDeploying || !netlifyForm.token}>
                      {deploymentState.isDeploying ? 'Deploying...' : 'Deploy to Netlify'}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
