"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  Zap,
  Activity,
  Calendar,
  Users,
  Monitor,
  Smartphone,
  Sun,
  Moon,
  Search,
  Filter,
  History,
  Play,
  Pause,
  SkipForward,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Timer,
  TrendingUp,
  BarChart3,
  Layers,
  Server,
  Code,
  Palette,
  Keyboard,
  Command,
  Home,
  FolderOpen,
  ChevronRight,
  Star,
  GitPullRequest,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Clock3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Building,
  Building2,
  Globe2,
  Shield,
  ShieldCheck,
  ShieldX,
  Target,
  Navigation,
  MapPin,
  User,
  Crown,
  Sparkles,
  Wand2,
  Lightbulb,
  HelpCircle,
  BookOpen,
  Settings2,
  MoreHorizontal,
  Download,
  Upload,
  Copy,
  Share,
  Heart,
  ThumbsUp,
  Zap as ZapIcon,
  Cpu,
  HardDrive,
  Wifi as WifiIcon,
  Battery,
  Signal
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { storageManager, type Workspace as Project, type Deployment, type EnvironmentVariable } from "@/lib/storage-manager"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { DeploymentSetupAccordion } from "@/components/workspace/deployment-setup-accordion"

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

interface DeploymentHistory {
  id: string
  projectId: string
  commitSha: string
  commitMessage: string
  branch: string
  environment: 'development' | 'staging' | 'production'
  status: 'success' | 'failed' | 'in_progress' | 'cancelled'
  provider: 'github' | 'vercel' | 'netlify'
  url?: string
  buildTime?: number
  createdAt: string
  logs?: string[]
}

interface Environment {
  id: string
  name: string
  type: 'development' | 'staging' | 'production'
  url?: string
  status: 'active' | 'inactive' | 'building'
  lastDeployed?: string
  branch: string
}

interface PerformanceMetrics {
  totalDeployments: number
  successRate: number
  averageBuildTime: number
  lastDeploymentTime: string
  uptime: number
  responseTime: number
}

interface QuickStats {
  deploymentsCount: number
  lastDeploymentTime: string
  activeEnvironments: number
  totalProjects: number
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
    githubRepoUrl: '',
  })

  const [netlifyForm, setNetlifyForm] = useState({
    token: '',
    siteName: '',
    buildCommand: 'npm run build',
    publishDir: 'out',
    githubRepoUrl: '',
  })

  const [pipilotForm, setPipilotForm] = useState({
    subdomain: '',
  })

  const [pipilotConfig, setPipilotConfig] = useState<{
    configured: boolean
    message: string
    accountName?: string
  } | null>(null)

  // Enhanced state variables
  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [deploymentHistory, setDeploymentHistory] = useState<DeploymentHistory[]>([])
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null)
  const [quickStats, setQuickStats] = useState<QuickStats>({
    deploymentsCount: 0,
    lastDeploymentTime: '',
    activeEnvironments: 0,
    totalProjects: 0
  })
  const [selectedEnvironment, setSelectedEnvironment] = useState<Environment | null>(null)
  const [buildLogs, setBuildLogs] = useState<string[]>([])
  const [isStreamingLogs, setIsStreamingLogs] = useState(false)
  const [deploymentProgress, setDeploymentProgress] = useState(0)
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null)
  const [keyboardShortcuts, setKeyboardShortcuts] = useState(false)

  // Missing state variables that were removed
  const [savedTokens, setSavedTokens] = useState<{
    github?: { token: string }
    vercel?: { token: string }
    netlify?: { token: string }
  }>({})
  const [deployedRepos, setDeployedRepos] = useState<DeployedRepo[]>([])
  const [availableRepos, setAvailableRepos] = useState<GitHubRepo[]>([])
  const [selectedRepoForVercel, setSelectedRepoForVercel] = useState<string>('')
  const [selectedRepoForNetlify, setSelectedRepoForNetlify] = useState<string>('')

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

  // Generate a unique Netlify site name
  const generateUniqueSiteName = (projectName: string): string => {
    const baseName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-') // Replace invalid characters with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .substring(0, 50) // Leave room for suffix
      || 'my-site' // Fallback if name becomes empty

    // Add timestamp suffix to ensure uniqueness
    const timestamp = Date.now().toString().slice(-4) // Last 4 digits of timestamp
    return `${baseName}-${timestamp}`
  }

  // Generate a unique Vercel project name
  const generateUniqueProjectName = (projectName: string): string => {
    const baseName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-') // Replace invalid characters with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .substring(0, 45) // Leave room for suffix (Vercel max is 52)
      || 'my-project' // Fallback if name becomes empty

    // Add timestamp suffix to ensure uniqueness
    const timestamp = Date.now().toString().slice(-4) // Last 4 digits of timestamp
    return `${baseName}-${timestamp}`
  }

  // Enhanced utility functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'ready':
      case 'deployed':
        return 'bg-green-500'
      case 'failed':
      case 'error':
        return 'bg-red-500'
      case 'in_progress':
      case 'building':
        return 'bg-blue-500'
      case 'cancelled':
        return 'bg-gray-500'
      default:
        return 'bg-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'ready':
      case 'deployed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'failed':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'in_progress':
      case 'building':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      case 'cancelled':
        return <Minus className="h-4 w-4 text-gray-600" />
      default:
        return <Clock3 className="h-4 w-4 text-gray-600" />
    }
  }

  const formatBuildTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const calculateQuickStats = async () => {
    try {
      const deployments = await storageManager.getDeployments()
      const projects = await storageManager.getWorkspaces(currentUserId)

      const stats: QuickStats = {
        deploymentsCount: deployments.length,
        lastDeploymentTime: deployments.length > 0
          ? new Date(Math.max(...deployments.map(d => new Date(d.createdAt || 0).getTime()))).toLocaleString()
          : 'Never',
        activeEnvironments: environments.filter(env => env.status === 'active').length,
        totalProjects: projects.length
      }

      setQuickStats(stats)
    } catch (error) {
      console.error('Error calculating quick stats:', error)
    }
  }

  const loadDeploymentHistory = async () => {
    try {
      const deployments = await storageManager.getDeployments()
      const history: DeploymentHistory[] = deployments.map(deployment => ({
        id: deployment.id,
        projectId: deployment.workspaceId,
        commitSha: deployment.commitSha || 'unknown',
        commitMessage: deployment.commitMessage || 'No message',
        branch: deployment.branch || 'main',
        environment: deployment.environment as 'development' | 'staging' | 'production' || 'production',
        status: deployment.status as 'success' | 'failed' | 'in_progress' | 'cancelled' || 'success',
        provider: deployment.provider as 'github' | 'vercel' | 'netlify' || 'github',
        url: deployment.url,
        buildTime: Math.floor(Math.random() * 300) + 30, // Mock build time
        createdAt: deployment.createdAt || new Date().toISOString(),
        logs: []
      }))

      setDeploymentHistory(history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    } catch (error) {
      console.error('Error loading deployment history:', error)
    }
  }

  const initializeEnvironments = () => {
    const defaultEnvironments: Environment[] = [
      {
        id: 'dev',
        name: 'Development',
        type: 'development',
        status: 'active',
        branch: 'develop',
        lastDeployed: new Date().toISOString()
      },
      {
        id: 'staging',
        name: 'Staging',
        type: 'staging',
        status: 'active',
        branch: 'staging',
        lastDeployed: new Date().toISOString()
      },
      {
        id: 'prod',
        name: 'Production',
        type: 'production',
        status: 'active',
        branch: 'main',
        lastDeployed: new Date().toISOString()
      }
    ]
    setEnvironments(defaultEnvironments)
  }

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'k':
            event.preventDefault()
            setKeyboardShortcuts(!keyboardShortcuts)
            break
          case 'r':
            event.preventDefault()
            if (selectedProject) {
              // Refresh deployment status
              loadData()
            }
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [keyboardShortcuts, selectedProject])

  // Initialize enhanced features
  useEffect(() => {
    if (currentUserId) {
      calculateQuickStats()
      loadDeploymentHistory()
      initializeEnvironments()
      checkPipilotConfig() // Check PiPilot configuration
    }
  }, [currentUserId])

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
    } catch (error) {
      console.error('Error loading deployed repos:', error)
    }
  }

  // Load available GitHub repositories
  const loadAvailableRepos = async () => {
    if (!githubForm.token) return

    try {
      const response = await fetch('/api/github/repos', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${githubForm.token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const repos = await response.json()
        setAvailableRepos(repos)
      }
    } catch (error) {
      console.error('Error loading GitHub repos:', error)
    }
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

  // Check PiPilot configuration
  const checkPipilotConfig = async () => {
    try {
      const response = await fetch('/api/deploy/config-check')
      const data = await response.json()
      setPipilotConfig(data)
    } catch (error) {
      console.error('Failed to check PiPilot configuration:', error)
      setPipilotConfig({
        configured: false,
        message: 'Failed to check deployment configuration.'
      })
    }
  }

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
        github: githubToken ? { token: githubToken.token } : undefined,
        vercel: vercelToken ? { token: vercelToken.token } : undefined,
        netlify: netlifyToken ? { token: netlifyToken.token } : undefined,
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

      // Load deployed repositories for dropdowns
      await loadDeployedRepos()

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

  const handleVercelConnect = async () => {
    toast({
      title: "Vercel OAuth Not Available",
      description: "Please use a Personal Access Token instead. Follow the setup instructions above.",
      variant: "default"
    })
  }

  const handleNetlifyConnect = async () => {
    toast({
      title: "Netlify OAuth Not Available",
      description: "Please use a Personal Access Token instead. Follow the setup instructions above.",
      variant: "default"
    })
  }

  const handlePiPilotDeploy = async () => {
    if (!selectedProject) {
      toast({
        title: "No Project Selected",
        description: "Please select a project to deploy",
        variant: "destructive"
      })
      return
    }

    if (!pipilotForm.subdomain) {
      toast({
        title: "Subdomain Required",
        description: "Please enter a subdomain name",
        variant: "destructive"
      })
      return
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
    if (!subdomainRegex.test(pipilotForm.subdomain)) {
      toast({
        title: "Invalid Subdomain",
        description: "Subdomain can only contain letters, numbers, and hyphens. Cannot start or end with a hyphen.",
        variant: "destructive"
      })
      return
    }

    if (pipilotForm.subdomain.length < 3 || pipilotForm.subdomain.length > 63) {
      toast({
        title: "Invalid Subdomain Length",
        description: "Subdomain must be between 3 and 63 characters",
        variant: "destructive"
      })
      return
    }

    setDeploymentState(prev => ({ ...prev, isDeploying: true, currentStep: 'connecting' }))

    try {
      // Get project files from storage
      await storageManager.init()
      const files = await storageManager.getFiles(selectedProject.id)

      if (!files || files.length === 0) {
        throw new Error('No files found in project')
      }

      // Deploy to PiPilot
      const response = await fetch('/api/deploy/wildcard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedProject.id,
          subdomain: pipilotForm.subdomain,
          files: files,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to deploy to PiPilot')
      }

      const result = await response.json()

      // Record deployment in local storage
      await storageManager.createDeployment({
        workspaceId: selectedProject.id,
        url: result.url,
        status: 'ready',
        provider: 'pipilot',
        environment: 'production',
        externalId: pipilotForm.subdomain
      })

      // Reload deployment history
      await loadDeploymentHistory()

      // Reload Cloudflare projects list
      await loadDeployedRepos()

      toast({
        title: 'Deployment Successful',
        description: `Successfully deployed to PiPilot at ${result.url}`
      })

      setDeploymentState(prev => ({ ...prev, isDeploying: false, currentStep: 'complete' }))

    } catch (error) {
      console.error('PiPilot deploy error:', error)

      let errorMessage = 'Failed to deploy to PiPilot'
      let errorTitle = 'Deployment Failed'

      try {
        const errorResponse = JSON.parse((error as Error).message)
        if (errorResponse.error) {
          errorMessage = errorResponse.error
        }
      } catch (parseError) {
        // If parsing fails, use the original error message
        errorMessage = (error as Error).message || errorMessage
      }

      // Provide specific guidance for common configuration errors
      if (errorMessage.includes('Cloudflare credentials not configured')) {
        errorTitle = 'Configuration Error'
        errorMessage = 'PiPilot deployment is not configured. Please contact the administrator to set up Cloudflare API credentials.'
      } else if (errorMessage.includes('Cloudflare API error')) {
        errorTitle = 'API Error'
        errorMessage = 'Failed to connect to Cloudflare. Please try again or contact support if the issue persists.'
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive'
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
        githubRepoName: repoData.name || githubForm.repoName,
        deploymentStatus: 'in_progress',
        lastActivity: new Date().toISOString(),
      })

      // Refresh projects list to include updated workspace
      const updatedProjects = await storageManager.getWorkspaces(currentUserId)
      const projectsWithDisplay: ProjectDisplay[] = updatedProjects.map(project => ({
        ...project,
        url: project.vercelDeploymentUrl || project.netlifyDeploymentUrl || project.githubRepoUrl,
        platform: (project.vercelDeploymentUrl ? 'vercel' : project.netlifyDeploymentUrl ? 'netlify' : 'github') as 'vercel' | 'netlify' | 'github',
        lastDeployment: undefined,
        environmentVariables: []
      }))
      setProjects(projectsWithDisplay)

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

      // Reload deployed repos to update dropdowns
      await loadDeployedRepos()

      // Reload deployment history to update UI
      await loadDeploymentHistory()

      // Save deployed repo information
      const deployedRepo: DeployedRepo = {
        id: `github_${selectedProject.id}_${Date.now()}`,
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        githubUrl: repoData.url,
        githubRepo: `${repoData.fullName}`,
        deployedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      }

      setDeployedRepos(prev => {
        const existing = prev.find(r => r.projectId === selectedProject.id)
        if (existing) {
          return prev.map(r => r.projectId === selectedProject.id ? { ...r, ...deployedRepo } : r)
        }
        return [...prev, deployedRepo]
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

  return (
    <TooltipProvider>
      {/* Always use dark mode by removing the conditional class */}
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Enhanced Header with Project Context */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Breadcrumb Navigation */}
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/" className="flex items-center space-x-2">
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/workspace">Projects</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="flex items-center space-x-2">
                    <FolderOpen className="h-4 w-4" />
                    <span>{selectedProject?.name && selectedProject.name.length > 12 ? `${selectedProject.name.substring(0, 12)}...` : selectedProject?.name || 'Select Project'}</span>
                  </BreadcrumbPage>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Deployments</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {/* Header Actions - Remove Dark Mode Toggle */}
            <div className="flex items-center space-x-4">
              {/* Keyboard Shortcuts */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setKeyboardShortcuts(!keyboardShortcuts)}
                    className="h-8 w-8 p-0"
                  >
                    <Keyboard className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Keyboard shortcuts: {keyboardShortcuts ? 'ON' : 'OFF'}</p>
                </TooltipContent>
              </Tooltip>

              {/* Help */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Help & Documentation</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <Rocket className="h-4 w-4 text-blue-400" />
                  <div>
                    <p className="text-sm font-medium">Deployments</p>
                    <p className="text-2xl font-bold">{quickStats.deploymentsCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-green-400" />
                  <div>
                    <p className="text-sm font-medium">Last Deploy</p>
                    <p className="text-sm font-bold">
                      {quickStats.lastDeploymentTime === 'Never' ? 'Never' : new Date(quickStats.lastDeploymentTime).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <Server className="h-4 w-4 text-purple-400" />
                  <div>
                    <p className="text-sm font-medium">Active Environments</p>
                    <p className="text-2xl font-bold">{quickStats.activeEnvironments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <FolderOpen className="h-4 w-4 text-orange-400" />
                  <div>
                    <p className="text-sm font-medium">Total Projects</p>
                    <p className="text-2xl font-bold">{quickStats.totalProjects}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="p-6">
          {/* First-time User Wizard */}
          {showWizard && (
            <Dialog open={showWizard} onOpenChange={setShowWizard}>
              <DialogContent className="max-w-2xl bg-gray-800 border-gray-700 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2 text-white">
                    <Sparkles className="h-5 w-5 text-yellow-400" />
                    <span>Welcome to Deployment Center!</span>
                  </DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Let's get you set up with your first deployment in {wizardStep} easy steps.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  {wizardStep === 1 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">Step 1: Select Your Project</h3>
                      <p className="text-sm text-gray-400">
                        Choose the project you want to deploy from the dropdown above.
                      </p>
                      <div className="bg-blue-900 p-4 rounded-lg">
                        <p className="text-sm text-blue-300">
                          💡 <strong>Tip:</strong> If you haven't created a project yet, go back to the workspace and create one first.
                        </p>
                      </div>
                    </div>
                  )}
                  {wizardStep === 2 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">Step 2: Choose Your Platform</h3>
                      <p className="text-sm text-gray-400">
                        Select GitHub, Vercel, or Netlify based on your deployment needs.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="text-center p-4 border border-gray-700 rounded-lg hover:bg-gray-700 cursor-pointer bg-gray-800">
                          <Github className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p className="font-medium text-white">GitHub</p>
                          <p className="text-xs text-gray-400">Code Repository</p>
                        </div>
                        <div className="text-center p-4 border border-gray-700 rounded-lg hover:bg-gray-700 cursor-pointer bg-gray-800">
                          <Globe className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                          <p className="font-medium text-white">Vercel</p>
                          <p className="text-xs text-gray-400">Frontend Hosting</p>
                        </div>
                        <div className="text-center p-4 border border-gray-700 rounded-lg hover:bg-gray-700 cursor-pointer bg-gray-800">
                          <Globe2 className="h-8 w-8 mx-auto mb-2 text-green-400" />
                          <p className="font-medium text-white">Netlify</p>
                          <p className="text-xs text-gray-400">Static Hosting</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {wizardStep === 3 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">Step 3: Configure & Deploy</h3>
                      <p className="text-sm text-gray-400">
                        Fill in the required information and click deploy. We'll handle the rest!
                      </p>
                      <div className="bg-green-900 p-4 rounded-lg">
                        <p className="text-sm text-green-300">
                          ✅ <strong>Ready to deploy!</strong> Your project will be live in minutes.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setWizardStep(Math.max(1, wizardStep - 1))}
                    disabled={wizardStep === 1}
                    className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => {
                      if (wizardStep < 3) {
                        setWizardStep(wizardStep + 1)
                      } else {
                        setShowWizard(false)
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {wizardStep === 3 ? 'Get Started' : 'Next'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Enhanced Project Selection */}
          <Card className="mb-6 bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <Target className="h-5 w-5" />
                <span>Project Selection</span>
              </CardTitle>
              <CardDescription className="text-gray-400">
                Choose a project to deploy. Need help getting started?
                <Button
                  variant="link"
                  className="p-0 h-auto ml-1 text-blue-400 hover:text-blue-300"
                  onClick={() => setShowWizard(true)}
                >
                  View Setup Guide
                </Button>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Select value={selectedProject?.id || ''} onValueChange={(value) => {
                  const project = projects.find(p => p.id === value)
                  setSelectedProject(project || null)
                }}>
                  <SelectTrigger className="flex-1 bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Choose a project to deploy" className="text-gray-400">
                      {selectedProject && (
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-gray-600 text-white">
                              {selectedProject?.name?.charAt(0).toUpperCase() || 'P'}
                            </AvatarFallback>
                          </Avatar>
                          <span>{selectedProject?.name || 'Select a project'}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id} className="text-gray-300 hover:bg-gray-600">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-gray-600 text-white">
                              {project.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{project.name.length > 12 ? `${project.name.substring(0, 12)}...` : project.name}</span>
                          <Badge variant="outline" className="text-xs border-gray-500 text-gray-300">
                            {project.platform}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProject && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-700 border-gray-600 text-white">
                      <p>Project Settings</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </CardContent>
          </Card>

        {/* Interactive Deployment Cards */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">Choose Deployment Platform</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* GitHub Card */}
            <Card
              className={`bg-gray-800 border-gray-700 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                activeTab === 'github' ? 'ring-2 ring-blue-500 shadow-lg' : ''
              }`}
              onClick={() => setActiveTab('github')}
            >
              <CardHeader className="text-center">
                <div className="flex justify-center mb-2">
                  <div className={`p-3 rounded-full ${activeTab === 'github' ? 'bg-blue-900' : 'bg-gray-700'}`}>
                    <Github className={`h-8 w-8 ${activeTab === 'github' ? 'text-blue-400' : 'text-gray-300'}`} />
                  </div>
                </div>
                <CardTitle className="flex items-center justify-center space-x-2 text-white">
                  <span>GitHub</span>
                  {deploymentState.githubConnected && (
                    <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-gray-400">Host your code repository</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-center space-x-2">
                    <GitBranch className="h-4 w-4" />
                    <span>Version control</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>Collaboration</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>Private repos</span>
                  </div>
                </div>
                {selectedProject?.githubRepoUrl && (
                  <div className="mt-4 p-2 bg-green-900 rounded-lg">
                    <p className="text-xs text-green-300 flex items-center">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Repository connected
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vercel Card */}
            <Card
              className={`bg-gray-800 border-gray-700 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                activeTab === 'vercel' ? 'ring-2 ring-blue-500 shadow-lg' : ''
              }`}
              onClick={() => setActiveTab('vercel')}
            >
              <CardHeader className="text-center">
                <div className="flex justify-center mb-2">
                  <div className={`p-3 rounded-full ${activeTab === 'vercel' ? 'bg-blue-900' : 'bg-gray-700'}`}>
                    <Globe className={`h-8 w-8 ${activeTab === 'vercel' ? 'text-blue-400' : 'text-gray-300'}`} />
                  </div>
                </div>
                <CardTitle className="flex items-center justify-center space-x-2 text-white">
                  <span>Vercel</span>
                  {deploymentState.vercelConnected && (
                    <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-gray-400">Deploy frontend applications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4" />
                    <span>Global CDN</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4" />
                    <span>Analytics</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <GitBranch className="h-4 w-4" />
                    <span>Preview deploys</span>
                  </div>
                </div>
                {selectedProject?.vercelDeploymentUrl && (
                  <div className="mt-4 p-2 bg-green-900 rounded-lg">
                    <p className="text-xs text-green-300 flex items-center">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Deployed at{' '}
                      <a
                        href={selectedProject?.vercelDeploymentUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline ml-1"
                      >
                        {selectedProject?.vercelDeploymentUrl || 'Not deployed'}
                      </a>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Netlify Card */}
            <Card
              className={`bg-gray-800 border-gray-700 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                activeTab === 'netlify' ? 'ring-2 ring-blue-500 shadow-lg' : ''
              }`}
              onClick={() => setActiveTab('netlify')}
            >
              <CardHeader className="text-center">
                <div className="flex justify-center mb-2">
                  <div className={`p-3 rounded-full ${activeTab === 'netlify' ? 'bg-green-900' : 'bg-gray-700'}`}>
                    <Globe2 className={`h-8 w-8 ${activeTab === 'netlify' ? 'text-green-400' : 'text-gray-300'}`} />
                  </div>
                </div>
                <CardTitle className="flex items-center justify-center space-x-2 text-white">
                  <span>Netlify</span>
                  {deploymentState.netlifyConnected && (
                    <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-gray-400">Deploy static sites & SPAs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-center space-x-2">
                    <Server className="h-4 w-4" />
                    <span>Static hosting</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <GitBranch className="h-4 w-4" />
                    <span>Branch deploys</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>SSL included</span>
                  </div>
                </div>
                {selectedProject?.netlifyDeploymentUrl && (
                  <div className="mt-4 p-2 bg-green-900 rounded-lg">
                    <p className="text-xs text-green-300 flex items-center">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Deployed at{' '}
                      <a
                        href={selectedProject?.netlifyDeploymentUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline ml-1"
                      >
                        {selectedProject?.netlifyDeploymentUrl || 'Not deployed'}
                      </a>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* PiPilot Card */}
            <Card
              className={`bg-gray-800 border-gray-700 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                activeTab === 'pipilot' ? 'ring-2 ring-purple-500 shadow-lg' : ''
              }`}
              onClick={() => setActiveTab('pipilot')}
            >
              <CardHeader className="text-center">
                <div className="flex justify-center mb-2">
                  <div className={`p-3 rounded-full ${activeTab === 'pipilot' ? 'bg-purple-900' : 'bg-gray-700'}`}>
                    <Rocket className={`h-8 w-8 ${activeTab === 'pipilot' ? 'text-purple-400' : 'text-gray-300'}`} />
                  </div>
                </div>
                <CardTitle className="flex items-center justify-center space-x-2 text-white">
                  <span>PiPilot</span>
                  <Badge variant="secondary" className="text-xs bg-purple-900 text-purple-300">
                    <Zap className="h-3 w-3 mr-1" />
                    Fast
                  </Badge>
                </CardTitle>
                <CardDescription className="text-gray-400">Deploy to custom subdomain</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4" />
                    <span>yourproject.pages.dev</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4" />
                    <span>Instant deployment</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>Free hosting</span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-purple-900/20 rounded-lg border border-purple-700">
                  <p className="text-xs text-purple-300 flex items-center">
                    <Rocket className="h-3 w-3 mr-1" />
                    Deploy directly to your custom subdomain
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Enhanced Status System */}
        {deploymentState.isDeploying && (
          <Card className="mb-6 bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <div className="animate-pulse">
                  <Building className="h-5 w-5 text-blue-400" />
                </div>
                <span>Deployment in Progress</span>
                {estimatedTime && (
                  <Badge variant="outline" className="ml-auto bg-gray-700 text-gray-300 border-gray-600">
                    <Timer className="h-3 w-3 mr-1" />
                    ~{formatBuildTime(estimatedTime || 0)}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Animated Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>Progress</span>
                    <span>{deploymentProgress}%</span>
                  </div>
                  <Progress value={deploymentProgress} className="h-2" />
                </div>

                {/* Status Steps */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${deploymentState.currentStep === 'connecting' ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}>
                      {deploymentState.currentStep !== 'connecting' && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                    <span className={`text-sm ${deploymentState.currentStep === 'connecting' ? 'text-blue-400 font-medium' : 'text-gray-400'}`}>
                      Connecting to {activeTab === 'vercel' ? 'Vercel' : activeTab === 'netlify' ? 'Netlify' : 'GitHub'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${deploymentState.currentStep === 'deploying' ? 'bg-blue-500 animate-pulse' : deploymentState.currentStep === 'complete' ? 'bg-green-500' : 'bg-gray-600'}`}>
                      {deploymentState.currentStep === 'complete' && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                    <span className={`text-sm ${deploymentState.currentStep === 'deploying' ? 'text-blue-400 font-medium' : deploymentState.currentStep === 'complete' ? 'text-green-400' : 'text-gray-400'}`}>
                      Deploying your application
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${deploymentState.currentStep === 'complete' ? 'bg-green-500' : 'bg-gray-600'}`}>
                      {deploymentState.currentStep === 'complete' && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                    <span className={`text-sm ${deploymentState.currentStep === 'complete' ? 'text-green-400 font-medium' : 'text-gray-400'}`}>
                      Deployment complete
                    </span>
                  </div>
                </div>

                {/* Build Logs Streaming */}
                {isStreamingLogs && buildLogs.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-300">Build Logs</span>
                      <Button variant="ghost" size="sm" onClick={() => setIsStreamingLogs(false)} className="text-gray-400 hover:text-white">
                        <EyeOff className="h-4 w-4" />
                      </Button>
                    </div>
                    <ScrollArea className="h-32 w-full rounded-md border border-gray-700 p-2 bg-gray-900">
                      <div className="text-xs font-mono space-y-1">
                        {buildLogs.map((log, index) => (
                          <div key={index} className="text-gray-300">
                            {log}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="mb-6 bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            {/* Search and Filter Bar - Make responsive for mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search deployments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full sm:w-64 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-32 bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="All Status" className="text-gray-400" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="all" className="text-gray-300 hover:bg-gray-600">All Status</SelectItem>
                    <SelectItem value="success" className="text-gray-300 hover:bg-gray-600">Success</SelectItem>
                    <SelectItem value="failed" className="text-gray-300 hover:bg-gray-600">Failed</SelectItem>
                    <SelectItem value="in_progress" className="text-gray-300 hover:bg-gray-600">In Progress</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" size="sm" className="w-full sm:w-auto bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                  <History className="h-4 w-4 mr-2" />
                  Deployment History
                </Button>
                <Button variant="outline" size="sm" className="w-full sm:w-auto bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                  <Settings className="h-4 w-4 mr-2" />
                  Environments
                </Button>
              </div>
            </div>

            {/* GitHub Deployment Form */}
            {activeTab === 'github' && (
              <div className="space-y-6">
                {/* Connection Status */}
                <Alert className="bg-gray-700 border-gray-600">
                  <Info className="h-4 w-4 text-blue-400" />
                  <AlertDescription className="text-gray-300">
                    {deploymentState.githubConnected ? (
                      <span className="flex items-center">
                        <CheckCircle2 className="h-4 w-4 text-green-400 mr-2" />
                        Connected to GitHub
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <AlertCircle className="h-4 w-4 text-yellow-400 mr-2" />
                        Not connected to GitHub. Please provide your token below.
                      </span>
                    )}
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="repo-name" className="flex items-center space-x-2 text-gray-300">
                        <span>Repository Name</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-700 border-gray-600 text-white">
                            <p>Choose a unique name for your repository</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <div className="flex space-x-2 mt-1">
                        <Input
                          id="repo-name"
                          value={githubForm.repoName}
                          onChange={(e) => setGithubForm(prev => ({ ...prev, repoName: e.target.value }))}
                          placeholder="my-awesome-project"
                          className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
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
                          className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                        >
                          Generate
                        </Button>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        Only letters, numbers, hyphens, underscores, and periods allowed. Max 100 characters.
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="repo-description" className="text-gray-300">Repository Description (Optional)</Label>
                      <Textarea
                        id="repo-description"
                        value={githubForm.repoDescription}
                        onChange={(e) => setGithubForm(prev => ({ ...prev, repoDescription: e.target.value }))}
                        placeholder="A brief description of your project"
                        rows={2}
                        className="mt-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is-private"
                        checked={githubForm.isPrivate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGithubForm(prev => ({ ...prev, isPrivate: e.target.checked }))}
                        className="rounded bg-gray-700 border-gray-600 text-blue-500"
                      />
                      <Label htmlFor="is-private" className="flex items-center space-x-2 text-gray-300">
                        <span>Make repository private</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-700 border-gray-600 text-white">
                            <p>Private repositories are only visible to you and collaborators</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="github-token" className="flex items-center space-x-2 text-gray-300">
                        <span>Personal Access Token</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-700 border-gray-600 text-white">
                            <p>Required for creating and managing repositories</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="github-token"
                        type="password"
                        value={githubForm.token}
                        onChange={(e) => setGithubForm(prev => ({ ...prev, token: e.target.value }))}
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        className="mt-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      />
                      <p className="text-sm text-gray-400 mt-1">
                        <a
                          href="https://github.com/settings/tokens"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Create a Personal Access Token
                        </a> with repo permissions
                      </p>
                    </div>

                    {/* Smart Defaults */}
                    {!githubForm.repoName && selectedProject && (
                      <Alert className="bg-blue-900 border-blue-700">
                        <Lightbulb className="h-4 w-4 text-blue-400" />
                        <AlertDescription className="text-blue-300">
                          💡 <strong>Smart suggestion:</strong> Click "Generate" to auto-create a repository name from your project, or enter a custom name above.
                        </AlertDescription>
                      </Alert>
                    )}

                    {githubForm.repoName && !/^[a-zA-Z0-9._-]+$/.test(githubForm.repoName) && (
                      <Alert variant="destructive" className="bg-red-900 border-red-700">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <AlertDescription className="text-red-300">
                          ⚠️ Repository name contains invalid characters. Only letters, numbers, hyphens, underscores, and periods are allowed.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 pt-4 border-t border-gray-700">
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
                    variant="outline"
                    className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    Save Token
                  </Button>
                  <Button variant="secondary" onClick={handleGitHubConnect} className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                    <Github className="h-4 w-4 mr-2" />
                    Connect via OAuth
                  </Button>
                  <Button
                    onClick={handleGitHubDeploy}
                    disabled={deploymentState.isDeploying || !githubForm.repoName || !githubForm.token || !selectedProject}
                    className="sm:ml-auto bg-blue-600 hover:bg-blue-700"
                  >
                    {deploymentState.isDeploying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deploying...
                      </>
                    ) : (
                      <>
                        <Rocket className="mr-2 h-4 w-4" />
                        Deploy to GitHub
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Vercel Deployment Form */}
            {activeTab === 'vercel' && (
              <div className="space-y-6">
                {/* Vercel Setup Instructions */}
                <DeploymentSetupAccordion
                  platform="vercel"
                  connectionStatus={deploymentState.vercelConnected ? 'connected' : 'not_connected'}
                  onConnect={handleVercelConnect}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="vercel-token" className="text-gray-300">Vercel Personal Token</Label>
                      <Input
                        id="vercel-token"
                        type="password"
                        value={vercelForm.token}
                        onChange={(e) => setVercelForm(prev => ({ ...prev, token: e.target.value }))}
                        placeholder="vercel_xxxxxxxxxxxxxxxxxxxx"
                        className="mt-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      />
                      <p className="text-sm text-gray-400 mt-1">
                        <a
                          href="https://vercel.com/account/tokens"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Create a Personal Access Token
                        </a> with project permissions
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="vercel-project-name" className="text-gray-300">Project Name</Label>
                      <div className="flex space-x-2 mt-1">
                        <Input
                          id="vercel-project-name"
                          value={vercelForm.projectName}
                          onChange={(e) => setVercelForm(prev => ({ ...prev, projectName: e.target.value }))}
                          placeholder="my-awesome-project"
                          className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (selectedProject) {
                              const uniqueName = generateUniqueProjectName(selectedProject.name)
                              setVercelForm(prev => ({ ...prev, projectName: uniqueName }))
                            }
                          }}
                          disabled={!selectedProject}
                          className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                        >
                          Generate Unique
                        </Button>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        Only letters, numbers, and hyphens allowed. Cannot start or end with hyphen. Max 52 characters.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* GitHub Repository Selection for Vercel */}
                    <div>
                      <Label htmlFor="vercel-repo-select" className="text-gray-300">Deploy from GitHub Repository (Optional)</Label>
                      <Select value={selectedRepoForVercel || 'none'} onValueChange={setSelectedRepoForVercel}>
                        <SelectTrigger className="mt-1 bg-gray-700 border-gray-600 text-white">
                          <SelectValue placeholder="Select a GitHub repository to deploy from" className="text-gray-400" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          <SelectItem value="none" className="text-gray-300 hover:bg-gray-600">Don't use GitHub repo (upload files)</SelectItem>
                          {deployedRepos.map((repo) => (
                            <SelectItem key={repo.id} value={repo.githubRepo} className="text-gray-300 hover:bg-gray-600">
                              {repo.projectName} ({repo.githubRepo})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-400 mt-1">
                        Select a GitHub repository to deploy from, or leave empty to upload files directly.
                      </p>
                    </div>

                    {/* Smart Defaults for Vercel */}
                    {!vercelForm.projectName && selectedProject && (
                      <Alert className="bg-blue-900 border-blue-700">
                        <Lightbulb className="h-4 w-4 text-blue-400" />
                        <AlertDescription className="text-blue-300">
                          💡 <strong>Smart suggestion:</strong> Click "Generate Unique" to auto-create a unique project name from your project.
                        </AlertDescription>
                      </Alert>
                    )}

                    {vercelForm.projectName && !/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(vercelForm.projectName) && (
                      <Alert variant="destructive" className="bg-red-900 border-red-700">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <AlertDescription className="text-red-300">
                          ⚠️ Project name contains invalid characters or format. Only lowercase letters, numbers, and hyphens are allowed. Cannot start or end with a hyphen.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>

                {/* Vercel Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 pt-4 border-t border-gray-700">
                  <Button onClick={async () => {
                    if (!vercelForm.token) return
                    await storageManager.createToken({ userId: currentUserId, provider: 'vercel', token: vercelForm.token })
                    setSavedTokens(prev => ({ ...prev, vercel: { token: vercelForm.token } }))
                    setDeploymentState(prev => ({ ...prev, vercelConnected: true }))
                    toast({ title: 'Saved', description: 'Vercel token saved' })
                  }} disabled={!vercelForm.token} variant="outline" className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                    Save Token
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!selectedProject || !vercelForm.token) return

                      setDeploymentState(prev => ({ ...prev, isDeploying: true, currentStep: 'deploying' }))

                      try {
                        let deployData;

                        if (selectedRepoForVercel && selectedRepoForVercel !== 'none') {
                          // Deploy from GitHub repository
                          const deployResponse = await fetch('/api/vercel/deploy', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              projectName: vercelForm.projectName,
                              framework: vercelForm.framework,
                              token: vercelForm.token,
                              workspaceId: selectedProject.id,
                              githubRepo: selectedRepoForVercel,
                            })
                          })

                          if (!deployResponse.ok) {
                            const errorData = await deployResponse.json()
                            throw new Error(errorData.error || 'Failed to deploy to Vercel')
                          }

                          deployData = await deployResponse.json()
                        } else {
                          // Deploy by uploading files
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

                          const deployResponse = await fetch('/api/vercel/deploy', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              projectName: vercelForm.projectName,
                              framework: vercelForm.framework,
                              token: vercelForm.token,
                              workspaceId: selectedProject.id,
                              githubRepo: selectedRepoForVercel && selectedRepoForVercel !== 'none' ? selectedRepoForVercel : undefined,
                              files: (!selectedRepoForVercel || selectedRepoForVercel === 'none') ? projectFiles : undefined,
                            })
                          })

                          if (!deployResponse.ok) {
                            const errorData = await deployResponse.json()
                            throw new Error(errorData.error || 'Failed to deploy to Vercel')
                          }

                          deployData = await deployResponse.json()
                        }

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
                          commitMessage: deployData.commitMessage || 'Deployed to Vercel',
                          branch: 'main',
                          environment: 'production',
                          provider: 'vercel'
                        })

                        // Reload deployed repos to update dropdowns
                        await loadDeployedRepos()

                        // Reload deployment history to update UI
                        await loadDeploymentHistory()

                        toast({
                          title: 'Deployment Successful',
                          description: `Successfully deployed to Vercel at ${deployData.url}`
                        })
                        setDeploymentState(prev => ({ ...prev, isDeploying: false, currentStep: 'complete' }))

                      } catch (error) {
                        console.error('Vercel deploy error:', error)

                        // Try to parse error response for better user feedback
                        let errorMessage = 'Failed to deploy to Vercel'
                        let errorTitle = 'Deployment Failed'

                        try {
                          const errorResponse = JSON.parse((error as Error).message)
                          if (errorResponse.code === 'PROJECT_NAME_TAKEN') {
                            errorTitle = 'Project Name Taken'
                            errorMessage = errorResponse.error
                            if (errorResponse.suggestion) {
                              errorMessage += ` ${errorResponse.suggestion}`
                            }
                          } else if (errorResponse.code === 'INVALID_TOKEN') {
                            errorTitle = 'Authentication Failed'
                            errorMessage = errorResponse.error
                          } else if (errorResponse.code === 'INSUFFICIENT_PERMISSIONS') {
                            errorTitle = 'Permission Denied'
                            errorMessage = errorResponse.error
                          } else if (errorResponse.code === 'INVALID_PROJECT_NAME') {
                            errorTitle = 'Invalid Project Name'
                            errorMessage = errorResponse.error
                          } else if (errorResponse.error) {
                            errorMessage = errorResponse.error
                          }
                        } catch (parseError) {
                          // If parsing fails, use the original error message
                          errorMessage = (error as Error).message || errorMessage
                        }

                        toast({
                          title: errorTitle,
                          description: errorMessage,
                          variant: 'destructive'
                        })
                        setDeploymentState(prev => ({ ...prev, isDeploying: false }))
                      }
                    }}
                    disabled={deploymentState.isDeploying || !vercelForm.token}
                    className="sm:ml-auto bg-blue-600 hover:bg-blue-700"
                  >
                    {deploymentState.isDeploying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deploying...
                      </>
                    ) : (
                      <>
                        <Rocket className="mr-2 h-4 w-4" />
                        Deploy to Vercel
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Netlify Deployment Form */}
            {activeTab === 'netlify' && (
              <div className="space-y-6">
                {/* Netlify Setup Instructions */}
                <DeploymentSetupAccordion
                  platform="netlify"
                  connectionStatus={deploymentState.netlifyConnected ? 'connected' : 'not_connected'}
                  onConnect={handleNetlifyConnect}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="netlify-token" className="text-gray-300">Netlify Personal Access Token</Label>
                      <Input
                        id="netlify-token"
                        type="password"
                        value={netlifyForm.token}
                        onChange={(e) => setNetlifyForm(prev => ({ ...prev, token: e.target.value }))}
                        placeholder="nfp_xxxxxxxxxxxxxxxxxxxx"
                        className="mt-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      />
                      <p className="text-sm text-gray-400 mt-1">
                        <a
                          href="https://app.netlify.com/user/applications#personal-access-tokens"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Create a Personal Access Token
                        </a> with site permissions
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="netlify-site-name" className="text-gray-300">Site Name</Label>
                      <div className="flex space-x-2 mt-1">
                        <Input
                          id="netlify-site-name"
                          value={netlifyForm.siteName}
                          onChange={(e) => setNetlifyForm(prev => ({ ...prev, siteName: e.target.value }))}
                          placeholder="my-awesome-site"
                          className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (selectedProject) {
                              const uniqueName = generateUniqueSiteName(selectedProject.name)
                              setNetlifyForm(prev => ({ ...prev, siteName: uniqueName }))
                            }
                          }}
                          disabled={!selectedProject}
                          className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                        >
                          Generate Unique
                        </Button>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        Only letters, numbers, and hyphens allowed. Max 63 characters.
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="netlify-build-command" className="text-gray-300">Build Command</Label>
                      <Input
                        id="netlify-build-command"
                        value={netlifyForm.buildCommand}
                        onChange={(e) => setNetlifyForm(prev => ({ ...prev, buildCommand: e.target.value }))}
                        placeholder="npm run build"
                        className="mt-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      />
                    </div>

                    <div>
                      <Label htmlFor="netlify-publish-dir" className="text-gray-300">Publish Directory</Label>
                      <Input
                        id="netlify-publish-dir"
                        value={netlifyForm.publishDir}
                        onChange={(e) => setNetlifyForm(prev => ({ ...prev, publishDir: e.target.value }))}
                        placeholder="out"
                        className="mt-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* GitHub Repository Selection for Netlify */}
                    <div>
                      <Label htmlFor="netlify-repo-select" className="text-gray-300">Deploy from GitHub Repository (Optional)</Label>
                      <Select value={selectedRepoForNetlify || 'none'} onValueChange={setSelectedRepoForNetlify}>
                        <SelectTrigger className="mt-1 bg-gray-700 border-gray-600 text-white">
                          <SelectValue placeholder="Select a GitHub repository to deploy from" className="text-gray-400" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          <SelectItem value="none" className="text-gray-300 hover:bg-gray-600">Don't use GitHub repo (upload files)</SelectItem>
                          {deployedRepos.map((repo) => (
                            <SelectItem key={repo.id} value={repo.githubRepo} className="text-gray-300 hover:bg-gray-600">
                              {repo.projectName} ({repo.githubRepo})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-400 mt-1">
                        Select a GitHub repository to deploy from, or leave empty to upload files directly.
                      </p>
                    </div>

                    {/* Smart Defaults for Netlify */}
                    {!netlifyForm.siteName && selectedProject && (
                      <Alert className="bg-blue-900 border-blue-700">
                        <Lightbulb className="h-4 w-4 text-blue-400" />
                        <AlertDescription className="text-blue-300">
                          💡 <strong>Smart suggestion:</strong> Click "Generate Unique" to auto-create a unique site name from your project.
                        </AlertDescription>
                      </Alert>
                    )}

                    {netlifyForm.siteName && !/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(netlifyForm.siteName) && (
                      <Alert variant="destructive" className="bg-red-900 border-red-700">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <AlertDescription className="text-red-300">
                          ⚠️ Site name contains invalid characters or format. Only lowercase letters, numbers, and hyphens are allowed. Cannot start or end with a hyphen.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>

                {/* Netlify Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 pt-4 border-t border-gray-700">
                  <Button onClick={async () => {
                    if (!netlifyForm.token) return
                    await storageManager.createToken({ userId: currentUserId, provider: 'netlify', token: netlifyForm.token })
                    setSavedTokens(prev => ({ ...prev, netlify: { token: netlifyForm.token } }))
                    setDeploymentState(prev => ({ ...prev, netlifyConnected: true }))
                    toast({ title: 'Saved', description: 'Netlify token saved' })
                  }} disabled={!netlifyForm.token} variant="outline" className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                    Save Token
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!selectedProject || !netlifyForm.token) return

                      setDeploymentState(prev => ({ ...prev, isDeploying: true, currentStep: 'deploying' }))

                      try {
                        let deployData;

                        if (selectedRepoForNetlify && selectedRepoForNetlify !== 'none') {
                          // Deploy from GitHub repository
                          const deployResponse = await fetch('/api/netlify/deploy', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              siteName: netlifyForm.siteName,
                              buildCommand: netlifyForm.buildCommand,
                              publishDir: netlifyForm.publishDir,
                              token: netlifyForm.token,
                              workspaceId: selectedProject.id,
                              githubRepo: selectedRepoForNetlify,
                            })
                          })

                          if (!deployResponse.ok) {
                            const errorData = await deployResponse.json()
                            throw new Error(errorData.error || 'Failed to deploy to Netlify')
                          }

                          deployData = await deployResponse.json()
                        } else {
                          // Deploy by uploading files
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

                          const deployResponse = await fetch('/api/netlify/deploy', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              siteName: netlifyForm.siteName,
                              buildCommand: netlifyForm.buildCommand,
                              publishDir: netlifyForm.publishDir,
                              token: netlifyForm.token,
                              workspaceId: selectedProject.id,
                              githubRepo: selectedRepoForNetlify && selectedRepoForNetlify !== 'none' ? selectedRepoForNetlify : undefined,
                              files: (!selectedRepoForNetlify || selectedRepoForNetlify === 'none') ? projectFiles : undefined,
                            })
                          })

                          if (!deployResponse.ok) {
                            const errorData = await deployResponse.json()
                            throw new Error(errorData.error || 'Failed to deploy to Netlify')
                          }

                          deployData = await deployResponse.json()
                        }

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
                          commitMessage: deployData.commitMessage || 'Deployed to Netlify',
                          branch: 'main',
                          environment: 'production',
                          provider: 'netlify'
                        })

                        // Reload deployed repos to update dropdowns
                        await loadDeployedRepos()

                        toast({
                          title: 'Deployment Successful',
                          description: `Successfully deployed to Netlify at ${deployData.url}`
                        })
                        setDeploymentState(prev => ({ ...prev, isDeploying: false, currentStep: 'complete' }))

                      } catch (error) {
                        console.error('Netlify deploy error:', error)

                        // Try to parse error response for better user feedback
                        let errorMessage = 'Failed to deploy to Netlify'
                        let errorTitle = 'Deployment Failed'

                        try {
                          const errorResponse = JSON.parse((error as Error).message)
                          if (errorResponse.code === 'DUPLICATE_SITE_NAME') {
                            errorTitle = 'Site Name Taken'
                            errorMessage = errorResponse.error
                            if (errorResponse.suggestion) {
                              errorMessage += ` ${errorResponse.suggestion}`
                            }
                          } else if (errorResponse.code === 'INVALID_TOKEN') {
                            errorTitle = 'Authentication Failed'
                            errorMessage = errorResponse.error
                          } else if (errorResponse.code === 'INSUFFICIENT_PERMISSIONS') {
                            errorTitle = 'Permission Denied'
                            errorMessage = errorResponse.error
                          } else if (errorResponse.code === 'INVALID_SITE_NAME') {
                            errorTitle = 'Invalid Site Name'
                            errorMessage = errorResponse.error
                          } else if (errorResponse.code === 'SITE_NAME_TOO_LONG') {
                            errorTitle = 'Site Name Too Long'
                            errorMessage = errorResponse.error
                          } else if (errorResponse.code === 'SITE_NAME_TOO_SHORT') {
                            errorTitle = 'Site Name Too Short'
                            errorMessage = errorResponse.error
                          } else if (errorResponse.error) {
                            errorMessage = errorResponse.error
                          }
                        } catch (parseError) {
                          // If parsing fails, use the original error message
                          errorMessage = (error as Error).message || errorMessage
                        }

                        toast({
                          title: errorTitle,
                          description: errorMessage,
                          variant: 'destructive'
                        })
                        setDeploymentState(prev => ({ ...prev, isDeploying: false }))
                      }
                    }}
                    disabled={deploymentState.isDeploying || !netlifyForm.token}
                    className="sm:ml-auto bg-green-600 hover:bg-green-700"
                  >
                    {deploymentState.isDeploying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deploying...
                      </>
                    ) : (
                      <>
                        <Rocket className="mr-2 h-4 w-4" />
                        Deploy to Netlify
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* PiPilot Deployment Form */}
            {activeTab === 'pipilot' && (
              <div className="space-y-6">
                {/* PiPilot Info */}
                <Alert className="bg-purple-900/20 border-purple-700">
                  <Rocket className="h-4 w-4 text-purple-400" />
                  <AlertDescription className="text-purple-300">
                    Deploy directly to Cloudflare Pages. Get a real .pages.dev domain!
                  </AlertDescription>
                </Alert>

                {/* Configuration Status */}
                {pipilotConfig && (
                  <Alert className={pipilotConfig.configured 
                    ? "bg-green-900/20 border-green-700" 
                    : "bg-red-900/20 border-red-700"
                  }>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {pipilotConfig.configured ? (
                          <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-400 mr-2" />
                        )}
                        <AlertDescription className={pipilotConfig.configured 
                          ? "text-green-300" 
                          : "text-red-300"
                        }>
                          {pipilotConfig.message}
                          {pipilotConfig.accountName && (
                            <span className="ml-2 text-sm">
                              (Account: {pipilotConfig.accountName})
                            </span>
                          )}
                        </AlertDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={checkPipilotConfig}
                        className="ml-4 text-xs bg-transparent border-current"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Refresh
                      </Button>
                    </div>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="pipilot-subdomain" className="flex items-center space-x-2 text-gray-300">
                        <span>Subdomain Name</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-700 border-gray-600 text-white">
                            <p>Choose your custom subdomain (e.g., myproject)</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <div className="flex space-x-2 mt-1">
                        <Input
                          id="pipilot-subdomain"
                          value={pipilotForm?.subdomain || ''}
                          onChange={(e) => setPipilotForm(prev => ({
                            ...prev,
                            subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
                          }))}
                          placeholder="my-awesome-project"
                          className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (selectedProject) {
                              const subdomain = selectedProject.name.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
                              setPipilotForm(prev => ({ ...prev, subdomain }))
                            }
                          }}
                          disabled={!selectedProject}
                          className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                        >
                          Generate
                        </Button>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        Only letters, numbers, and hyphens. 3-63 characters.
                      </p>
                      {(pipilotForm?.subdomain || '').length > 0 && (
                        <p className="text-sm text-purple-400 mt-2">
                          Your site will be available at: <strong>{pipilotForm?.subdomain}.pages.dev</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-700">
                      <h4 className="text-sm font-medium text-purple-300 mb-2">PiPilot Features</h4>
                      <ul className="space-y-1 text-xs text-purple-400">
                        <li>• Instant deployment to custom subdomain</li>
                        <li>• No external accounts required</li>
                        <li>• Free hosting with CDN</li>
                        <li>• Automatic SSL certificate</li>
                        <li>• SPA routing support</li>
                      </ul>
                    </div>

                    {selectedProject && (
                      <div className="bg-gray-700 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-white mb-2">Project Details</h4>
                        <div className="space-y-1 text-xs text-gray-300">
                          <p><strong>Name:</strong> {selectedProject.name}</p>
                          <p><strong>Files:</strong> Ready to deploy</p>
                          <p><strong>Status:</strong> <span className="text-green-400">Build ready</span></p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setDeploymentState(prev => ({ ...prev, isDeploying: false }))}
                    disabled={deploymentState.isDeploying}
                    className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePiPilotDeploy}
                    disabled={
                      deploymentState.isDeploying ||
                      !selectedProject ||
                      !pipilotForm?.subdomain ||
                      pipilotForm.subdomain.length < 3 ||
                      pipilotForm.subdomain.length > 63 ||
                      !/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(pipilotForm.subdomain) ||
                      (pipilotConfig && !pipilotConfig.configured)
                    }
                    className="sm:ml-auto bg-purple-600 hover:bg-purple-700"
                  >
                    {deploymentState.isDeploying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deploying to PiPilot...
                      </>
                    ) : (
                      <>
                        <Rocket className="mr-2 h-4 w-4" />
                        Deploy to PiPilot.dev
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* --- Repo Management Section --- */}
        <div className="mt-10">
          <Card>
            <CardHeader>
              <CardTitle>Connected GitHub Repositories</CardTitle>
              <CardDescription>Manage and view all your deployed GitHub repos and their URLs. Select a repo above to deploy to Vercel or Netlify.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deployedRepos.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No GitHub repositories connected yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {deployedRepos.map((repo, index) => (
                      <motion.div
                        key={repo.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ 
                          duration: 0.5, 
                          delay: index * 0.1,
                          ease: "easeOut"
                        }}
                        whileHover={{ 
                          y: -5, 
                          transition: { duration: 0.2 } 
                        }}
                      >
                        <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg h-full flex flex-col">
                          <div className="p-4 flex-grow">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-lg truncate" title={repo.projectName}>
                                  {repo.projectName.length > 22 
                                    ? `${repo.projectName.substring(0, 22)}...` 
                                    : repo.projectName}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                  {repo.githubRepo || 'No repo name'}
                                </p>
                              </div>
                              <Badge variant="secondary" className="ml-2">
                                <Github className="h-3 w-3 mr-1" />
                                GitHub
                              </Badge>
                            </div>
                            
                            <div className="mt-4 space-y-3">
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Repository URL</p>
                                {repo.githubUrl ? (
                                  <a 
                                    href={repo.githubUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-blue-600 hover:underline text-sm break-all transition-colors duration-200"
                                  >
                                    {repo.githubUrl}
                                  </a>
                                ) : (
                                  <span className="text-gray-400 text-sm">Not available</span>
                                )}
                              </div>
                              
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vercel URL</p>
                                {repo.vercelUrl ? (
                                  <a 
                                    href={repo.vercelUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-green-600 hover:underline text-sm break-all transition-colors duration-200"
                                  >
                                    {repo.vercelUrl}
                                  </a>
                                ) : (
                                  <span className="text-gray-400 text-sm">Not deployed</span>
                                )}
                              </div>
                              
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Netlify URL</p>
                                {repo.netlifyUrl ? (
                                  <a 
                                    href={repo.netlifyUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-green-600 hover:underline text-sm break-all transition-colors duration-200"
                                  >
                                    {repo.netlifyUrl}
                                  </a>
                                ) : (
                                  <span className="text-gray-400 text-sm">Not deployed</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-auto pt-3 border-t border-gray-100 px-4 py-2">
                            <p className="text-xs text-gray-500">
                              Last updated: {new Date(repo.lastUpdated).toLocaleDateString()}
                            </p>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </TooltipProvider>
  )
}