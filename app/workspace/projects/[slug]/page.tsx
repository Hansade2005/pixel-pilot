"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Globe,
  Github,
  Settings,
  ExternalLink,
  Calendar,
  Rocket,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Activity,
  Code,
  FileText,
  GitBranch,
  Clock,
  Plus,
  Database,
  Trash2,
  CheckCircle2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { storageManager, type Workspace as Project, type Deployment, type EnvironmentVariable } from "@/lib/storage-manager"
import { createClient } from "@/lib/supabase/client"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { SupabaseConnectionManager } from "@/components/supabase-connection-manager"
import Link from "next/link"

interface ProjectDetails extends Project {
  deployments: Deployment[]
  environmentVariables: EnvironmentVariable[]
  recentActivity?: Array<{
    type: string
    message: string
    timestamp: string
    status?: string
  }>
}

export default function ProjectPage() {
  const { slug } = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [project, setProject] = useState<ProjectDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [newEnvVar, setNewEnvVar] = useState({
    key: "",
    value: "",
    environment: "production",
    isSecret: false
  })
  const [showAddEnvForm, setShowAddEnvForm] = useState(false)
  const [previewSite, setPreviewSite] = useState<any>(null)
  const [productionSite, setProductionSite] = useState<any>(null)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploymentType, setDeploymentType] = useState<'preview' | 'production'>('preview')
  const [isViteProject, setIsViteProject] = useState(false)
  const [customDomainData, setCustomDomainData] = useState<any>(null)
  const [newDomain, setNewDomain] = useState('')
  const [isDomainLoading, setIsDomainLoading] = useState(false)

  useEffect(() => {
    getCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUserId && slug) {
      loadProject()
    }
  }, [currentUserId, slug])

  const getCurrentUser = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      } else {
        router.push('/auth/login')
      }
    } catch (error) {
      console.error('Error getting current user:', error)
      router.push('/auth/login')
    }
  }

  const detectFramework = async (projectId: string) => {
    try {
      await storageManager.init()
      const files = await storageManager.getFiles(projectId)
      
      // Check for Vite config files
      const hasViteConfig = files.some((f: any) => 
        f.path === 'vite.config.js' || 
        f.path === 'vite.config.ts' || 
        f.path === 'vite.config.mjs'
      )
      
      setIsViteProject(hasViteConfig)
      return hasViteConfig
    } catch (error) {
      console.error('Error detecting framework:', error)
      return false
    }
  }

  const loadProject = async () => {
    if (!slug || typeof slug !== 'string') return

    setIsLoading(true)
    try {
      await storageManager.init()
      
      // Detect framework first

      // Load projects
      const projects = await storageManager.getWorkspaces(currentUserId)
      const foundProject = projects.find(p => p.slug === slug)

      if (!foundProject) {
        toast({
          title: "Project Not Found",
          description: "The project you're looking for doesn't exist or you don't have access to it.",
          variant: "destructive"
        })
        router.push('/workspace/management')
        return
      }

      // Load related data
      const [deployments, envVars] = await Promise.all([
        storageManager.getDeployments(foundProject.id),
        storageManager.getEnvironmentVariables(foundProject.id)
      ])

      // Transform deployments for display
      const sortedDeployments = deployments
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      // Create recent activity from deployments
      const recentActivity = sortedDeployments.slice(0, 5).map(deployment => ({
        type: 'deployment',
        message: `Deployed to ${deployment.provider}`,
        timestamp: deployment.createdAt,
        status: deployment.status
      }))

      setProject({
        ...foundProject,
        deployments: sortedDeployments,
        environmentVariables: envVars,
        recentActivity
      })

      // Load sites (preview and production)
      await loadSites(foundProject.id)
      
      // Detect framework
      await detectFramework(foundProject.id)
      
      // Load custom domain
      await loadCustomDomain(foundProject.id)

    } catch (error) {
      console.error('Error loading project:', error)
      toast({
        title: "Error",
        description: "Failed to load project details",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadCustomDomain = async (projectId: string) => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('custom_domains')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', currentUserId)
        .maybeSingle()
      
      setCustomDomainData(data)
    } catch (error) {
      console.error('Error loading custom domain:', error)
    }
  }

  const connectDomain = async () => {
    if (!newDomain || !project) return
    
    setIsDomainLoading(true)
    try {
      // Step 1-4: Add to Vercel account, project, verify, and add to Supabase
      const response = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: newDomain.toLowerCase().trim(),
          projectId: project.id,
          userId: currentUserId,
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to connect domain')
      }

      if (data.verified) {
        // Domain verified immediately!
        setCustomDomainData(data.domain)
        setNewDomain('')
        toast({
          title: "🎉 Domain Connected!",
          description: `${newDomain} is verified and active`
        })
      } else {
        // Domain added but requires verification
        setCustomDomainData({
          ...data.domain,
          verificationInstructions: data.verificationInstructions
        })
        setNewDomain('')
        toast({
          title: "Domain Added",
          description: "Please configure DNS settings to verify your domain",
          variant: "default"
        })
      }

      // Reload sites to show updated domain info
      await loadSites(project.id)
    } catch (error: any) {
      console.error('Domain connection error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to connect domain",
        variant: "destructive"
      })
    } finally {
      setIsDomainLoading(false)
    }
  }

  const verifyDomain = async () => {
    if (!customDomainData) return
    
    setIsDomainLoading(true)
    try {
      // Verify domain through Vercel API
      const response = await fetch('/api/domains', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId: customDomainData.id,
          domain: customDomainData.domain,
          projectId: project?.id,
          userId: currentUserId,
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Verification failed')
      }

      if (data.verified) {
        setCustomDomainData(data.domain)
        toast({
          title: "🎉 Domain Verified!",
          description: "Your domain is now active and connected"
        })
      } else {
        // Update verification instructions if provided
        if (data.verificationInstructions) {
          setCustomDomainData({
            ...customDomainData,
            verificationInstructions: data.verificationInstructions
          })
        }
        toast({
          title: "Verification Pending",
          description: data.message || "Please check your DNS settings and try again",
          variant: "default"
        })
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Please check your DNS settings and try again",
        variant: "destructive"
      })
    } finally {
      setIsDomainLoading(false)
    }
  }

  const disconnectDomain = async () => {
    if (!customDomainData) return
    
    setIsDomainLoading(true)
    try {
      // Remove from Vercel and database
      const response = await fetch(`/api/domains?id=${customDomainData.id}&domain=${customDomainData.domain}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to disconnect domain')
      }
      
      setCustomDomainData(null)
      toast({
        title: "Domain Disconnected",
        description: "Your domain has been removed from Vercel and this project"
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect domain",
        variant: "destructive"
      })
    } finally {
      setIsDomainLoading(false)
    }
  }

  const loadSites = async (projectId: string) => {
    try {
      const supabase = createClient()
      
      // Load preview site
      const { data: previewData } = await supabase
        .from('sites')
        .select('*')
        .eq('project_id', projectId)
        .eq('site_type', 'preview')
        .eq('user_id', currentUserId)
        .order('deployed_at', { ascending: false })
        .limit(1)
        .single()
      
      setPreviewSite(previewData)
      
      // Load production site
      const { data: productionData } = await supabase
        .from('sites')
        .select('*, custom_domains(domain, verified)')
        .eq('project_id', projectId)
        .eq('site_type', 'production')
        .eq('user_id', currentUserId)
        .single()
      
      setProductionSite(productionData)
    } catch (error) {
      console.error('Error loading sites:', error)
    }
  }

  const deployProject = async (isProduction: boolean) => {
    if (!project?.id) return

    setIsDeploying(true)
    setDeploymentType(isProduction ? 'production' : 'preview')

    try {
      // Get project files from storage
      const files = await storageManager.getFiles(project.id)
      
      if (!files || files.length === 0) {
        toast({
          title: "No Files",
          description: "Project has no files to deploy",
          variant: "destructive"
        })
        return
      }

      // Call preview API with isProduction parameter
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          projectSlug: project.slug,
          files,
          authUserId: currentUserId,
          authUsername: project.name || 'user',
          isProduction,
          customDomainId: isProduction && productionSite?.custom_domain_id ? productionSite.custom_domain_id : undefined
        })
      })

      const data = await response.json()

      if (data.url) {
        toast({
          title: isProduction ? "Production Deployed!" : "Preview Deployed!",
          description: `Site is live at ${data.url}`
        })
        
        // Reload sites
        await loadSites(project.id)
      } else {
        throw new Error(data.error || 'Deployment failed')
      }
    } catch (error) {
      console.error('Deployment error:', error)
      toast({
        title: "Deployment Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      })
    } finally {
      setIsDeploying(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'deployed':
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'in_progress':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  // Handle paste event for environment variables
  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text').trim()

    // Check if pasted text contains KEY=VALUE pairs
    const envPairs = pastedText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && line.includes('='))
      .map(line => {
        // Handle export statements
        if (line.startsWith('export ')) {
          return line.substring(7).trim()
        }
        return line
      })

    if (envPairs.length === 0) {
      // No valid environment variables detected, allow normal paste
      return
    }

    e.preventDefault() // Prevent default paste behavior

    if (envPairs.length === 1) {
      // Single environment variable - auto-fill current fields
      const [key, ...valueParts] = envPairs[0].split('=')
      const value = valueParts.join('=').replace(/^["']|["']$/g, '') // Remove quotes

      setNewEnvVar(prev => ({
        ...prev,
        key: key.trim(),
        value: value.trim()
      }))

      toast({
        title: "Environment Variable Detected",
        description: `Auto-filled: ${key.trim()} = ${value.trim().substring(0, 20)}${value.trim().length > 20 ? '...' : ''}`,
      })
    } else if (envPairs.length > 1) {
      // Multiple environment variables - create them all
      if (!project?.id) {
        toast({
          title: "Project Not Available",
          description: "Project information not loaded yet",
          variant: "destructive"
        })
        return
      }

      try {
        let successCount = 0
        let errorCount = 0

        for (const envPair of envPairs) {
          const [key, ...valueParts] = envPair.split('=')
          const value = valueParts.join('=').replace(/^["']|["']$/g, '') // Remove quotes

          if (key.trim() && value.trim()) {
            try {
              // Check if environment variable already exists
              const envVars = await storageManager.getEnvironmentVariables(project.id)
              const existingVar = envVars.find(ev => ev.key === key.trim() && ev.environment === newEnvVar.environment)

              if (existingVar) {
                // Update existing variable
                await storageManager.updateEnvironmentVariable(existingVar.id, {
                  value: value.trim(),
                  isSecret: newEnvVar.isSecret
                })
              } else {
                // Create new variable
                await storageManager.createEnvironmentVariable({
                  workspaceId: project.id,
                  key: key.trim(),
                  value: value.trim(),
                  environment: newEnvVar.environment,
                  isSecret: newEnvVar.isSecret
                })
              }
              successCount++
            } catch (error) {
              errorCount++
              console.error(`Error creating environment variable ${key}:`, error)
            }
          }
        }

        // Reload project data
        await loadProject()

        if (successCount > 0) {
          toast({
            title: "Environment Variables Added",
            description: `Successfully added ${successCount} environment variable${successCount > 1 ? 's' : ''}${errorCount > 0 ? ` (${errorCount} failed)` : ''}`,
          })
        }

        if (errorCount > 0) {
          toast({
            title: "Some Variables Failed",
            description: `${errorCount} environment variable${errorCount > 1 ? 's' : ''} could not be added`,
            variant: "destructive"
          })
        }

      } catch (error) {
        console.error('Error processing pasted environment variables:', error)
        toast({
          title: "Paste Failed",
          description: "Failed to process pasted environment variables",
          variant: "destructive"
        })
      }
    }
    // If no KEY=VALUE pairs detected, allow normal paste behavior
  }

  const addEnvironmentVariable = async () => {
    if (!newEnvVar.key || !newEnvVar.value || !project?.id) {
      toast({
        title: "Missing Information",
        description: "Please provide key and value",
        variant: "destructive"
      })
      return
    }

    try {
      // Check if environment variable already exists
      const envVars = await storageManager.getEnvironmentVariables(project.id)
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
          workspaceId: project.id,
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
        isSecret: false
      })
      setShowAddEnvForm(false)
      await loadProject()
    } catch (error) {
      console.error('Error adding environment variable:', error)
      toast({
        title: "Error",
        description: "Failed to add environment variable",
        variant: "destructive"
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      deployed: 'default',
      ready: 'default',
      in_progress: 'secondary',
      failed: 'destructive',
      not_deployed: 'outline'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'} className="ml-2">
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 lovable-gradient" />
        <div className="absolute inset-0 noise-texture" />
        <Navigation />
        <div className="relative z-10 pt-16 pb-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center space-x-4 mb-6">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div>
                  <Skeleton className="h-8 w-64 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 lovable-gradient" />
        <div className="absolute inset-0 noise-texture" />
        <Navigation />
        <div className="relative z-10 pt-16 pb-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl font-bold text-white mb-4">Project Not Found</h1>
              <p className="text-gray-400 mb-6">
                The project you're looking for doesn't exist or you don't have access to it.
              </p>
              <Button onClick={() => router.push('/workspace/management')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Projects
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Gradient Background */}
      <div className="absolute inset-0 lovable-gradient" />

      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 noise-texture" />

      {/* Navigation */}
      <Navigation />

      <div className="relative z-10 pt-16 pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/workspace/management')}
                  className="text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    <span className="block sm:hidden">
                      {project.name?.slice(0, 3) ?? ''}
                      {project.name && project.name.length > 3 ? '…' : ''}
                    </span>
                    <span className="hidden sm:inline">
                      {project.name}
                    </span>
                  </h1>
                  <p className="text-gray-400">
                    <span className="block sm:hidden">
                      {(project.description || 'No description')?.slice(0, 3)}
                      {(project.description || 'No description').length > 3 ? '…' : ''}
                    </span>
                    <span className="hidden sm:inline">
                      {project.description || 'No description'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(project.deploymentStatus)}
                {getStatusBadge(project.deploymentStatus)}
              </div>
            </div>

            {/* Custom Domain Connection - Only for Vite projects */}
            {isViteProject && (
              <Card className="bg-gray-800 border-gray-700 mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <Globe className="h-5 w-5 text-purple-400" />
                    <span>Custom Domain</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Connect your own domain to this project
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {customDomainData ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-700 rounded-lg border-2 border-gray-600">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {customDomainData.verified ? (
                              <CheckCircle2 className="h-5 w-5 text-green-400" />
                            ) : (
                              <Clock className="h-5 w-5 text-yellow-400 animate-pulse" />
                            )}
                            <div>
                              <span className="text-white font-mono text-sm block">{customDomainData.domain}</span>
                              <span className="text-xs text-gray-400">
                                {customDomainData.verified ? 'Active & Connected' : 'Pending Verification'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {customDomainData.verified ? (
                              <Badge className="bg-green-600 hover:bg-green-700">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-400 border-yellow-600">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={disconnectDomain}
                              disabled={isDomainLoading}
                              className="gap-1"
                            >
                              <Trash2 className="h-3 w-3" />
                              Remove
                            </Button>
                          </div>
                        </div>
                        
                        {!customDomainData.verified && (
                          <div className="space-y-3 mt-4 p-4 bg-gray-800 rounded border border-yellow-600/30">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="h-4 w-4 text-yellow-400" />
                              <p className="text-sm text-yellow-400 font-medium">DNS Configuration Required</p>
                            </div>
                            <p className="text-xs text-gray-400 mb-3">
                              The DNS records at your provider must match the following records to verify and connect your domain to PiPilot.
                            </p>
                            <div className="bg-gray-900/50 rounded-lg overflow-hidden border border-gray-700">
                              <div className="grid grid-cols-3 gap-3 px-3 py-2 bg-gray-800/80 text-xs font-semibold text-gray-300">
                                <div>Type</div>
                                <div>Name</div>
                                <div>Value</div>
                              </div>
                              <div className="grid grid-cols-3 gap-3 px-3 py-3 text-xs">
                                <code className="text-blue-400 font-mono">
                                  {customDomainData.verificationInstructions?.type || 'A'}
                                </code>
                                <code className="text-blue-400 font-mono">
                                  {customDomainData.verificationInstructions?.name || '@'}
                                </code>
                                <code className="text-blue-400 font-mono break-all">
                                  {customDomainData.verificationInstructions?.value || '76.76.21.21'}
                                </code>
                              </div>
                            </div>
                            <Button
                              onClick={verifyDomain}
                              disabled={isDomainLoading}
                              className="w-full mt-3 bg-green-600 hover:bg-green-700"
                              size="sm"
                            >
                              {isDomainLoading ? (
                                <><RefreshCw className="h-3 w-3 mr-2 animate-spin" />Verifying...</>
                              ) : (
                                <><CheckCircle2 className="h-3 w-3 mr-2" />Verify DNS Configuration</>
                              )}
                            </Button>
                          </div>
                        )}
                        
                        {customDomainData.verified && (
                          <div className="mt-3 p-3 bg-green-900/20 border border-green-600/30 rounded flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                            <p className="text-xs text-green-400">
                              Domain is verified and connected to Vercel. Your site is accessible at{' '}
                              <a href={`https://${customDomainData.domain}`} target="_blank" className="underline hover:text-green-300">
                                {customDomainData.domain}
                              </a>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="yourdomain.com"
                          value={newDomain}
                          onChange={(e) => setNewDomain(e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                        />
                        <Button
                          onClick={connectDomain}
                          disabled={isDomainLoading || !newDomain}
                          className="bg-purple-600 hover:bg-purple-700 gap-1"
                        >
                          {isDomainLoading ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <><Plus className="h-4 w-4" />Connect</>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-400">
                        You'll need to configure DNS settings after connecting
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!isViteProject && (
              <Card className="bg-gray-800 border-gray-700 mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                    <span>Hosting Not Available</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-400">
                    Custom hosting is currently only available for Vite projects. 
                    This project appears to be using a different framework.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3 mb-6">
              <Button
                onClick={() => router.push(`/workspace/${project.id}/database`)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Database className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Database</span>
                <span className="sm:hidden">DB</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => window.open(project.githubRepoUrl, '_blank')}
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                disabled={!project.githubRepoUrl}
              >
                <Github className="h-4 w-4 mr-2" />
                View Repository
              </Button>
            </div>

            {/* Project Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {/* Deployment Status */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <Activity className="h-5 w-5" />
                    <span>Deployment Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Current Status</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(project.deploymentStatus)}
                      <span className="text-white capitalize">
                        {project.deploymentStatus.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <Separator className="bg-gray-700" />

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Last Activity</span>
                    <span className="text-white">
                      {formatDate(project.lastActivity)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Created</span>
                    <span className="text-white">
                      {formatDate(project.createdAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Repository Info */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <Code className="h-5 w-5" />
                    <span>Repository</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {project.githubRepoUrl ? (
                    <>
                      <div className="flex items-center space-x-2">
                        <GitBranch className="h-4 w-4 text-gray-400" />
                        <a
                          href={project.githubRepoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline"
                        >
                          {project.githubRepoUrl.replace('https://github.com/', '')}
                        </a>
                      </div>
                      {project.githubRepoName && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Repository Name</span>
                          <span className="text-white">{project.githubRepoName}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4 text-gray-400">
                      No repository connected
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Database */}
              <Card className="bg-gray-800 border-gray-700 hover:border-purple-500 transition-colors cursor-pointer" onClick={() => router.push(`/workspace/${project.id}/database`)}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-white">
                    <div className="flex items-center space-x-2">
                      <Database className="h-5 w-5 text-purple-400" />
                      <span>Database</span>
                    </div>
                    <Badge variant="outline" className="border-purple-500 text-purple-400">
                      Manage
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Create and manage databases for this project
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/workspace/${project.id}/database`)
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Open Database Manager
                  </Button>
                </CardContent>
              </Card>

              {/* Supabase Connection */}
              <SupabaseConnectionManager
                pixelpilotProjectId={project.id}
                userId={currentUserId}
              />

              {/* Environment Variables */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-white">
                    <div className="flex items-center space-x-2">
                      <Settings className="h-5 w-5" />
                      <span>Environment Variables</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddEnvForm(!showAddEnvForm)}
                      className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Variable
                    </Button>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    {project.environmentVariables.length} variables configured
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Paste Instructions */}
                  <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Code className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-green-300 font-medium">Quick Import from .env Files</span>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">
                      Copy environment variables from your local <code className="bg-gray-700 px-1 rounded">.env</code> file and paste them directly into the Value field. The system will automatically:
                    </p>
                    <ul className="text-xs text-gray-400 space-y-1 ml-4">
                      <li>• Extract KEY=VALUE pairs</li>
                      <li>• Auto-fill the Variable Name and Value fields</li>
                      <li>• Create multiple variables when pasting multiple lines</li>
                      <li>• Handle quoted values automatically</li>
                    </ul>
                  </div>

                  {/* Add Environment Variable Form */}
                  {showAddEnvForm && (
                    <div className="space-y-4 p-4 bg-gray-700 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="env-key" className="text-gray-300">Variable Name</Label>
                          <Input
                            id="env-key"
                            placeholder="API_KEY"
                            value={newEnvVar.key}
                            onChange={(e) => setNewEnvVar(prev => ({ ...prev, key: e.target.value }))}
                            className="bg-gray-600 border-gray-500 text-white placeholder-gray-400"
                          />
                        </div>
                        <div>
                          <Label htmlFor="env-value" className="text-gray-300">Value</Label>
                          <Input
                            id="env-value"
                            type={newEnvVar.isSecret ? "password" : "text"}
                            placeholder="your-value-here (or paste KEY=VALUE from .env file)"
                            value={newEnvVar.value}
                            onChange={(e) => setNewEnvVar(prev => ({ ...prev, value: e.target.value }))}
                            onPaste={handlePaste}
                            className="bg-gray-600 border-gray-500 text-white placeholder-gray-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="env-environment" className="text-gray-300">Environment</Label>
                          <select
                            id="env-environment"
                            className="w-full px-3 py-2 h-10 border border-gray-500 bg-gray-600 text-white rounded-md"
                            value={newEnvVar.environment}
                            onChange={(e) => setNewEnvVar(prev => ({ ...prev, environment: e.target.value }))}
                          >
                            <option value="production" className="bg-gray-600">Production</option>
                            <option value="preview" className="bg-gray-600">Preview</option>
                            <option value="development" className="bg-gray-600">Development</option>
                          </select>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="env-secret"
                            checked={newEnvVar.isSecret}
                            onChange={(e) => setNewEnvVar(prev => ({ ...prev, isSecret: e.target.checked }))}
                            className="rounded bg-gray-600 border-gray-500 text-blue-500"
                          />
                          <Label htmlFor="env-secret" className="text-gray-300">Mark as secret</Label>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={addEnvironmentVariable}
                          disabled={!newEnvVar.key || !newEnvVar.value}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Variable
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowAddEnvForm(false)}
                          className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Display Environment Variables */}
                  {project.environmentVariables.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {project.environmentVariables.slice(0, 5).map((envVar, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                          <div className="flex-1">
                            <div className="flex flex-col">
                              <span className="font-medium text-white text-sm">{envVar.key}</span>
                              <span className="text-xs text-gray-400">({envVar.environment})</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {!envVar.isSecret && envVar.value && (
                              <span className="text-xs text-green-400 truncate max-w-32" title={envVar.value}>
                                {envVar.value.length > 20 ? `${envVar.value.substring(0, 20)}...` : envVar.value}
                              </span>
                            )}
                            <span className="text-xs text-gray-400">
                              {envVar.isSecret ? 'Secret' : 'Plain'}
                            </span>
                          </div>
                        </div>
                      ))}
                      {project.environmentVariables.length > 5 && (
                        <div className="text-center py-2 text-gray-400 text-sm">
                          +{project.environmentVariables.length - 5} more variables
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      No environment variables
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Deployments */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <Clock className="h-5 w-5" />
                    <span>Recent Deployments</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    {project.deployments.length} total deployments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {project.deployments.length > 0 ? (
                    <div className="space-y-3 max-h-40 overflow-y-auto">
                      {project.deployments.slice(0, 3).map((deployment, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-white text-sm capitalize">{deployment.provider}</span>
                              <Badge variant="outline" className="text-xs">
                                {deployment.environment}
                              </Badge>
                            </div>
                            <span className="text-xs text-gray-400">
                              {formatDate(deployment.createdAt)}
                            </span>
                          </div>
                          <Badge
                            variant={deployment.status === 'ready' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {deployment.status}
                          </Badge>
                        </div>
                      ))}
                      {project.deployments.length > 3 && (
                        <div className="text-center py-2 text-gray-400 text-sm">
                          +{project.deployments.length - 3} more deployments
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      No deployments yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            {project.recentActivity && project.recentActivity.length > 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <Activity className="h-5 w-5" />
                    <span>Recent Activity</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {project.recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
                        <div className="flex-shrink-0">
                          {activity.type === 'deployment' ? (
                            <Rocket className="h-4 w-4 text-blue-400" />
                          ) : (
                            <Activity className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm">{activity.message}</p>
                          <p className="text-gray-400 text-xs">
                            {formatDate(activity.timestamp)}
                          </p>
                        </div>
                        {activity.status && (
                          <Badge variant="outline" className="text-xs">
                            {activity.status}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}
