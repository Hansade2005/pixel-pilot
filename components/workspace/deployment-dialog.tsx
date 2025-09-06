"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { storageManager } from "@/lib/storage-manager"
import { Github, Globe, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { DeploymentSetupAccordion } from "./deployment-setup-accordion"
import type { Workspace as Project } from "@/lib/storage-manager"

interface DeploymentDialogProps {
  project: Project | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type DeploymentStep = 'github' | 'vercel' | 'netlify' | 'pipilot' | 'complete'

interface DeploymentState {
  step: DeploymentStep
  isLoading: boolean
  githubRepoUrl?: string
  vercelDeploymentUrl?: string
  netlifyDeploymentUrl?: string
  pipilotDeploymentUrl?: string
  error?: string
}

export function DeploymentDialog({ project, open, onOpenChange }: DeploymentDialogProps) {
  const { toast } = useToast()
  const [deploymentState, setDeploymentState] = useState<DeploymentState>({
    step: 'github',
    isLoading: false,
  })

  const [formData, setFormData] = useState({
    githubToken: '',
    repoName: project?.name?.toLowerCase().replace(/\s+/g, '-') || '',
    repoDescription: project?.description || '',
    vercelToken: '',
    netlifyToken: '',
    siteName: project?.name?.toLowerCase().replace(/\s+/g, '-') || '',
    subdomain: project?.name?.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || '',
  })

  // Removed subdomainStatus - now using Cloudflare Pages project names

  const [hasGitHubToken, setHasGitHubToken] = useState(false)
  const [githubConnectionStatus, setGitHubConnectionStatus] = useState<'checking' | 'connected' | 'not_connected' | 'connecting'>('checking')
  const [hasVercelToken, setHasVercelToken] = useState(false)
  const [vercelConnectionStatus, setVercelConnectionStatus] = useState<'checking' | 'connected' | 'not_connected' | 'connecting'>('checking')
  const [hasNetlifyToken, setHasNetlifyToken] = useState(false)
  const [netlifyConnectionStatus, setNetlifyConnectionStatus] = useState<'checking' | 'connected' | 'not_connected' | 'connecting'>('checking')

  // Subdomain checking removed - now using Cloudflare Pages project names
  // Removed subdomain availability checking

  // Check if user has tokens on dialog open
  React.useEffect(() => {
    if (open && project) {
      checkGitHubToken()
      checkVercelToken()
      checkNetlifyToken()
    }
  }, [open, project])

  const checkGitHubToken = async () => {
    setGitHubConnectionStatus('checking')
    try {
      // First, check user authentication
      const response = await fetch('/api/auth/github/check')
      const data = await response.json()
      
      if (!data.userId) {
        setGitHubConnectionStatus('not_connected')
        return
      }
      
      // Check if token exists in IndexedDB using storageManager
      const token = await storageManager.getToken(data.userId, 'github')
      
      setHasGitHubToken(!!token)
      setGitHubConnectionStatus(!!token ? 'connected' : 'not_connected')
      if (token) {
        setFormData(prev => ({ ...prev, githubToken: 'stored' }))
      }
    } catch (error) {
      console.error('Error checking GitHub token:', error)
      setGitHubConnectionStatus('not_connected')
    }
  }

  const checkVercelToken = async () => {
    setVercelConnectionStatus('checking')
    try {
      // First, check user authentication
      const response = await fetch('/api/auth/vercel/check')
      const data = await response.json()
      
      if (!data.userId) {
        setVercelConnectionStatus('not_connected')
        return
      }
      
      // Check if token exists in IndexedDB using storageManager
      const token = await storageManager.getToken(data.userId, 'vercel')
      
      setHasVercelToken(!!token)
      setVercelConnectionStatus(!!token ? 'connected' : 'not_connected')
      if (token) {
        setFormData(prev => ({ ...prev, vercelToken: 'stored' }))
      }
    } catch (error) {
      console.error('Error checking Vercel token:', error)
      setVercelConnectionStatus('not_connected')
    }
  }

  const checkNetlifyToken = async () => {
    setNetlifyConnectionStatus('checking')
    try {
      // First, check user authentication
      const response = await fetch('/api/auth/netlify/check')
      const data = await response.json()
      
      if (!data.userId) {
        setNetlifyConnectionStatus('not_connected')
        return
      }
      
      // Check if token exists in IndexedDB using storageManager
      const token = await storageManager.getToken(data.userId, 'netlify')
      
      setHasNetlifyToken(!!token)
      setNetlifyConnectionStatus(!!token ? 'connected' : 'not_connected')
      if (token) {
        setFormData(prev => ({ ...prev, netlifyToken: 'stored' }))
      }
    } catch (error) {
      console.error('Error checking Netlify token:', error)
      setNetlifyConnectionStatus('not_connected')
    }
  }

  const validateAndStoreVercelToken = async (token: string) => {
    setVercelConnectionStatus('connecting')
    try {
      // Validate token with Vercel API directly
      const validateResp = await fetch('https://api.vercel.com/v2/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!validateResp.ok) {
        throw new Error('Invalid Vercel token');
      }
      
      const userData = await validateResp.json();
      
      // Get user ID from auth endpoint
      const userResp = await fetch('/api/auth/vercel/check');
      const { userId } = await userResp.json();
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      // Store token in IndexedDB
;
      await storageManager.createToken({
        userId,
        provider: 'vercel',
        token
      });

      setHasVercelToken(true);
      setVercelConnectionStatus('connected');
      setFormData(prev => ({ ...prev, vercelToken: 'stored' }));
      
      toast({
        title: "Vercel Connected!",
        description: `Connected as ${userData.user?.name || userData.user?.email || 'Vercel User'}`,
      });

      return true
    } catch (error) {
      console.error('Vercel token validation error:', error)
      setVercelConnectionStatus('not_connected')
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : 'Failed to validate Vercel token',
        variant: "destructive",
      })
      return false
    }
  }
  
  const validateAndStoreNetlifyToken = async (token: string) => {
    setNetlifyConnectionStatus('connecting')
    try {
      // Validate token with Netlify API directly
      const validateResp = await fetch('https://api.netlify.com/api/v1/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!validateResp.ok) {
        throw new Error('Invalid Netlify token');
      }
      
      const userData = await validateResp.json();
      
      // Get user ID from auth endpoint
      const userResp = await fetch('/api/auth/netlify/check');
      const { userId } = await userResp.json();
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      // Store token in IndexedDB
;
      await storageManager.createToken({
        userId,
        provider: 'netlify',
        token
      });

      setHasNetlifyToken(true);
      setNetlifyConnectionStatus('connected');
      setFormData(prev => ({ ...prev, netlifyToken: 'stored' }));
      
      toast({
        title: "Netlify Connected!",
        description: `Connected as ${userData.name || userData.email || 'Netlify User'}`,
      });

      return true
    } catch (error) {
      console.error('Netlify token validation error:', error)
      setNetlifyConnectionStatus('not_connected')
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : 'Failed to validate Netlify token',
        variant: "destructive",
      })
      return false
    }
  }

  const connectToGitHub = async () => {
    setGitHubConnectionStatus('connecting')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          scopes: 'repo read:user workflow',
          redirectTo: `https://dev.pixelways.co/api/auth/github/callback?next=${encodeURIComponent('/workspace')}`,
          skipBrowserRedirect: false,
        },
      })
      
      if (error) {
        throw error
      }
      
      // The OAuth flow will redirect, so we don't need to handle success here
    } catch (error) {
      console.error('GitHub connection error:', error)
      setGitHubConnectionStatus('not_connected')
      toast({
        title: "Connection Failed",
        description: "Could not connect to GitHub. Please try again.",
        variant: "destructive",
      })
    }
  }
  
  const validateAndStoreGitHubToken = async (token: string) => {
    setGitHubConnectionStatus('connecting')
    try {
      // Validate token with GitHub API directly
      const validateResp = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
        },
      });
      
      if (!validateResp.ok) {
        throw new Error('Invalid GitHub token');
      }
      
      const userData = await validateResp.json();
      
      // Get user ID from auth endpoint
      const userResp = await fetch('/api/auth/github/check');
      const { userId } = await userResp.json();
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      // Store token in IndexedDB
;
      await storageManager.createToken({
        userId,
        provider: 'github',
        token
      });

      setHasGitHubToken(true);
      setGitHubConnectionStatus('connected');
      setFormData(prev => ({ ...prev, githubToken: 'stored' }));
      
      toast({
        title: "GitHub Connected!",
        description: `Connected as ${userData.login || userData.name || 'GitHub User'}`,
      });

      return true
    } catch (error) {
      console.error('GitHub token validation error:', error)
      setGitHubConnectionStatus('not_connected')
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : 'Failed to validate GitHub token',
        variant: "destructive",
      })
      return false
    }
  }

  const connectToVercel = async () => {
    setVercelConnectionStatus('connecting')
    try {
      // Vercel uses Personal Access Tokens, not OAuth
      // Users need to create tokens manually from their Vercel dashboard
      toast({
        title: "Vercel Integration",
        description: "Please create a Personal Access Token from your Vercel dashboard and enter it below.",
      })
      setVercelConnectionStatus('not_connected')
    } catch (error) {
      console.error('Vercel connection error:', error)
      setVercelConnectionStatus('not_connected')
      toast({
        title: "Connection Failed",
        description: "Could not connect to Vercel. Please try again.",
        variant: "destructive",
      })
    }
  }

  const connectToNetlify = async () => {
    setNetlifyConnectionStatus('connecting')
    try {
      // Netlify uses Personal Access Tokens, not OAuth
      // Users need to create tokens manually from their Netlify dashboard
      toast({
        title: "Netlify Integration",
        description: "Please create a Personal Access Token from your Netlify dashboard and enter it below.",
      })
      setNetlifyConnectionStatus('not_connected')
    } catch (error) {
      console.error('Netlify connection error:', error)
      setNetlifyConnectionStatus('not_connected')
      toast({
        title: "Connection Failed",
        description: "Could not connect to Netlify. Please try again.",
        variant: "destructive",
      })
    }
  }

  const deployToNetlify = async () => {
    if (!project || !formData.siteName) {
      toast({
        title: "Missing Information",
        description: "Please provide site name",
        variant: "destructive",
      })
      return
    }

    setDeploymentState(prev => ({ ...prev, isLoading: true, error: undefined }))

    try {
      // Fetch files from IndexedDB client-side
      await storageManager.init()
      const files = await storageManager.getFiles(project.id)
      
      if (!files || files.length === 0) {
        throw new Error('No files found in project')
      }
      
      // Get user ID and token
      const userResp = await fetch('/api/auth/netlify/check')
      const { userId } = await userResp.json()
      
      if (!userId) {
        throw new Error('User not authenticated')
      }
      
      // If using stored token, get it from IndexedDB
      let tokenToUse = formData.netlifyToken
      if (tokenToUse === 'stored') {
        const token = await storageManager.getToken(userId, 'netlify')
        if (!token) {
          throw new Error('Netlify token not found in storage')
        }
        tokenToUse = token.token
      }
      
      if (!tokenToUse) {
        throw new Error('Netlify token is required')
      }

      const response = await fetch('/api/deploy/netlify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          netlifyToken: tokenToUse,
          siteName: formData.siteName,
          siteDescription: project.description,
          files: files,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to deploy to Netlify')
      }

      const result = await response.json()
      
      setDeploymentState(prev => ({
        ...prev,
        isLoading: false,
        netlifyDeploymentUrl: result.siteUrl,
        step: 'complete',
      }))

      toast({
        title: "Netlify Deployment Successful",
        description: "Your app is now live on Netlify",
      })

    } catch (error) {
      setDeploymentState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to deploy to Netlify',
      }))

      toast({
        title: "Netlify Deployment Failed",
        description: error instanceof Error ? error.message : 'Failed to deploy to Netlify',
        variant: "destructive",
      })
    }
  }

  const deployToPiPilot = async () => {
    if (!project || !formData.subdomain) {
      toast({
        title: "Missing Information",
        description: "Please provide project name",
        variant: "destructive",
      })
      return
    }

    setDeploymentState(prev => ({ ...prev, isLoading: true, error: undefined }))

    try {
      // Fetch files from IndexedDB client-side
      await storageManager.init()
      const files = await storageManager.getFiles(project.id)

      if (!files || files.length === 0) {
        throw new Error('No files found in project')
      }

      const response = await fetch('/api/deploy/wildcard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: project.id,
          projectName: formData.subdomain, // Using subdomain field as project name for Cloudflare Pages
          files: files,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to deploy to PiPilot')
      }

      const result = await response.json()

      setDeploymentState(prev => ({
        ...prev,
        isLoading: false,
        pipilotDeploymentUrl: result.url,
        step: 'complete',
      }))

      // Store deployment info in IndexedDB
      await storageManager.init()

      // Update the deployment record with the returned ID
      if (result.deploymentId) {
        await storageManager.updateDeployment(result.deploymentId, {
          status: 'ready',
          url: result.url
        })
      }

      toast({
        title: "PiPilot Deployment Successful",
        description: `Your app is now live at ${result.url}`,
      })

    } catch (error) {
      setDeploymentState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to deploy to PiPilot',
      }))

      toast({
        title: "PiPilot Deployment Failed",
        description: error instanceof Error ? error.message : 'Failed to deploy to PiPilot',
        variant: "destructive",
      })
    }
  }

  const resetState = () => {
    setDeploymentState({
      step: 'pipilot',
      isLoading: false,
    })
    setFormData({
      githubToken: '',
      repoName: project?.name?.toLowerCase().replace(/\s+/g, '-') || '',
      repoDescription: project?.description || '',
      vercelToken: '',
      netlifyToken: '',
      siteName: project?.name?.toLowerCase().replace(/\s+/g, '-') || '',
      subdomain: project?.name?.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || '',
    })
    setGitHubConnectionStatus('checking')
    setVercelConnectionStatus('checking')
    setNetlifyConnectionStatus('checking')
  }

  const deployToGitHub = async () => {
    if (!project || !formData.repoName) {
      toast({
        title: "Missing Information",
        description: "Please provide repository name",
        variant: "destructive",
      })
      return
    }

    setDeploymentState(prev => ({ ...prev, isLoading: true, error: undefined }))

    try {
      // Fetch files from IndexedDB client-side
      await storageManager.init()
      const files = await storageManager.getFiles(project.id)
      
      if (!files || files.length === 0) {
        throw new Error('No files found in project')
      }
      
      // Get user ID and token
      const userResp = await fetch('/api/auth/github/check')
      const { userId } = await userResp.json()
      
      if (!userId) {
        throw new Error('User not authenticated')
      }
      
      // If using stored token, get it from IndexedDB
      let tokenToUse = formData.githubToken
      if (tokenToUse === 'stored') {
        const token = await storageManager.getToken(userId, 'github')
        if (!token) {
          throw new Error('GitHub token not found in storage')
        }
        tokenToUse = token.token
      }
      
      if (!tokenToUse) {
        throw new Error('GitHub token is required')
      }

      const response = await fetch('/api/deploy/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          githubToken: tokenToUse,
          repoName: formData.repoName,
          repoDescription: formData.repoDescription,
          files: files,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to deploy to GitHub')
      }

      const result = await response.json()
      
      setDeploymentState(prev => ({
        ...prev,
        isLoading: false,
        githubRepoUrl: result.repoUrl,
        step: 'vercel',
      }))

      toast({
        title: "GitHub Deployment Successful",
        description: "Your project has been pushed to GitHub",
      })

    } catch (error) {
      setDeploymentState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to deploy to GitHub',
      }))

      toast({
        title: "GitHub Deployment Failed",
        description: error instanceof Error ? error.message : 'Failed to deploy to GitHub',
        variant: "destructive",
      })
    }
  }

  const deployToVercel = async () => {
    if (!project || !deploymentState.githubRepoUrl) {
      toast({
        title: "Missing Information",
        description: "Please complete GitHub deployment first",
        variant: "destructive",
      })
      return
    }

    setDeploymentState(prev => ({ ...prev, isLoading: true, error: undefined }))

    try {
      // If using a new token, validate it first
      if (formData.vercelToken !== 'stored') {
        const isValid = await validateAndStoreVercelToken(formData.vercelToken)
        if (!isValid) {
          setDeploymentState(prev => ({ ...prev, isLoading: false }))
          return
        }
      }
      
      // Get user ID and token
      const userResp = await fetch('/api/auth/vercel/check')
      const { userId } = await userResp.json()
      
      if (!userId) {
        throw new Error('User not authenticated')
      }
      
      // Get token from IndexedDB
      let tokenToUse = formData.vercelToken
      if (tokenToUse === 'stored') {
        const token = await storageManager.getToken(userId, 'vercel')
        if (!token) {
          throw new Error('Vercel token not found in storage')
        }
        tokenToUse = token.token
      }
      
      if (!tokenToUse) {
        throw new Error('Vercel token is required')
      }

      const response = await fetch('/api/deploy/vercel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          vercelToken: tokenToUse,
          githubRepoName: deploymentState.githubRepoUrl?.split('/').slice(-2).join('/'),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to deploy to Vercel')
      }

      const result = await response.json()
      
      setDeploymentState(prev => ({
        ...prev,
        isLoading: false,
        vercelDeploymentUrl: result.url,
        step: 'netlify',
      }))

      toast({
        title: "Vercel Deployment Successful",
        description: "Your app is now live on Vercel",
      })

    } catch (error) {
      setDeploymentState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to deploy to Vercel',
      }))

      toast({
        title: "Vercel Deployment Failed",
        description: error instanceof Error ? error.message : 'Failed to deploy to Vercel',
        variant: "destructive",
      })
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(resetState, 300) // Reset after dialog closes
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Deploy Project</DialogTitle>
          <DialogDescription>
            Deploy your project to GitHub and Vercel for production hosting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-2 ${
              deploymentState.step === 'pipilot' ? 'text-accent' :
              deploymentState.pipilotDeploymentUrl ? 'text-green-500' : 'text-muted-foreground'
            }`}>
              {deploymentState.pipilotDeploymentUrl ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Globe className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">PiPilot</span>
            </div>
            <Separator className="flex-1" />
            <div className={`flex items-center space-x-2 ${
              deploymentState.step === 'github' ? 'text-accent' :
              deploymentState.githubRepoUrl ? 'text-green-500' : 'text-muted-foreground'
            }`}>
              {deploymentState.githubRepoUrl ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Github className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">GitHub</span>
            </div>
            <Separator className="flex-1" />
            <div className={`flex items-center space-x-2 ${
              deploymentState.step === 'vercel' ? 'text-accent' :
              deploymentState.vercelDeploymentUrl ? 'text-green-500' : 'text-muted-foreground'
            }`}>
              {deploymentState.vercelDeploymentUrl ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Globe className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">Vercel</span>
            </div>
            <Separator className="flex-1" />
            <div className={`flex items-center space-x-2 ${
              deploymentState.step === 'netlify' ? 'text-accent' :
              deploymentState.netlifyDeploymentUrl ? 'text-green-500' : 'text-muted-foreground'
            }`}>
              {deploymentState.netlifyDeploymentUrl ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Globe className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">Netlify</span>
            </div>
          </div>

          {/* Error Display */}
          {deploymentState.error && (
            <div className="flex items-center space-x-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{deploymentState.error}</span>
            </div>
          )}

          {/* PiPilot Step */}
          {deploymentState.step === 'pipilot' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Deploy to PiPilot.dev Subdomain
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Your project will be deployed to Cloudflare Pages with a real .pages.dev domain
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subdomain">Project Name</Label>
                <Input
                  id="subdomain"
                  placeholder="my-awesome-project"
                  value={formData.subdomain}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
                  }))}
                  disabled={deploymentState.isLoading}
                />

                {/* Removed subdomain availability checking - using Cloudflare Pages */}

                <p className="text-xs text-muted-foreground">
                  Your site will be available at: <strong>{formData.subdomain || 'yoursite'}.pages.dev</strong>
                </p>
              </div>

              <Button
                onClick={deployToPiPilot}
                disabled={
                  deploymentState.isLoading ||
                  !formData.subdomain ||
                  !/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(formData.subdomain)
                }
                className="w-full"
              >
                {deploymentState.isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deploying to PiPilot...
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    Deploy to PiPilot.dev
                  </>
                )}
              </Button>

              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeploymentState(prev => ({ ...prev, step: 'github' }))}
                  disabled={deploymentState.isLoading}
                >
                  Or deploy to other platforms →
                </Button>
              </div>
            </div>
          )}

          {/* GitHub Step */}
          {deploymentState.step === 'github' && (
            <div className="space-y-4">
              <DeploymentSetupAccordion
                platform="github"
                connectionStatus={githubConnectionStatus}
                onConnect={connectToGitHub}
              />

              {/* Manual Token Input (Alternative) */}
              {githubConnectionStatus === 'not_connected' && (
                <div className="space-y-2">
                  <Label htmlFor="github-token">GitHub Personal Access Token (Alternative)</Label>
                  <Input
                    id="github-token"
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxx"
                    value={formData.githubToken === 'stored' ? '' : formData.githubToken}
                    onChange={(e) => setFormData(prev => ({ ...prev, githubToken: e.target.value }))}
                    disabled={deploymentState.isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Create a token at GitHub → Settings → Developer settings → Personal access tokens
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="repo-name">Repository Name</Label>
                <Input
                  id="repo-name"
                  placeholder="my-awesome-app"
                  value={formData.repoName}
                  onChange={(e) => setFormData(prev => ({ ...prev, repoName: e.target.value }))}
                  disabled={deploymentState.isLoading}
                />
              </div>

                              <div className="space-y-2">
                  <Label htmlFor="repo-description">Description (Optional)</Label>
                  <Textarea
                    id="repo-description"
                    placeholder="A brief description of your project"
                    value={formData.repoDescription}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, repoDescription: e.target.value }))}
                    disabled={deploymentState.isLoading}
                  />
                </div>

              <Button
                onClick={deployToGitHub}
                disabled={
                  deploymentState.isLoading || 
                  githubConnectionStatus === 'checking' ||
                  githubConnectionStatus === 'connecting' ||
                  (githubConnectionStatus === 'not_connected' && formData.githubToken !== 'stored') ||
                  !formData.repoName
                }
                className="w-full"
              >
                {deploymentState.isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deploying to GitHub...
                  </>
                ) : (
                  <>
                    <Github className="h-4 w-4 mr-2" />
                    Deploy to GitHub
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Vercel Step */}
          {deploymentState.step === 'vercel' && (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center space-x-2 text-green-700 dark:text-green-300">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">GitHub deployment complete!</span>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Repository: {deploymentState.githubRepoUrl}
                </p>
              </div>

              <DeploymentSetupAccordion
                platform="vercel"
                connectionStatus={vercelConnectionStatus}
                onConnect={connectToVercel}
              />

              {/* Manual Token Input */}
              {vercelConnectionStatus === 'not_connected' && (
                <div className="space-y-2">
                  <Label htmlFor="vercel-token">Vercel Access Token</Label>
                  <Input
                    id="vercel-token"
                    type="password"
                    placeholder="vercel_xxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={formData.vercelToken === 'stored' ? '' : formData.vercelToken}
                    onChange={(e) => setFormData(prev => ({ ...prev, vercelToken: e.target.value }))}
                    disabled={deploymentState.isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your token will be securely stored for future deployments.
                  </p>
                </div>
              )}

              <Button
                onClick={deployToVercel}
                disabled={
                  deploymentState.isLoading || 
                  vercelConnectionStatus === 'checking' ||
                  (vercelConnectionStatus === 'not_connected' && !formData.vercelToken)
                }
                className="w-full"
              >
                {deploymentState.isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deploying to Vercel...
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    Deploy to Vercel
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Netlify Step */}
          {deploymentState.step === 'netlify' && (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center space-x-2 text-green-700 dark:text-green-300">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Vercel deployment complete!</span>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Deployment URL: {deploymentState.vercelDeploymentUrl}
                </p>
              </div>

              <DeploymentSetupAccordion
                platform="netlify"
                connectionStatus={netlifyConnectionStatus}
                onConnect={connectToNetlify}
              />

              {/* Manual Token Input */}
              {netlifyConnectionStatus === 'not_connected' && (
                <div className="space-y-2">
                  <Label htmlFor="netlify-token">Netlify Personal Access Token</Label>
                  <Input
                    id="netlify-token"
                    type="password"
                    placeholder="ntl_xxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={formData.netlifyToken === 'stored' ? '' : formData.netlifyToken}
                    onChange={(e) => setFormData(prev => ({ ...prev, netlifyToken: e.target.value }))}
                    disabled={deploymentState.isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Create a token at Netlify → User Settings → Applications → Personal access tokens
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="site-name">Site Name</Label>
                <Input
                  id="site-name"
                  placeholder="my-awesome-app"
                  value={formData.siteName}
                  onChange={(e) => setFormData(prev => ({ ...prev, siteName: e.target.value }))}
                  disabled={deploymentState.isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  This will be used as your Netlify site name
                </p>
              </div>

              <Button
                onClick={deployToNetlify}
                disabled={
                  deploymentState.isLoading || 
                  netlifyConnectionStatus === 'checking' ||
                  (netlifyConnectionStatus === 'not_connected' && !formData.netlifyToken) ||
                  !formData.siteName
                }
                className="w-full"
              >
                {deploymentState.isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deploying to Netlify...
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    Deploy to Netlify
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Complete Step */}
          {deploymentState.step === 'complete' && (
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Deployment Complete!</h3>
                <p className="text-muted-foreground mb-4">
                  Your project has been successfully deployed to production.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Github className="h-4 w-4" />
                    <span className="text-sm font-medium">GitHub Repository</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(deploymentState.githubRepoUrl, '_blank')}
                  >
                    View
                  </Button>
                </div>

                {deploymentState.pipilotDeploymentUrl && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4" />
                      <span className="text-sm font-medium">PiPilot Deployment</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(deploymentState.pipilotDeploymentUrl, '_blank')}
                    >
                      Visit
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4" />
                    <span className="text-sm font-medium">Vercel Deployment</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(deploymentState.vercelDeploymentUrl, '_blank')}
                  >
                    Visit
                  </Button>
                </div>

                {deploymentState.netlifyDeploymentUrl && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4" />
                      <span className="text-sm font-medium">Netlify Deployment</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(deploymentState.netlifyDeploymentUrl, '_blank')}
                    >
                      Visit
                    </Button>
                  </div>
                )}
              </div>

              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
