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

// Custom SVG Icons
const GitHubIcon = ({ className }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className}>
    <title>GitHub</title>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
  </svg>
)

const VercelIcon = ({ className }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className}>
    <title>Vercel</title>
    <path d="m12 1.608 12 20.784H0Z"/>
  </svg>
)

const NetlifyIcon = ({ className }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className}>
    <title>Netlify</title>
    <path d="M6.49 19.04h-.23L5.13 17.9v-.23l1.73-1.71h1.2l.15.15v1.2L6.5 19.04ZM5.13 6.31V6.1l1.13-1.13h.23L8.2 6.68v1.2l-.15.15h-1.2L5.13 6.31Zm9.96 9.09h-1.65l-.14-.13v-3.83c0-.68-.27-1.2-1.1-1.23-.42 0-.9 0-1.43.02l-.07.08v4.96l-.14.14H8.9l-.13-.14V8.73l.13-.14h3.7a2.6 2.6 0 0 1 2.61 2.6v4.08l-.13.14Zm-8.37-2.44H.14L0 12.82v-1.64l.14-.14h6.58l.14.14v1.64l-.14.14Zm17.14 0h-6.58l-.14-.14v-1.64l.14-.14h6.58l.14.14v1.64l-.14.14ZM11.05 6.55V1.64l.14-.14h1.65l.14.14v4.9l-.14.14h-1.65l-.14-.13Zm0 15.81v-4.9l.14-.14h1.65l.14.13v4.91l-.14.14h-1.65l-.14-.14Z"/>
  </svg>
)

import { useToast } from "@/hooks/use-toast"
import { storageManager, type Workspace as Project, type Deployment, type EnvironmentVariable } from "@/lib/storage-manager"
import { createClient } from "@/lib/supabase/client"
import { getDeploymentTokens } from "@/lib/cloud-sync"
// Plan limit checking functions
async function checkPlanLimits(userId: string, operation: string, platform: string) {
  try {
    const response = await fetch('/api/limits/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ operation, platform })
    })

    if (response.ok) {
      const data = await response.json()
      return data
    } else {
      console.error('Failed to check plan limits:', response.statusText)
      return { canPerform: false, reason: 'Unable to verify plan limits' }
    }
  } catch (error) {
    console.error('Error checking plan limits:', error)
    return { canPerform: false, reason: 'Unable to verify plan limits' }
  }
}

async function recordUsage(userId: string, operation: string, platform: string) {
  try {
    const response = await fetch('/api/limits/record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ operation, platform })
    })

    if (!response.ok) {
      console.error('Failed to record usage:', response.statusText)
    }
  } catch (error) {
    console.error('Error recording usage:', error)
  }
}

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { DeploymentSetupAccordion } from "@/components/workspace/deployment-setup-accordion"

interface GitHubRepo {
  id: string
  name: string
  fullName: string
  url: string
  private?: boolean
  description?: string
  updatedAt?: string
  language?: string
  stars?: number
  forks?: number
  defaultBranch?: string
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
    repoName: '',
    repoDescription: '',
    isPrivate: false,
    deploymentMode: 'new' as 'new' | 'existing' | 'push', // 'new' for creating new repo, 'existing' for pushing to existing, 'push' for connected repo
    selectedRepo: '',
    commitMessage: 'Update project files',
  })

  const [vercelForm, setVercelForm] = useState({
    projectName: '',
    framework: 'vite',
  })

  const [netlifyForm, setNetlifyForm] = useState({
    siteName: '',
    buildCommand: 'npm run build',
    publishDir: 'out',
  })

  // Enhanced state variables
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

  // Stored deployment tokens from database
  const [storedTokens, setStoredTokens] = useState<{
    github?: string
    vercel?: string
    netlify?: string
  }>({})
  const [deployedRepos, setDeployedRepos] = useState<DeployedRepo[]>([])
  const [availableRepos, setAvailableRepos] = useState<GitHubRepo[]>([])
  const [userRepos, setUserRepos] = useState<GitHubRepo[]>([])
  const [isLoadingRepos, setIsLoadingRepos] = useState(false)
  const [isGeneratingCommitMessage, setIsGeneratingCommitMessage] = useState(false)


  const [selectedRepoForVercel, setSelectedRepoForVercel] = useState<string>('')
  const [selectedRepoForNetlify, setSelectedRepoForNetlify] = useState<string>('')

  // Helper function to extract GitHub repo in owner/repo format
  const getGitHubRepo = (project: Project | null): string | undefined => {
    if (!project?.githubRepoUrl) return undefined
    const match = project.githubRepoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    return match ? `${match[1]}/${match[2]}` : undefined
  }

  // Load stored deployment tokens from database
  const loadStoredTokens = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        console.log('loadStoredTokens: No user found')
        return
      }

      console.log('loadStoredTokens: Loading tokens for user:', user.id)
      const tokens = await getDeploymentTokens(user.id)
      console.log('loadStoredTokens: Retrieved tokens:', tokens)
      
      if (tokens) {
        const newTokens = {
          github: tokens.github || undefined,
          vercel: tokens.vercel || undefined,
          netlify: tokens.netlify || undefined
        }
        console.log('loadStoredTokens: Setting stored tokens:', newTokens)
        setStoredTokens(newTokens)
      } else {
        console.log('loadStoredTokens: No tokens found, clearing stored tokens')
        setStoredTokens({
          github: undefined,
          vercel: undefined,
          netlify: undefined
        })
      }
    } catch (error) {
      console.error('Error loading stored tokens:', error)
    }
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

  // Fetch user's GitHub repositories
  const fetchUserGitHubRepos = async () => {
    if (!storedTokens.github) return

    setIsLoadingRepos(true)
    try {
      const response = await fetch(`https://api.github.com/user/repos?sort=updated&per_page=100`, {
        headers: {
          'Authorization': `Bearer ${storedTokens.github}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch repositories')
      }

      const repos = await response.json()
      const formattedRepos: GitHubRepo[] = repos.map((repo: any) => ({
        name: repo.name,
        fullName: repo.full_name,
        url: repo.html_url,
        private: repo.private,
        description: repo.description,
        updatedAt: repo.updated_at,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count
      }))

      setUserRepos(formattedRepos)
    } catch (error) {
      console.error('Error fetching GitHub repositories:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch your GitHub repositories',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingRepos(false)
    }
  }

  // Fetch the last chat message from IndexedDB
  const fetchLastChatMessage = async (): Promise<string | null> => {
    try {
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()

      // Get current user ID
      const supabaseClient = createClient()
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (!user) return null

      // Get all chat sessions for this user
      const chatSessions = await storageManager.getChatSessions(user.id)

      if (chatSessions.length === 0) {
        return null
      }

      // Get the most recent chat session
      const latestSession = chatSessions.sort((a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      )[0]

      // Get the latest message from this session
      const messages = await storageManager.getMessages(latestSession.id)

      if (messages.length === 0) {
        return null
      }

      // Get the last two messages (user + assistant) for better context
      const sortedMessages = messages.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      
      const lastTwoMessages = sortedMessages.slice(-2)
      
      if (lastTwoMessages.length === 0) {
        return null
      }

      // Create context from the last two messages
      let context = ''
      
      if (lastTwoMessages.length === 1) {
        // Only one message available
        context = `User: ${lastTwoMessages[0].content}`
      } else {
        // Two messages available - format as conversation
        const [secondLast, last] = lastTwoMessages
        if (secondLast.role === 'user' && last.role === 'assistant') {
          context = `User request: ${secondLast.content}\n\nAI response: ${last.content.substring(0, 300)}...`
        } else if (secondLast.role === 'assistant' && last.role === 'user') {
          context = `Previous AI response: ${secondLast.content.substring(0, 200)}...\n\nUser request: ${last.content}`
        } else {
          // Both same role, just use the last user message
          const userMessages = lastTwoMessages.filter(msg => msg.role === 'user')
          context = userMessages.length > 0 ? `User: ${userMessages[userMessages.length - 1].content}` : lastTwoMessages[lastTwoMessages.length - 1].content
        }
      }

      return context

    } catch (error) {
      console.error('Error fetching last chat message:', error)
      return null
    }
  }

  // Generate AI-powered commit message from chat conversation context
  const generateCommitMessageFromChat = async (conversationContext: string): Promise<string> => {
    try {
      // Import AI dependencies dynamically
      const { generateText } = await import('ai')
      const { getModel } = await import('@/lib/ai-providers')

      // Get the auto model (Codestral by default)
      const model = getModel('auto')

      const commitMessageResult = await generateText({
        model: model,
        messages: [
          {
            role: 'system',
            content: `You are an expert software engineer creating professional, meaningful commit messages.

Your task is to analyze a conversation between a user and an AI assistant about development work, and create a concise, professional commit message that follows conventional commit standards.

You will receive the recent conversation context which may include:
- User's request/question about what they want to implement
- AI's response with implementation details or code suggestions
- Description of changes that were made or will be made

COMMIT MESSAGE GUIDELINES:
- Keep it under 72 characters total
- Start with a capital letter
- Use imperative mood (Add, Fix, Update, Remove, etc.)
- Be specific and meaningful
- Focus on WHAT was changed, not HOW
- Use conventional commit prefixes: feat:, fix:, chore:, docs:, style:, refactor:, test:
- Extract the core development task from the conversation
- Prioritize the actual implementation over just discussion

EXAMPLES OF GOOD COMMIT MESSAGES:
- "feat: Add user authentication system"
- "fix: Resolve login validation error"
- "feat: Implement dark mode toggle"
- "refactor: Update API error handling"
- "feat: Add responsive header component"
- "fix: Fix deployment token persistence"
- "feat: Add AI commit message generator"

Return ONLY the commit message, no quotes or additional text.`
          },
          {
            role: 'user',
            content: `Analyze this development conversation and create a professional commit message:

${conversationContext}

Create a commit message that captures the main development task or change discussed.    ensure to focus on what the ai implementedd and avoid saying the user requested for    instead focus n thee implementation the ai  didi by look at the end of each ai message  it contains a summarry of changes the ai gave to the user , use that as a good reference to craft a good technicall commmit message 

EXAMPLES OF GOOD COMMIT MESSAGES:
- "feat: Add user authentication system"
- "fix: Resolve login validation error"
- "feat: Implement dark mode toggle"
- "refactor: Update API error handling"
- "feat: Add responsive header component"
- "fix: Fix deployment token persistence"
- "feat: Add AI commit message generator"`
          }
        ],
        temperature: 0.3, // Low temperature for consistent, professional output
      })

      const aiCommitMessage = commitMessageResult.text.trim()

      // Validate the generated message
      if (aiCommitMessage.length > 0 && aiCommitMessage.length <= 72) {
        return aiCommitMessage
      }

      // Fallback if AI generation fails
      return 'Update project files'

    } catch (error) {
      console.error('AI commit message generation failed:', error)

      // Fallback to simple text processing if AI fails
      let cleaned = conversationContext
        .replace(/[^\w\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 50)

      if (cleaned.length === 0) {
        return 'Update project files'
      }

      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    }
  }

  // Generate auto commit message
  const generateAutoCommitMessage = async () => {
    setIsGeneratingCommitMessage(true)

    try {
      const lastMessage = await fetchLastChatMessage()

      if (!lastMessage) {
        toast({
          title: 'No Chat History',
          description: 'No recent chat messages found to generate commit message from',
          variant: 'default'
        })
        setGithubForm(prev => ({ ...prev, commitMessage: 'Update project files' }))
        return
      }

      const commitMessage = await generateCommitMessageFromChat(lastMessage)
      setGithubForm(prev => ({ ...prev, commitMessage }))

      toast({
        title: 'AI Commit Message Generated',
        description: `Created professional commit message from recent conversation`,
        variant: 'default'
      })

    } catch (error) {
      console.error('Error generating commit message:', error)
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate commit message from chat history',
        variant: 'destructive'
      })
    } finally {
      setIsGeneratingCommitMessage(false)
    }
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


  // Initialize enhanced features
  useEffect(() => {
    if (currentUserId) {
      calculateQuickStats()
      loadDeploymentHistory()
      initializeEnvironments()
    }
  }, [currentUserId])

  // Fetch user repositories when deployment mode changes to 'existing'
  useEffect(() => {
    if (githubForm.deploymentMode === 'existing' && storedTokens.github && userRepos.length === 0) {
      fetchUserGitHubRepos()
    }
  }, [githubForm.deploymentMode, storedTokens.github, userRepos.length])

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
    if (!storedTokens.github) return

    try {
      const response = await fetch('/api/github/repos', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${storedTokens.github}`,
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
      loadStoredTokens() // Also load tokens when user changes
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

      // Load stored deployment tokens from database
      await loadStoredTokens()

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


  const handleGitHubDeploy = async () => {
    if (!selectedProject) {
      toast({
        title: "No Project Selected",
        description: "Please select a project to deploy",
        variant: "destructive"
      })
      return
    }

    // Validate repository selection based on deployment mode
    if (githubForm.deploymentMode === 'new' && !githubForm.repoName) {
      toast({
        title: "Repository Name Required",
        description: "Please enter a repository name",
        variant: "destructive"
      })
      return
    }

    if (githubForm.deploymentMode === 'existing' && !githubForm.selectedRepo) {
      toast({
        title: "Repository Selection Required",
        description: "Please select an existing repository",
        variant: "destructive"
      })
      return
    }

    if (githubForm.deploymentMode === 'push' && !selectedProject?.githubRepoUrl) {
      toast({
        title: "No Connected Repository",
        description: "No GitHub repository is connected to this project",
        variant: "destructive"
      })
      return
    }

    // Check if GitHub token is available in stored tokens
    if (!storedTokens.github) {
      toast({
        title: "GitHub Token Required",
        description: (
          <div>
            <p>You need to set up your GitHub token in your account settings first.</p>
            <Link href="/workspace/account" className="text-blue-400 hover:text-blue-300 underline">
              Go to Account Settings →
            </Link>
          </div>
        ),
        variant: "destructive"
      })
      return
    }

    // Validate repository name format for new repositories
    if (githubForm.deploymentMode === 'new') {
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
    }

    setDeploymentState(prev => ({ ...prev, isDeploying: true, currentStep: 'connecting' }))

    try {
      let repoData: any = null
      let repoOwner: string
      let repoName: string

      if (githubForm.deploymentMode === 'new') {
        // Skip repository creation - let the deploy API handle it
        setDeploymentState(prev => ({ ...prev, currentStep: 'connecting' }))

        // Get current user to construct repo owner
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          toast({
            title: "Authentication Error",
            description: "Unable to get user information",
            variant: "destructive"
          })
          setDeploymentState(prev => ({ ...prev, isDeploying: false }))
          return
        }

        // Fetch GitHub user info to get the username
        const userResponse = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `Bearer ${storedTokens.github}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        })

        if (!userResponse.ok) {
          toast({
            title: "GitHub API Error",
            description: "Failed to get GitHub user information",
            variant: "destructive"
          })
          setDeploymentState(prev => ({ ...prev, isDeploying: false }))
          return
        }

        const githubUser = await userResponse.json()

        // Set repo data for new repository (will be created by deploy API)
        repoData = {
          url: `https://github.com/${githubUser.login}/${githubForm.repoName}`,
          fullName: `${githubUser.login}/${githubForm.repoName}`,
          name: githubForm.repoName,
          existing: false // Flag to indicate this is a new repo to be created
        }
        repoOwner = githubUser.login
        repoName = githubForm.repoName
      } else if (githubForm.deploymentMode === 'push') {
        // Use connected repository for push
        const connectedRepo = selectedProject.githubRepoUrl?.split('/').slice(-2).join('/') || ''
        if (!connectedRepo) {
          toast({
            title: "No Connected Repository",
            description: "No GitHub repository is connected to this project",
            variant: "destructive"
          })
          setDeploymentState(prev => ({ ...prev, isDeploying: false }))
          return
        }

        repoData = {
          url: selectedProject.githubRepoUrl,
          fullName: connectedRepo,
          name: connectedRepo.split('/')[1]
        }
        repoOwner = connectedRepo.split('/')[0]
        repoName = connectedRepo.split('/')[1]
      } else {
        // Use existing repository
        const selectedRepo = userRepos.find(repo => repo.fullName === githubForm.selectedRepo)
        if (!selectedRepo) {
          toast({
            title: "Repository Not Found",
            description: "Selected repository could not be found. Please refresh and try again.",
            variant: "destructive"
          })
          setDeploymentState(prev => ({ ...prev, isDeploying: false }))
          return
        }

        repoData = {
          url: selectedRepo.url,
          fullName: selectedRepo.fullName,
          name: selectedRepo.name
        }
        repoOwner = selectedRepo.fullName.split('/')[0]
        repoName = selectedRepo.name
      }

      setDeploymentState(prev => ({ ...prev, currentStep: 'deploying' }))

      // Load project files
      const projectFiles = await storageManager.getFiles(selectedProject.id)

      // Deploy code to the repository
      const deployResponse = await fetch('/api/deploy/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject.id,
          githubToken: storedTokens.github,
          repoName: githubForm.deploymentMode === 'new' ? githubForm.repoName : repoName,
          repoDescription: githubForm.deploymentMode === 'new' ? githubForm.repoDescription : '',
          files: projectFiles,
          mode: githubForm.deploymentMode === 'new' ? 'create' : 
                githubForm.deploymentMode === 'existing' ? 'existing' : 'push',
          existingRepo: githubForm.deploymentMode === 'existing' ? repoData.fullName : undefined,
          commitMessage: githubForm.commitMessage || 'Update project files',
        })
      })

      if (!deployResponse.ok) {
        const errorData = await deployResponse.json()
        throw new Error(errorData.error || 'Failed to deploy code')
      }

      const deployData = await deployResponse.json()

      // Update project with GitHub repo URL and deployment status AFTER successful deployment
      await storageManager.updateWorkspace(selectedProject.id, {
        githubRepoUrl: repoData.url,
        githubRepoName: repoData.name || githubForm.repoName,
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

      // Record usage for deployment tracking
      await recordUsage('', 'deploy', 'github')

      // Reload deployed repos to update dropdowns
      await loadDeployedRepos()

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

          {/* Enhanced Project Selection */}
          <Card className="mb-6 bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <Target className="h-5 w-5" />
                <span>Project Selection</span>
              </CardTitle>
              <CardDescription className="text-gray-400">
                Choose a project to deploy.
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
                      <Link href={`/workspace/projects/${selectedProject.slug}`}>
                        <Button variant="outline" size="sm" className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </Link>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    <GitHubIcon className={`h-8 w-8 ${activeTab === 'github' ? 'text-blue-400' : 'text-gray-300'}`} />
                  </div>
                </div>
                <CardTitle className="text-white">GitHub</CardTitle>
                <CardDescription className="text-gray-400">Code repository hosting</CardDescription>
              </CardHeader>
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
                <CardTitle className="text-white">Vercel</CardTitle>
                <CardDescription className="text-gray-400">Deploy frontend applications</CardDescription>
              </CardHeader>
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
                <CardTitle className="text-white">Netlify</CardTitle>
                <CardDescription className="text-gray-400">Deploy static sites & SPAs</CardDescription>
              </CardHeader>
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
                    id="search-deployments"
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
            </div>

            {/* GitHub Deployment Form */}
            {activeTab === 'github' && (
              <div className="space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {/* Deployment Mode Selection */}
                    <div>
                      <Label className="flex items-center space-x-2 text-gray-300">
                        <span>Deployment Mode</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-700 border-gray-600 text-white">
                            <p>Choose to create a new repository or deploy to an existing one</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <div className="flex flex-col space-y-2 mt-2">
                        {/* Show Push Changes option if project has connected repo */}
                        {selectedProject?.githubRepoUrl ? (
                          <div className="p-3 bg-green-900/20 border border-green-700 rounded-lg">
                            <label htmlFor="deployment-push" className="flex items-center space-x-2 cursor-pointer">
                              <input
                                id="deployment-push"
                                type="radio"
                                name="deploymentMode"
                                value="push"
                                checked={githubForm.deploymentMode === 'push'}
                                onChange={(e) => setGithubForm(prev => ({ ...prev, deploymentMode: e.target.value as 'new' | 'existing' | 'push' }))}
                                className="text-green-500"
                              />
                              <div className="flex items-center space-x-2">
                                <span className="text-green-300 font-medium">Push Changes</span>
                                <Badge variant="secondary" className="bg-green-800 text-green-200">
                                  Connected: {selectedProject.githubRepoName || selectedProject.githubRepoUrl?.split('/').slice(-1)[0]}
                                </Badge>
                              </div>
                            </label>
                            <p className="text-sm text-green-400 mt-1 ml-6">
                              Push latest changes to your connected repository
                            </p>
                          </div>
                        ) : null}

                        <label htmlFor="deployment-new" className="flex items-center space-x-2 cursor-pointer">
                          <input
                            id="deployment-new"
                            type="radio"
                            name="deploymentMode"
                            value="new"
                            checked={githubForm.deploymentMode === 'new'}
                            onChange={(e) => setGithubForm(prev => ({ ...prev, deploymentMode: e.target.value as 'new' | 'existing' | 'push' }))}
                            className="text-blue-600"
                          />
                          <span className="text-gray-300">Create New Repository</span>
                        </label>
                        <label htmlFor="deployment-existing" className="flex items-center space-x-2 cursor-pointer">
                          <input
                            id="deployment-existing"
                            type="radio"
                            name="deploymentMode"
                            value="existing"
                            checked={githubForm.deploymentMode === 'existing'}
                            onChange={(e) => setGithubForm(prev => ({ ...prev, deploymentMode: e.target.value as 'new' | 'existing' | 'push' }))}
                            className="text-blue-600"
                          />
                          <span className="text-gray-300">Use Existing Repository</span>
                        </label>
                      </div>
                    </div>

                    {/* Repository Selection for Existing Mode */}
                    {githubForm.deploymentMode === 'existing' && (
                      <div>
                        <Label htmlFor="existing-repo" className="flex items-center space-x-2 text-gray-300">
                          <span>Select Repository</span>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="h-4 w-4 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-700 border-gray-600 text-white">
                              <p>Choose an existing repository to deploy to</p>
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <div className="flex space-x-2 mt-1">
                          <Select
                            value={githubForm.selectedRepo}
                            onValueChange={(value) => setGithubForm(prev => ({ ...prev, selectedRepo: value }))}
                          >
                            <SelectTrigger className="flex-1 bg-gray-700 border-gray-600 text-white">
                              <SelectValue placeholder="Select a repository" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-700 border-gray-600">
                              {userRepos.map((repo) => (
                                <SelectItem
                                  key={repo.fullName}
                                  value={repo.fullName}
                                  className="text-white hover:bg-gray-600"
                                >
                                  <div className="flex items-center space-x-2">
                                    <span>{repo.fullName}</span>
                                    {repo.private && (
                                      <Badge variant="secondary" className="text-xs">Private</Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchUserGitHubRepos}
                            disabled={isLoadingRepos}
                            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                          >
                            {isLoadingRepos ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                          Refresh to load your latest repositories
                        </p>
                      </div>
                    )}

                    {/* Repository Name for New Mode */}
                    {githubForm.deploymentMode === 'new' && (
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
                    )}

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

                    {/* Commit Message - shown for both modes */}
                    <div>
                      <Label htmlFor="commit-message" className="flex items-center space-x-2 text-gray-300">
                        <span>Commit Message</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-700 border-gray-600 text-white">
                            <p>Message for this deployment commit</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="commit-message"
                          value={githubForm.commitMessage}
                          onChange={(e) => setGithubForm(prev => ({ ...prev, commitMessage: e.target.value }))}
                          placeholder="Update project files"
                          className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={generateAutoCommitMessage}
                          disabled={isGeneratingCommitMessage}
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-yellow-400 hover:text-yellow-300 hover:bg-gray-600"
                          title="Generate commit message from last chat"
                        >
                          {isGeneratingCommitMessage ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        This will be the commit message for your deployment. Click ✨ to generate an AI-powered professional commit message from your last chat.
                      </p>
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
                    {/* Token status indicator */}
                    <div className="p-4 bg-gray-800 border border-gray-600 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <GitHubIcon className="h-5 w-5 text-gray-400" />
                          <span className="text-gray-300 font-medium">GitHub Connection</span>
                        </div>
                        {storedTokens.github ? (
                          <div className="flex items-center space-x-2 text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm">Connected</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-yellow-400">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">Not Connected</span>
                          </div>
                        )}
                      </div>
                      {!storedTokens.github && (
                        <div className="mt-2 text-sm text-gray-400">
                          <Link href="/workspace/account" className="text-blue-400 hover:text-blue-300 underline">
                            Set up your GitHub token in Account Settings →
                          </Link>
                        </div>
                      )}
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
                    onClick={handleGitHubDeploy}
                    disabled={deploymentState.isDeploying || !githubForm.repoName || !selectedProject || !storedTokens.github}
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
                {/* Git-based deployment notice */}
                <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <GitHubIcon className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-blue-300 font-medium">Git-Based Deployment</span>
                  </div>
                  <p className="text-sm text-gray-300">
                    Deploy directly from your GitHub repository with automatic builds on every push.
                  </p>
                </div>

                {/* Vercel Setup Instructions */}
                <DeploymentSetupAccordion

                  platform="vercel"
                  connectionStatus={deploymentState.vercelConnected ? 'connected' : 'not_connected'}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {/* Vercel connection status indicator */}
                    <div className="p-4 bg-gray-800 border border-gray-600 rounded-lg">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 bg-black rounded flex items-center justify-center">
                            <VercelIcon className="h-3 w-3 text-white" />
                            </div>
                          <span className="text-gray-300 font-medium">Vercel Connection</span>
                        </div>
                        {storedTokens.vercel ? (
                          <div className="flex items-center space-x-2 text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm">Connected</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-yellow-400">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">Not Connected</span>
                          </div>
                        )}
                      </div>
                      {!storedTokens.vercel && (
                        <div className="mt-2 text-sm text-gray-400">
                          <Link href="/workspace/account" className="text-blue-400 hover:text-blue-300 underline">
                            Set up your Vercel token in Account Settings →
                          </Link>
                        </div>
                      )}
                      {/* Show connected project info */}
                      {selectedProject?.vercelProjectId && (
                        <div className="mt-2 p-2 bg-green-900/20 border border-green-700 rounded">
                          <div className="flex items-center space-x-2">
                            <CheckCircle2 className="h-3 w-3 text-green-400" />
                            <span className="text-xs text-green-300">
                              Project connected: {selectedProject.vercelProjectId}
                            </span>
                          </div>
                          {selectedProject.vercelDeploymentUrl && (
                            <a
                              href={selectedProject.vercelDeploymentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 underline mt-1 block"
                            >
                              {selectedProject.vercelDeploymentUrl}
                            </a>
                          )}
                        </div>
                      )}
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
                      <Label htmlFor="vercel-repo-select" className="text-gray-300">GitHub Repository</Label>
                      <Select value={selectedRepoForVercel || ''} onValueChange={setSelectedRepoForVercel}>
                        <SelectTrigger className="mt-1 bg-gray-700 border-gray-600 text-white">
                          <SelectValue placeholder="Select a GitHub repository to deploy" className="text-gray-400" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          {deployedRepos.map((repo) => (
                            <SelectItem key={repo.id} value={repo.githubRepo} className="text-gray-300 hover:bg-gray-600">
                              {repo.projectName} ({repo.githubRepo})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-400 mt-1">
                        Select the GitHub repository you want to deploy from.
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
                  <Button
                    onClick={async () => {
                      if (!selectedProject) return

                      // Check if Vercel token is available in stored tokens
                      if (!storedTokens.vercel) {
                        toast({
                          title: "Vercel Token Required",
                          description: (
                            <div>
                              <p>You need to set up your Vercel token in your account settings first.</p>
                              <Link href="/workspace/account" className="text-blue-400 hover:text-blue-300 underline">
                                Go to Account Settings →
                              </Link>
                            </div>
                          ),
                          variant: "destructive"
                        })
                        return
                      }

                      const isRedeploy = selectedProject.vercelProjectId && selectedProject.githubRepoUrl

                      // Check if GitHub repository is selected (for new deployments)
                      if (!isRedeploy && !selectedRepoForVercel) {
                        toast({
                          title: "GitHub Repository Required",
                          description: "Please select a GitHub repository to deploy from",
                          variant: "destructive"
                        })
                        return
                      }

                      // Check if project name is provided (for new deployments)
                      if (!isRedeploy && !vercelForm.projectName) {
                        toast({
                          title: "Project Name Required",
                          description: "Please enter a project name",
                          variant: "destructive"
                        })
                        return
                      }

                      // Check plan limits for Vercel deployment
                      const planCheck = await checkPlanLimits('', 'deploy', 'vercel')
                      if (!planCheck.canPerform) {
                        throw new Error(planCheck.reason || 'Deployment not allowed with your current plan.')
                      }

                      setDeploymentState(prev => ({ ...prev, isDeploying: true, currentStep: 'deploying' }))

                      try {
                        // Get environment variables for this project
                        const envVars = await storageManager.getEnvironmentVariables(selectedProject.id)

                        // Deploy from GitHub repository
                        const deployResponse = await fetch('/api/vercel/deploy', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            projectName: isRedeploy ? undefined : vercelForm.projectName,
                            framework: vercelForm.framework,
                            token: storedTokens.vercel,
                            workspaceId: selectedProject.id,
                            githubRepo: isRedeploy ? selectedProject.githubRepoUrl?.split('/').slice(-2).join('/') : selectedRepoForVercel,
                            githubToken: storedTokens.github,
                            environmentVariables: isRedeploy ? undefined : envVars, // Don't update env vars on redeploy
                            mode: isRedeploy ? 'redeploy' : 'deploy',
                            existingProjectId: isRedeploy ? selectedProject.vercelProjectId : undefined,
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
                          vercelProjectId: deployData.projectId || selectedProject.vercelProjectId,
                          deploymentStatus: 'deployed',
                          lastActivity: new Date().toISOString(),
                        })

                        // Create deployment record
                        await storageManager.createDeployment({
                          workspaceId: selectedProject.id,
                          url: deployData.url,
                          status: 'ready',
                          commitSha: deployData.commitSha || 'latest',
                          commitMessage: deployData.commitMessage || (isRedeploy ? 'Redeployed to Vercel' : 'Deployed to Vercel'),
                          branch: 'main',
                          environment: 'production',
                          provider: 'vercel'
                        })

                        // Record usage for deployment tracking
                        await recordUsage('', 'deploy', 'vercel')

                        // Reload deployed repos to update dropdowns
                        await loadDeployedRepos()

                        // Trigger real-time sync by dispatching a custom event
                        window.dispatchEvent(new CustomEvent('projectUpdated', {
                          detail: { projectId: selectedProject.id, action: 'deployed', url: deployData.url }
                        }))

                        toast({
                          title: isRedeploy ? 'Redeployment Successful' : 'Deployment Successful',
                          description: `Successfully ${isRedeploy ? 're' : ''}deployed to Vercel at ${deployData.url}`
                        })
                        setDeploymentState(prev => ({ ...prev, isDeploying: false, currentStep: 'complete' }))

                        // Add direct link to view deployed project
                        setTimeout(() => {
                          const viewLink = document.createElement('a')
                          viewLink.href = deployData.url
                          viewLink.target = '_blank'
                          viewLink.rel = 'noopener noreferrer'
                          viewLink.innerHTML = '🔗 View Deployed Project'
                          viewLink.className = 'ml-2 inline-flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors'

                          // Find and enhance the toast message
                          const toastMessages = document.querySelectorAll('[data-toast]')
                          toastMessages.forEach(toast => {
                            const existingLink = toast.querySelector('a[href="' + deployData.url + '"]')
                            if (!existingLink && toast.textContent?.includes('Successfully')) {
                              toast.appendChild(viewLink.cloneNode(true))
                            }
                          })
                        }, 500)

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
                    disabled={deploymentState.isDeploying || !storedTokens.vercel || (!selectedProject?.vercelProjectId && !selectedRepoForVercel)}
                    className="sm:ml-auto bg-blue-600 hover:bg-blue-700"
                  >
                    {deploymentState.isDeploying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {selectedProject?.vercelProjectId ? 'Redeploying...' : 'Deploying...'}
                      </>
                    ) : (
                      <>
                        <Rocket className="mr-2 h-4 w-4" />
                        {selectedProject?.vercelProjectId ? 'Redeploy to Vercel' : 'Deploy to Vercel from Git'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Netlify Deployment Form */}
            {activeTab === 'netlify' && (
              <div className="space-y-6">
                {/* Git-based deployment notice */}
                <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <GitHubIcon className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-green-300 font-medium">Git-Based Deployment</span>
                  </div>
                  <p className="text-sm text-gray-300">
                    Deploy directly from your GitHub repository with automatic builds on every push.
                  </p>
                </div>

                {/* Netlify Setup Instructions */}
                <DeploymentSetupAccordion
                  platform="netlify"
                  connectionStatus={deploymentState.netlifyConnected ? 'connected' : 'not_connected'}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {/* Netlify connection status indicator */}
                    <div className="p-4 bg-gray-800 border border-gray-600 rounded-lg">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 bg-green-600 rounded flex items-center justify-center">
                            <NetlifyIcon className="h-3 w-3 text-white" />
                            </div>
                          <span className="text-gray-300 font-medium">Netlify Connection</span>
                        </div>
                        {storedTokens.netlify ? (
                          <div className="flex items-center space-x-2 text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm">Connected</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-yellow-400">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">Not Connected</span>
                          </div>
                        )}
                      </div>
                      {!storedTokens.netlify && (
                        <div className="mt-2 text-sm text-gray-400">
                          <Link href="/workspace/account" className="text-blue-400 hover:text-blue-300 underline">
                            Set up your Netlify token in Account Settings →
                          </Link>
                        </div>
                      )}
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
                      <Label htmlFor="netlify-repo-select" className="text-gray-300">GitHub Repository</Label>
                      <Select value={selectedRepoForNetlify || ''} onValueChange={setSelectedRepoForNetlify}>
                        <SelectTrigger className="mt-1 bg-gray-700 border-gray-600 text-white">
                          <SelectValue placeholder="Select a GitHub repository to deploy" className="text-gray-400" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          {deployedRepos.map((repo) => (
                            <SelectItem key={repo.id} value={repo.githubRepo} className="text-gray-300 hover:bg-gray-600">
                              {repo.projectName} ({repo.githubRepo})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-400 mt-1">
                        Select the GitHub repository you want to deploy from.
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
                  <Button
                    onClick={async () => {
                      if (!selectedProject) return

                      // Check if Netlify token is available in stored tokens
                      if (!storedTokens.netlify) {
                        toast({
                          title: "Netlify Token Required",
                          description: (
                            <div>
                              <p>You need to set up your Netlify token in your account settings first.</p>
                              <Link href="/workspace/account" className="text-blue-400 hover:text-blue-300 underline">
                                Go to Account Settings →
                              </Link>
                            </div>
                          ),
                          variant: "destructive"
                        })
                        return
                      }

                      // Check if GitHub repository is selected
                      if (!selectedRepoForNetlify) {
                        toast({
                          title: "GitHub Repository Required",
                          description: "Please select a GitHub repository to deploy from",
                          variant: "destructive"
                        })
                        return
                      }

                      // Check if Netlify token is available in stored tokens
                      if (!storedTokens.netlify) {
                        throw new Error('Netlify token not configured. Please set up your Netlify token in Account Settings.')
                      }

                      // Check plan limits for Netlify deployment
                      const planCheck = await checkPlanLimits('', 'deploy', 'netlify')
                      if (!planCheck.canPerform) {
                        throw new Error(planCheck.reason || 'Deployment not allowed with your current plan.')
                      }

                      setDeploymentState(prev => ({ ...prev, isDeploying: true, currentStep: 'deploying' }))

                      try {
                        // Get environment variables for this project
                        const envVars = await storageManager.getEnvironmentVariables(selectedProject.id)

                        // Deploy from GitHub repository
                        const deployResponse = await fetch('/api/netlify/deploy', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            siteName: netlifyForm.siteName,
                            buildCommand: netlifyForm.buildCommand,
                            publishDir: netlifyForm.publishDir,
                            token: storedTokens.netlify,
                            workspaceId: selectedProject.id,
                            githubRepo: selectedRepoForNetlify,
                            environmentVariables: envVars,
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
                          commitMessage: deployData.commitMessage || 'Deployed to Netlify',
                          branch: 'main',
                          environment: 'production',
                          provider: 'netlify'
                        })

                        // Record usage for deployment tracking
                        await recordUsage('', 'deploy', 'netlify')

                        // Reload deployed repos to update dropdowns
                        await loadDeployedRepos()

                        // Trigger real-time sync by dispatching a custom event
                        window.dispatchEvent(new CustomEvent('projectUpdated', {
                          detail: { projectId: selectedProject.id, action: 'deployed', url: deployData.url }
                        }))

                        toast({
                          title: 'Deployment Successful',
                          description: `Successfully deployed to Netlify at ${deployData.url}`
                        })
                        setDeploymentState(prev => ({ ...prev, isDeploying: false, currentStep: 'complete' }))

                        // Add direct link to view deployed project
                        setTimeout(() => {
                          const viewLink = document.createElement('a')
                          viewLink.href = deployData.url
                          viewLink.target = '_blank'
                          viewLink.rel = 'noopener noreferrer'
                          viewLink.innerHTML = '🔗 View Deployed Project'
                          viewLink.className = 'ml-2 inline-flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors'

                          // Find and enhance the toast message
                          const toastMessages = document.querySelectorAll('[data-toast]')
                          toastMessages.forEach(toast => {
                            const existingLink = toast.querySelector('a[href="' + deployData.url + '"]')
                            if (!existingLink && toast.textContent?.includes('Successfully deployed')) {
                              toast.appendChild(viewLink.cloneNode(true))
                            }
                          })
                        }, 500)

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
                    disabled={deploymentState.isDeploying || !storedTokens.netlify || !selectedRepoForNetlify}
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
                        Deploy to Netlify from Git
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
                                <GitHubIcon className="h-3 w-3 mr-1" />
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