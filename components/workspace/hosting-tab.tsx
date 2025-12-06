"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
// Lucide React icons for UI
import { 
  Globe, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Rocket,
  Link as LinkIcon
} from "lucide-react"
import type { User } from "@supabase/supabase-js"
import type { Workspace } from "@/lib/storage-manager"
import { createClient } from "@/lib/supabase/client"

interface HostingTabProps {
  user: User
  selectedProject: Workspace | null
}

interface Site {
  id: string
  site_type: 'preview' | 'production'
  url: string
  deployed_at: string
  is_active: boolean
  custom_domain_id: string | null
  custom_domains?: {
    domain: string
    verified: boolean
  }
}

export function HostingTab({ user, selectedProject }: HostingTabProps) {
  const { toast } = useToast()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [sites, setSites] = useState<Site[]>([])
  const [customDomain, setCustomDomain] = useState<string | null>(null)
  const [isDomainVerified, setIsDomainVerified] = useState(false)
  const [isViteProject, setIsViteProject] = useState(false)
  const [checkingFramework, setCheckingFramework] = useState(true)

  useEffect(() => {
    if (selectedProject?.id) {
      detectFramework()
      loadSites()
      loadCustomDomain()
    }
  }, [selectedProject?.id])

  const detectFramework = async () => {
    if (!selectedProject?.id) return
    
    setCheckingFramework(true)
    try {
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      const files = await storageManager.getFiles(selectedProject.id)
      
      const hasViteConfig = files.some((f: any) => 
        f.path === 'vite.config.js' || 
        f.path === 'vite.config.ts' || 
        f.path === 'vite.config.mjs'
      )
      
      setIsViteProject(hasViteConfig)
    } catch (error) {
      console.error('Error detecting framework:', error)
    } finally {
      setCheckingFramework(false)
    }
  }

  const loadSites = async () => {
    if (!selectedProject?.id) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('*, custom_domains(domain, verified)')
        .eq('project_id', selectedProject.id)
        .eq('user_id', user.id)
        .order('deployed_at', { ascending: false })

      if (error) {
        console.error('Error loading sites:', error)
        toast({
          title: "Error",
          description: "Failed to load sites",
          variant: "destructive",
        })
        return
      }

      setSites(data || [])
    } catch (error) {
      console.error('Error loading sites:', error)
      toast({
        title: "Error",
        description: "Failed to load sites",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadCustomDomain = async () => {
    if (!selectedProject?.id) return

    try {
      const { data } = await supabase
        .from('supabase_projects')
        .select('custom_domain, custom_domain_verified')
        .eq('pixelpilot_project_id', selectedProject.id)
        .eq('user_id', user.id)
        .single()

      if (data?.custom_domain) {
        setCustomDomain(data.custom_domain)
        setIsDomainVerified(data.custom_domain_verified || false)
      }
    } catch (error) {
      console.error('Error loading custom domain:', error)
    }
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

  if (checkingFramework) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isViteProject) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">Hosting Not Available</h3>
          <p className="text-sm text-muted-foreground">
            Custom hosting is currently only available for Vite projects. 
            This project appears to be using a different framework.
          </p>
        </div>
      </div>
    )
  }

  const productionSites = sites.filter(s => s.site_type === 'production')

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" />
            Production Sites
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage production deployments for {selectedProject.name || 'your project'}
          </p>
        </div>

        {/* Production Sites */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-green-500" />
              Production Sites
            </CardTitle>
            <CardDescription>
              Live sites available to everyone
            </CardDescription>
          </CardHeader>
          <CardContent>
            {productionSites.length > 0 ? (
              <div className="space-y-3">
                {productionSites.map((site) => (
                  <div key={site.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <a 
                          href={site.url} 
                          target="_blank"
                          className="text-blue-600 hover:underline font-mono text-sm"
                        >
                          {site.url}
                        </a>
                        <Badge variant={site.is_active ? 'default' : 'secondary'}>
                          {site.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {site.custom_domains && (
                        <div className="flex items-center gap-2 ml-6 text-sm">
                          <LinkIcon className="h-3 w-3 text-purple-500" />
                          <span className="text-muted-foreground">Custom domain:</span>
                          <span className="font-mono">{site.custom_domains.domain}</span>
                          {site.custom_domains.verified ? (
                            <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                              Pending
                            </Badge>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground ml-6 mt-1">
                        Deployed {formatDate(site.deployed_at)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(site.url, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Visit
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No production sites deployed yet</p>
                <p className="text-sm mt-1">Deploy your project to production from the project page</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Custom Domain Info */}
        {customDomain && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Custom domain <code className="font-mono">{customDomain}</code> is {isDomainVerified ? 'verified' : 'pending verification'}.
              To link it to a production site, deploy to production from the project page.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
