"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
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
  Clock
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { storageManager, type Workspace as Project, type Deployment, type EnvironmentVariable } from "@/lib/storage-manager"
import { createClient } from "@/lib/supabase/client"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
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

  const loadProject = async () => {
    if (!slug || typeof slug !== 'string') return

    setIsLoading(true)
    try {
      await storageManager.init()

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
                  <h1 className="text-3xl font-bold text-white">{project.name}</h1>
                  <p className="text-gray-400">{project.description || 'No description'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(project.deploymentStatus)}
                {getStatusBadge(project.deploymentStatus)}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
              <Button
                onClick={() => router.push(`/workspace/deployment?project=${project.id}`)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Rocket className="h-4 w-4 mr-2" />
                Deploy Project
              </Button>

              {project.vercelDeploymentUrl && (
                <Button
                  variant="outline"
                  onClick={() => window.open(project.vercelDeploymentUrl, '_blank')}
                  className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Vercel
                </Button>
              )}

              {project.netlifyDeploymentUrl && (
                <Button
                  variant="outline"
                  onClick={() => window.open(project.netlifyDeploymentUrl, '_blank')}
                  className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Netlify
                </Button>
              )}

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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

              {/* Environment Variables */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <Settings className="h-5 w-5" />
                    <span>Environment Variables</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    {project.environmentVariables.length} variables configured
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {project.environmentVariables.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {project.environmentVariables.slice(0, 5).map((envVar, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                          <div className="flex-1">
                            <span className="font-medium text-white text-sm">{envVar.key}</span>
                            <span className="text-xs text-gray-400 ml-2">({envVar.environment})</span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {envVar.isSecret ? 'Secret' : 'Plain'}
                          </span>
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
