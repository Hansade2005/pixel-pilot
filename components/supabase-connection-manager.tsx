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
import { createClient } from "@/lib/supabase/client"
import { useSupabaseToken } from "@/hooks/use-supabase-token"
import {
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
  
  // Use the Supabase token hook for automatic token management
  const { token: supabaseToken, isLoading: tokenLoading, isExpired: tokenExpired, error: tokenError } = useSupabaseToken()
  
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

      // Check if user has Supabase token using the hook
      const hasToken = !!supabaseToken
      setHasSupabaseToken(hasToken)

      if (hasToken) {
        // Check if this PixelPilot project is already connected to a Supabase project
        const connection = await getSupabaseProjectForPixelPilotProject(userId, pixelpilotProjectId)
        setCurrentConnection(connection)

        // Fetch available projects
        if (supabaseToken) {
          await fetchAvailableProjects(supabaseToken)
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
      // Get the access token from the hook
      const accessToken = supabaseToken

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
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <Database className="h-5 w-5 text-purple-400" />
            <span>Supabase Connection</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full bg-gray-700" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-purple-400" />
            <span>Supabase Connection</span>
          </div>
          {currentConnection && (
            <Badge variant="outline" className="border-green-500 text-green-400">
              Connected
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-gray-400">
          Connect this PixelPilot project to a Supabase database for advanced database management
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasSupabaseToken ? (
          <div className="text-center py-6">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Supabase Not Connected</h3>
            <p className="text-gray-400 mb-4">
              You need to connect your Supabase account first in the Account Settings.
            </p>
            <Button
              onClick={() => window.location.href = '/workspace/account'}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Go to Account Settings
            </Button>
          </div>
        ) : currentConnection ? (
          <div className="space-y-4">
            {/* Connected Project Info */}
            <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-300 font-medium">Connected to Supabase</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectFromSupabaseProject}
                  disabled={isDisconnecting}
                  className="bg-red-900/20 border-red-700 text-red-400 hover:bg-red-900/40"
                >
                  {isDisconnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Unlink className="h-4 w-4" />
                  )}
                  Disconnect
                </Button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Project:</span>
                  <span className="text-white text-sm font-medium">{currentConnection.supabaseProjectName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Project ID:</span>
                  <span className="text-white text-sm font-mono">{currentConnection.supabaseProjectId}</span>
                </div>
                {currentConnection.supabaseProjectUrl && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">URL:</span>
                    <a
                      href={currentConnection.supabaseProjectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline text-sm flex items-center"
                    >
                      {currentConnection.supabaseProjectUrl}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Connected:</span>
                  <span className="text-white text-sm">
                    {new Date(currentConnection.connectedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Database Management Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                onClick={() => window.location.href = `/workspace/${pixelpilotProjectId}/database`}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Database className="h-4 w-4 mr-2" />
                Manage Database
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(currentConnection.supabaseProjectUrl, '_blank')}
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Supabase
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Not Connected State */}
            <div className="text-center py-6">
              <Database className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Supabase Project Connected</h3>
              <p className="text-gray-400 mb-4">
                Connect this PixelPilot project to a Supabase database to enable advanced database management features.
              </p>
            </div>

            {/* Project Selector */}
            {!showProjectSelector ? (
              <Button
                onClick={() => setShowProjectSelector(true)}
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={availableProjects.length === 0}
              >
                {availableProjects.length === 0 ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Loading Projects...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Connect Supabase Project
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-white">Select Supabase Project</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowProjectSelector(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2">
                  {availableProjects.map((project) => (
                    <div
                      key={project.id}
                      className="p-3 bg-gray-700 rounded-lg border border-gray-600 hover:border-purple-500 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-white font-medium">{project.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {project.region}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-400 space-y-1">
                            <div>ID: {project.id}</div>
                            <div>Status: {project.status}</div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => connectToSupabaseProject(project)}
                          disabled={isConnecting}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {isConnecting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Connect'
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {availableProjects.length === 0 && (
                  <div className="text-center py-4 text-gray-400">
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