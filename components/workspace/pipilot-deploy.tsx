"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Rocket, ExternalLink, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface PipilotDeployProps {
  projectId: string
  projectName: string
}

interface DeploymentStatus {
  status: 'idle' | 'deploying' | 'success' | 'error'
  url?: string
  siteName?: string
  message?: string
}

export function PipilotDeploy({ projectId, projectName }: PipilotDeployProps) {
  const [siteName, setSiteName] = useState("")
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus>({ status: 'idle' })
  const { toast } = useToast()

  const handleDeploy = async () => {
    if (!siteName.trim()) {
      toast({
        title: "Site name required",
        description: "Please enter a site name for your deployment",
        variant: "destructive"
      })
      return
    }

    // Validate site name format
    const siteNameRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/
    if (!siteNameRegex.test(siteName)) {
      toast({
        title: "Invalid site name",
        description: "Site name must be lowercase alphanumeric with hyphens only",
        variant: "destructive"
      })
      return
    }

    setIsDeploying(true)
    setDeploymentStatus({ status: 'deploying' })

    try {
      const response = await fetch('/api/deploy/pipilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          siteName: siteName.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Deployment failed')
      }

      setDeploymentStatus({
        status: 'success',
        url: data.url,
        siteName: data.siteName,
        message: data.message
      })

      toast({
        title: "Deployment successful!",
        description: `Your site is now live at ${data.url}`,
      })

    } catch (error) {
      console.error('Deployment error:', error)
      setDeploymentStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'Deployment failed'
      })

      toast({
        title: "Deployment failed",
        description: error instanceof Error ? error.message : 'An error occurred during deployment',
        variant: "destructive"
      })
    } finally {
      setIsDeploying(false)
    }
  }

  const generateSiteName = () => {
    const baseName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 20)
    
    const randomSuffix = Math.random().toString(36).substring(2, 6)
    setSiteName(`${baseName}-${randomSuffix}`)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Rocket className="h-5 w-5 text-purple-600" />
          <CardTitle className="text-lg">Deploy to Pipilot</CardTitle>
        </div>
        <CardDescription>
          Deploy your project to <code className="text-purple-600">sitename.pipilot.dev</code>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="siteName">Site Name</Label>
          <div className="flex space-x-2">
            <Input
              id="siteName"
              placeholder="my-awesome-site"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              disabled={isDeploying}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateSiteName}
              disabled={isDeploying}
            >
              Generate
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Only lowercase letters, numbers, and hyphens allowed
          </p>
        </div>

        {deploymentStatus.status === 'deploying' && (
          <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-600">Deploying your project...</span>
          </div>
        )}

        {deploymentStatus.status === 'success' && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600">Deployment successful!</span>
            </div>
            
            <div className="space-y-2">
              <Label>Your site is live at:</Label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                  {deploymentStatus.url}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(deploymentStatus.url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {deploymentStatus.status === 'error' && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-600">{deploymentStatus.message}</span>
          </div>
        )}

        <Button
          onClick={handleDeploy}
          disabled={isDeploying || !siteName.trim()}
          className="w-full"
        >
          {isDeploying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deploying...
            </>
          ) : (
            <>
              <Rocket className="mr-2 h-4 w-4" />
              Deploy to Pipilot
            </>
          )}
        </Button>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Your site will be available at <code>{siteName || 'sitename'}.pipilot.dev</code></p>
          <p>• Deployment includes automatic building and optimization</p>
          <p>• Files are served from our global CDN</p>
        </div>
      </CardContent>
    </Card>
  )
}
