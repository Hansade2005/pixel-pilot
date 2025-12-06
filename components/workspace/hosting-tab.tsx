"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { 
  Globe, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Plus,
  Trash2,
  Copy,
  Link as LinkIcon
} from "lucide-react"
import type { User } from "@supabase/supabase-js"
import type { Workspace } from "@/lib/storage-manager"
import { createClient } from "@/lib/supabase/client"

interface HostingTabProps {
  user: User
  selectedProject: Workspace | null
}

interface ProjectHostingInfo {
  customDomain: string | null
  defaultDomain: string
  isCustomDomainConnected: boolean
  isCustomDomainVerified: boolean
  customDomainAddedAt: string | null
}

export function HostingTab({ user, selectedProject }: HostingTabProps) {
  const { toast } = useToast()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [hostingInfo, setHostingInfo] = useState<ProjectHostingInfo | null>(null)
  const [newDomain, setNewDomain] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    if (selectedProject?.id) {
      loadHostingInfo()
    }
  }, [selectedProject?.id])

  const loadHostingInfo = async () => {
    if (!selectedProject?.id) return

    setLoading(true)
    try {
      // Get custom domain from supabase_projects table
      const { data, error } = await supabase
        .from('supabase_projects')
        .select('custom_domain, custom_domain_verified, custom_domain_added_at')
        .eq('pixelpilot_project_id', selectedProject.id)
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading hosting info:', error)
        toast({
          title: "Error",
          description: "Failed to load hosting information",
          variant: "destructive",
        })
        return
      }

      const customDomain = data?.custom_domain || null
      const defaultDomain = `${selectedProject.id}.pipilot.dev`

      setHostingInfo({
        customDomain,
        defaultDomain,
        isCustomDomainConnected: !!customDomain,
        isCustomDomainVerified: data?.custom_domain_verified || false,
        customDomainAddedAt: data?.custom_domain_added_at || null
      })
    } catch (error) {
      console.error('Error loading hosting info:', error)
      toast({
        title: "Error",
        description: "Failed to load hosting information",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const connectCustomDomain = async () => {
    if (!newDomain.trim()) {
      toast({
        title: "Error",
        description: "Please enter a domain name",
        variant: "destructive",
      })
      return
    }

    if (!selectedProject?.id) return

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!domainRegex.test(newDomain)) {
      toast({
        title: "Error",
        description: "Please enter a valid domain name",
        variant: "destructive",
      })
      return
    }

    setIsConnecting(true)
    try {
      // Update custom_domain in supabase_projects
      const { error } = await supabase
        .from('supabase_projects')
        .update({ 
          custom_domain: newDomain.trim(),
          custom_domain_verified: false,
          custom_domain_added_at: new Date().toISOString()
        })
        .eq('pixelpilot_project_id', selectedProject.id)
        .eq('user_id', user.id)

      if (error) {
        // If no existing row, insert one
        if (error.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('supabase_projects')
            .insert({
              pixelpilot_project_id: selectedProject.id,
              user_id: user.id,
              supabase_project_id: 'N/A',
              supabase_project_name: selectedProject.name || 'Project',
              custom_domain: newDomain.trim(),
              custom_domain_verified: false,
              custom_domain_added_at: new Date().toISOString()
            })

          if (insertError) throw insertError
        } else {
          throw error
        }
      }

      toast({
        title: "Success",
        description: `Custom domain ${newDomain} connected successfully`,
      })

      setNewDomain("")
      loadHostingInfo()
    } catch (error) {
      console.error('Error connecting custom domain:', error)
      toast({
        title: "Error",
        description: "Failed to connect custom domain",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const removeCustomDomain = async () => {
    if (!selectedProject?.id) return

    if (!confirm('Are you sure you want to remove the custom domain?')) {
      return
    }

    setIsRemoving(true)
    try {
      const { error } = await supabase
        .from('supabase_projects')
        .update({ 
          custom_domain: null,
          custom_domain_verified: false,
          custom_domain_added_at: null
        })
        .eq('pixelpilot_project_id', selectedProject.id)
        .eq('user_id', user.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Custom domain removed successfully",
      })

      loadHostingInfo()
    } catch (error) {
      console.error('Error removing custom domain:', error)
      toast({
        title: "Error",
        description: "Failed to remove custom domain",
        variant: "destructive",
      })
    } finally {
      setIsRemoving(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Domain copied to clipboard",
    })
  }

  if (!selectedProject) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Project Selected</h3>
          <p className="text-sm text-muted-foreground">
            Select a project to manage its hosting settings
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" />
            Project Hosting
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage custom domains for {selectedProject.name || 'your project'}
          </p>
        </div>

        {/* Default Domain Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Default Domain
            </CardTitle>
            <CardDescription>
              Your project is automatically available at this domain
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <code className="text-sm font-mono">{hostingInfo?.defaultDomain}</code>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(`https://${hostingInfo?.defaultDomain}`)}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://${hostingInfo?.defaultDomain}`, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Visit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custom Domain Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LinkIcon className="h-5 w-5" />
              Custom Domain
            </CardTitle>
            <CardDescription>
              Connect your own domain to this project for a professional appearance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hostingInfo?.isCustomDomainConnected ? (
              <div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg mb-4">
                  <div className="flex items-center gap-2">
                    {hostingInfo.isCustomDomainVerified ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                    <code className="text-sm font-mono">{hostingInfo.customDomain}</code>
                    {hostingInfo.isCustomDomainVerified ? (
                      <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                        Pending Verification
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(`https://${hostingInfo.customDomain}`)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://${hostingInfo.customDomain}`, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Visit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={removeCustomDomain}
                      disabled={isRemoving}
                    >
                      {isRemoving ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="h-3 w-3 mr-1" />
                          Remove
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Make sure your DNS records point to your hosting provider.
                    For full domain management including DNS verification, visit the{' '}
                    <Button
                      variant="link"
                      className="p-0 h-auto"
                      onClick={() => window.location.href = `/sites/${selectedProject.id}/domains`}
                    >
                      Domain Management Page
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div>
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="example.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && connectCustomDomain()}
                  />
                  <Button
                    onClick={connectCustomDomain}
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Connect
                  </Button>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    After connecting a custom domain, you'll need to configure DNS records.
                    Visit the{' '}
                    <Button
                      variant="link"
                      className="p-0 h-auto"
                      onClick={() => window.location.href = `/sites/${selectedProject.id}/domains`}
                    >
                      Domain Management Page
                    </Button>
                    {' '}for detailed DNS instructions and verification.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium">About Custom Domains</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Free custom domains for all projects</li>
                  <li>Automatic SSL certificates</li>
                  <li>DNS configuration required at your registrar</li>
                  <li>Full verification and management in Domain Management page</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
