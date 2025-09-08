"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { checkAdminAccess } from "@/lib/admin-utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Settings,
  Shield,
  Database,
  Key,
  AlertTriangle,
  CheckCircle
} from "lucide-react"

export default function AdminSystemPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAndLoadData()
  }, [])

  const checkAdminAndLoadData = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        router.push('/auth/login')
        return
      }

      if (!checkAdminAccess(user)) {
        router.push('/workspace')
        return
      }

      setUser(user)
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/workspace')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading system settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/admin')}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">System Settings</h1>
              <p className="text-sm text-muted-foreground">Advanced system configuration and maintenance</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* System Health */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Healthy</div>
              <p className="text-xs text-muted-foreground">
                All systems operational
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Connected</div>
              <p className="text-xs text-muted-foreground">
                Supabase Online
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Active</div>
              <p className="text-xs text-muted-foreground">
                All protections enabled
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Configuration Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Environment Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Environment Configuration
              </CardTitle>
              <CardDescription>System environment and API settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Stripe Integration</p>
                    <p className="text-xs text-muted-foreground">Payment processing</p>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Configured
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Supabase Database</p>
                    <p className="text-xs text-muted-foreground">Data storage</p>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Connected
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Email Service</p>
                    <p className="text-xs text-muted-foreground">Notifications</p>
                  </div>
                  <Badge variant="outline">
                    Not Configured
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Maintenance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                System Maintenance
              </CardTitle>
              <CardDescription>Maintenance and optimization tools</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button variant="outline" className="w-full justify-start">
                  <Database className="h-4 w-4 mr-2" />
                  Clear Cache
                </Button>

                <Button variant="outline" className="w-full justify-start">
                  <Shield className="h-4 w-4 mr-2" />
                  Security Audit
                </Button>

                <Button variant="outline" className="w-full justify-start">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  System Health Check
                </Button>

                <Button variant="outline" className="w-full justify-start" disabled>
                  <Key className="h-4 w-4 mr-2" />
                  Backup Database (Coming Soon)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Note */}
        <Card className="mt-6">
          <CardContent className="p-6 text-center">
            <Settings className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Advanced System Settings</h3>
            <p className="text-muted-foreground mb-4">
              For comprehensive system configuration, use the main admin dashboard where you can:
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant="secondary">Toggle Subscription System</Badge>
              <Badge variant="secondary">Manage User Permissions</Badge>
              <Badge variant="secondary">Configure Billing Settings</Badge>
              <Badge variant="secondary">Monitor System Health</Badge>
            </div>
            <Button
              className="mt-4"
              onClick={() => router.push('/admin')}
            >
              Go to Main Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
