"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Database,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Unlink,
  Loader2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  getDeploymentTokens,
  connectPixelPilotToSupabaseProject,
  getSupabaseProjectForPixelPilotProject,
  disconnectPixelPilotFromSupabaseProject
} from "@/lib/cloud-sync"

interface SupabaseProject {
  id: string
  name: string
  region: string
  status: string
  database: {
    host: string
    version: string
  }
  createdAt: string
  url: string
}

interface SupabaseConnection {
  supabaseProjectId: string
  supabaseProjectName: string
  supabaseProjectUrl?: string
  supabaseAnonKey?: string
  supabaseServiceRoleKey?: string
  connectedAt: string
  updatedAt: string
}

interface SupabaseConnectionManagerProps {
  pixelpilotProjectId: string
  userId: string
}

export function SupabaseConnectionManager({
  pixelpilotProjectId,
  userId
}: SupabaseConnectionManagerProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [availableProjects, setAvailableProjects] = useState<SupabaseProject[]>([])
  const [currentConnection, setCurrentConnection] = useState<SupabaseConnection | null>(null)
  const [hasSupabaseToken, setHasSupabaseToken] = useState(false)
  const [showProjectSelector, setShowProjectSelector] = useState(false)

  useEffect(() => {
    checkSupabaseConnection()
  }, [pixelpilotProjectId, userId])

  const checkSupabaseConnection = async () => {
    try {
      setIsLoading(true)

      // Check if user has Supabase token
      const tokens = await getDeploymentTokens(userId)
      const hasToken = !!tokens?.supabase
      setHasSupabaseToken(hasToken)

      if (hasToken) {
        // Check if this PixelPilot project is already connected to a Supabase project
        const connection = await getSupabaseProjectForPixelPilotProject(userId, pixelpilotProjectId)
        setCurrentConnection(connection)

        // Fetch available projects
        if (tokens.supabase) {
          await fetchAvailableProjects(tokens.supabase)
        }
      }
    } catch (error) {
      console.error('Error checking Supabase connection:', error)
      toast({
        title: "Error",
        description: "Failed to check Supabase connection status",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAvailableProjects = async (token: string) => {
    try {
      const response = await fetch('/api/supabase/list-projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setAvailableProjects(result.projects || [])
      } else {
        console.error('Failed to fetch projects:', result.error)
      }
    } catch (error) {
      console.error('Error fetching available projects:', error)
    }
  }

  const connectToSupabaseProject = async (supabaseProject: SupabaseProject) => {
    if (!userId || !pixelpilotProjectId) return

    setIsConnecting(true)
    try {
      // Get the access token
      const tokens = await getDeploymentTokens(userId)
      const accessToken = tokens?.supabase

      if (!accessToken) {
        throw new Error('No Supabase access token found')
      }

      // Fetch API keys for the selected project
      const apiResponse = await fetch('/api/supabase/fetch-api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: accessToken,
          projectId: supabaseProject.id
        }),
      })

      const apiResult = await apiResponse.json()

      if (!apiResponse.ok || !apiResult.success) {
        throw new Error(apiResult.error || 'Could not fetch API keys')
      }

      // Connect the PixelPilot project to the Supabase project
      const success = await connectPixelPilotToSupabaseProject(userId, pixelpilotProjectId, {
        supabaseProjectId: supabaseProject.id,
        supabaseProjectName: supabaseProject.name,
        supabaseProjectUrl: apiResult.projectUrl,
        supabaseAnonKey: apiResult.anonKey,
        supabaseServiceRoleKey: apiResult.serviceRoleKey
      })

      if (!success) {
        throw new Error('Failed to connect project')
      }

      // Update local state
      setCurrentConnection({
        supabaseProjectId: supabaseProject.id,
        supabaseProjectName: supabaseProject.name,
        supabaseProjectUrl: apiResult.projectUrl,
        supabaseAnonKey: apiResult.anonKey,
        supabaseServiceRoleKey: apiResult.serviceRoleKey,
        connectedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      setShowProjectSelector(false)

      toast({
        title: "Connected Successfully",
        description: `PixelPilot project connected to ${supabaseProject.name}`,
      })

    } catch (error: any) {
      console.error('Error connecting to Supabase project:', error)
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Supabase project",
        variant: "destructive"
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectFromSupabaseProject = async () => {
    if (!userId || !pixelpilotProjectId) return

    setIsDisconnecting(true)
    try {
      const success = await disconnectPixelPilotFromSupabaseProject(userId, pixelpilotProjectId)

      if (!success) {
        throw new Error('Failed to disconnect project')
      }

      setCurrentConnection(null)

      toast({
        title: "Disconnected",
        description: "PixelPilot project disconnected from Supabase project",
      })

    } catch (error: any) {
      console.error('Error disconnecting from Supabase project:', error)
      toast({
        title: "Disconnection Failed",
        description: error.message || "Failed to disconnect from Supabase project",
        variant: "destructive"
      })
    } finally {
      setIsDisconnecting(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-white text-sm">
            <Database className="h-4 w-4 text-purple-400" />
            <span>Supabase Connection</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full bg-gray-700" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-white text-sm">
          <div className="flex items-center space-x-2">
            <Database className="h-4 w-4 text-purple-400" />
            <span>Supabase Connection</span>
          </div>
          {currentConnection && (
            <Badge variant="outline" className="border-green-500 text-green-400 text-[10px] h-5">
              Connected
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-gray-400 text-xs mt-1">
          Connect this PixelPilot project to a Supabase database for advanced database management
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasSupabaseToken ? (
          <div className="text-center py-4">
            <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-white mb-1.5">Supabase Not Connected</h3>
            <p className="text-gray-400 mb-3 text-xs">
              You need to connect your Supabase account first in the Account Settings.
            </p>
            <Button
              onClick={() => window.location.href = '/workspace/account'}
              className="bg-purple-600 hover:bg-purple-700 h-8 text-xs"
              size="sm"
            >
              Go to Account Settings
            </Button>
          </div>
        ) : currentConnection ? (
          <div className="space-y-3">
            {/* Connected Project Info */}
            <div className="p-3 bg-green-900/20 border border-green-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-xs text-green-300 font-medium">Connected to Supabase</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectFromSupabaseProject}
                  disabled={isDisconnecting}
                  className="bg-red-900/20 border-red-700 text-red-400 hover:bg-red-900/40 h-6 px-2 text-[10px]"
                >
                  {isDisconnecting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <Unlink className="h-3 w-3 mr-1" />
                      Disconnect
                    </>
                  )}
                </Button>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-[11px]">Project:</span>
                  <span className="text-white text-[11px] font-medium">{currentConnection.supabaseProjectName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-[11px]">Project ID:</span>
                  <span className="text-white text-[11px] font-mono truncate ml-2">{currentConnection.supabaseProjectId}</span>
                </div>
                {currentConnection.supabaseProjectUrl && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-[11px]">URL:</span>
                    <a
                      href={currentConnection.supabaseProjectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline text-[11px] flex items-center truncate ml-2"
                    >
                      <span className="truncate">{currentConnection.supabaseProjectUrl}</span>
                      <ExternalLink className="h-2.5 w-2.5 ml-1 flex-shrink-0" />
                    </a>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-[11px]">Connected:</span>
                  <span className="text-white text-[11px]">
                    {new Date(currentConnection.connectedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Database Management Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Button
                onClick={() => window.location.href = `/workspace/${pixelpilotProjectId}/database`}
                className="bg-purple-600 hover:bg-purple-700 h-7 text-[10px] px-2"
                size="sm"
              >
                <Database className="h-2.5 w-2.5 mr-1 flex-shrink-0" />
                <span className="truncate">Manage Database</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(currentConnection.supabaseProjectUrl, '_blank')}
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 h-7 text-[10px] px-2"
                size="sm"
              >
                <ExternalLink className="h-2.5 w-2.5 mr-1 flex-shrink-0" />
                <span className="truncate">Open Supabase</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Not Connected State */}
            <div className="text-center py-4">
              <Database className="h-8 w-8 text-gray-500 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-white mb-1.5">No Supabase Project Connected</h3>
              <p className="text-gray-400 mb-3 text-xs">
                Connect this PixelPilot project to a Supabase database to enable advanced database management features.
              </p>
            </div>

            {/* Project Selector */}
            {!showProjectSelector ? (
              <Button
                onClick={() => setShowProjectSelector(true)}
                className="w-full bg-purple-600 hover:bg-purple-700 h-8 text-xs"
                disabled={availableProjects.length === 0}
                size="sm"
              >
                {availableProjects.length === 0 ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />
                    Loading Projects...
                  </>
                ) : (
                  <>
                    <Database className="h-3 w-3 mr-1.5" />
                    Connect Supabase Project
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-white">Select Supabase Project</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowProjectSelector(false)}
                    className="text-gray-400 hover:text-white h-6 px-2 text-[10px]"
                  >
                    Cancel
                  </Button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2">
                  {availableProjects.map((project) => (
                    <div
                      key={project.id}
                      className="p-2.5 bg-gray-700 rounded-lg border border-gray-600 hover:border-purple-500 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1.5 mb-1">
                            <span className="text-white font-medium text-xs truncate">{project.name}</span>
                            <Badge variant="outline" className="text-[10px] h-4 px-1">
                              {project.region}
                            </Badge>
                          </div>
                          <div className="text-[10px] text-gray-400 space-y-0.5">
                            <div className="truncate">ID: {project.id}</div>
                            <div>Status: {project.status}</div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => connectToSupabaseProject(project)}
                          disabled={isConnecting}
                          className="bg-purple-600 hover:bg-purple-700 h-6 px-2 text-[10px] flex-shrink-0"
                        >
                          {isConnecting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Connect'
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {availableProjects.length === 0 && (
                  <div className="text-center py-3 text-gray-400 text-xs">
                    No Supabase projects found. Make sure you have projects in your Supabase account.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}