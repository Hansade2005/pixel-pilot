"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { checkAdminAccess, ADMIN_MENU_ITEMS, hasAdminPermission, ADMIN_PERMISSIONS } from "@/lib/admin-utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  BarChart3,
  Users,
  CreditCard,
  TrendingUp,
  Settings,
  Shield,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Activity,
  UserPlus,
  Zap
} from "lucide-react"

interface SystemStats {
  totalUsers: number
  activeUsers: number
  totalRevenue: number
  monthlyRevenue: number
  totalSubscriptions: number
  activeSubscriptions: number
  creditUsage: number
  systemHealth: 'healthy' | 'warning' | 'critical'
  subscriptionSystemEnabled: boolean
}

interface SystemSettings {
  subscriptionSystemEnabled: boolean
  freeModeDescription: string
  lastUpdated: string
  updatedBy: string
}

export default function AdminPanel() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(false)
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
      const statsData = await loadSystemStats()
      // System settings are now included in stats, so we can set them from there
      if (statsData?.subscriptionSystemEnabled !== undefined) {
        setSystemSettings({
          subscriptionSystemEnabled: statsData.subscriptionSystemEnabled,
          freeModeDescription: statsData.subscriptionSystemEnabled ? 'Subscription system is active' : 'Free usage mode - no credit charges',
          lastUpdated: new Date().toISOString(),
          updatedBy: user?.email || 'system'
        })
      }
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/workspace')
    } finally {
      setLoading(false)
    }
  }

  const loadSystemStats = async () => {
    try {
      // Fetch system statistics
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
        return data // Return stats for use in checkAdminAndLoadData
      }
      return null
    } catch (error) {
      console.error('Error loading system stats:', error)
      return null
    }
  }

  const loadSystemSettings = async () => {
    try {
      const response = await fetch('/api/admin/system-settings')
      if (response.ok) {
        const data = await response.json()
        const subscriptionSetting = data.settings?.subscription_system_enabled

        if (subscriptionSetting) {
          setSystemSettings({
            subscriptionSystemEnabled: subscriptionSetting.enabled,
            freeModeDescription: subscriptionSetting.description || 'Free usage mode',
            lastUpdated: subscriptionSetting.updated_at,
            updatedBy: subscriptionSetting.updated_by
          })
        } else {
          // Default settings if none exist
          setSystemSettings({
            subscriptionSystemEnabled: true,
            freeModeDescription: 'Subscription system is active',
            lastUpdated: new Date().toISOString(),
            updatedBy: user?.email || 'system'
          })
        }
      }
    } catch (error) {
      console.error('Error loading system settings:', error)
    }
  }

  const toggleSubscriptionSystem = async (enabled: boolean) => {
    try {
      setSettingsLoading(true)

      const response = await fetch('/api/admin/system-settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled })
      })

      if (response.ok) {
        const data = await response.json()

        // Reload stats to reflect changes (this also updates system settings)
        const updatedStats = await loadSystemStats()

        // Update system settings from the updated stats
        if (updatedStats?.subscriptionSystemEnabled !== undefined) {
          setSystemSettings({
            subscriptionSystemEnabled: updatedStats.subscriptionSystemEnabled,
            freeModeDescription: updatedStats.subscriptionSystemEnabled ? 'Subscription system is active' : 'Free usage mode - no credit charges',
            lastUpdated: new Date().toISOString(),
            updatedBy: user?.email || 'system'
          })
        }

        // Show success message
        alert(`Subscription system ${enabled ? 'enabled' : 'disabled'} successfully!`)
      } else {
        throw new Error('Failed to update system settings')
      }
    } catch (error) {
      console.error('Error toggling subscription system:', error)
      alert('Failed to update subscription system. Please try again.')
    } finally {
      setSettingsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!user || !checkAdminAccess(user)) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Admin Panel</h1>
                <p className="text-sm text-muted-foreground">System management and analytics</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Admin Access
              </Badge>
              <span className="text-sm text-muted-foreground">
                Welcome, {user.email}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {ADMIN_MENU_ITEMS.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                if (item.id === 'users') {
                  router.push('/admin/users')
                } else if (item.id === 'billing') {
                  router.push('/admin/billing')
                } else if (item.id === 'analytics') {
                  router.push('/admin/analytics')
                } else if (item.id === 'system') {
                  router.push('/admin/system')
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {/* Icon would be rendered based on item.icon */}
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">Manage system</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                +{stats?.activeUsers || 0} active today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.subscriptionSystemEnabled ? `$${stats?.totalRevenue || 0}` : '$0'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.subscriptionSystemEnabled
                  ? `+$${stats?.monthlyRevenue || 0} this month`
                  : 'Free mode - no charges'
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.subscriptionSystemEnabled ? (stats?.activeSubscriptions || 0) : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.subscriptionSystemEnabled
                  ? `of ${stats?.totalSubscriptions || 0} total`
                  : 'Free mode - no subscriptions'
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <Activity className={`h-4 w-4 ${
                stats?.systemHealth === 'healthy' ? 'text-green-500' :
                stats?.systemHealth === 'warning' ? 'text-yellow-500' : 'text-red-500'
              }`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{stats?.systemHealth || 'Unknown'}</div>
              <p className="text-xs text-muted-foreground">
                All systems operational
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest system events and user actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">New user registration</p>
                    <p className="text-xs text-muted-foreground">2 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Subscription upgrade</p>
                    <p className="text-xs text-muted-foreground">5 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Payment failed</p>
                    <p className="text-xs text-muted-foreground">10 minutes ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                System Alerts
              </CardTitle>
              <CardDescription>Important notifications and warnings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        All systems operational
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        No issues detected
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Revenue target met
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        15% above monthly goal
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Settings */}
        <div id="system-settings" className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Settings
              </CardTitle>
              <CardDescription>
                Control global system behavior and subscription management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Subscription System Toggle */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="subscription-toggle" className="text-base font-medium">
                        Subscription System
                      </Label>
                      <Badge variant={systemSettings?.subscriptionSystemEnabled ? "default" : "secondary"}>
                        {systemSettings?.subscriptionSystemEnabled ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {systemSettings?.subscriptionSystemEnabled
                        ? "Users are charged credits for usage. Normal subscription system active."
                        : "Free usage mode: All users get unlimited credits. No charges applied."
                      }
                    </p>
                    {systemSettings && (
                      <p className="text-xs text-muted-foreground">
                        Last updated: {new Date(systemSettings.lastUpdated).toLocaleString()} by {systemSettings.updatedBy}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      id="subscription-toggle"
                      checked={systemSettings?.subscriptionSystemEnabled || false}
                      onCheckedChange={toggleSubscriptionSystem}
                      disabled={settingsLoading}
                    />
                  </div>
                </div>

                {/* System Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Current Mode</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {systemSettings?.subscriptionSystemEnabled ? "Paid Mode" : "Free Mode"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {systemSettings?.subscriptionSystemEnabled
                        ? "Credit charges active"
                        : "Unlimited usage for all users"
                      }
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Impact</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {systemSettings?.subscriptionSystemEnabled ? "Revenue Generation" : "User Growth"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {systemSettings?.subscriptionSystemEnabled
                        ? "Users pay for usage"
                        : "Users get free unlimited access"
                      }
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={() => alert('Add User functionality coming soon!')}
                >
                  <UserPlus className="h-6 w-6" />
                  <span className="text-xs">Add User</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={() => router.push('/admin/billing')}
                >
                  <CreditCard className="h-6 w-6" />
                  <span className="text-xs">Process Refund</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={() => router.push('/admin/system')}
                >
                  <Settings className="h-6 w-6" />
                  <span className="text-xs">System Config</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={() => router.push('/admin/analytics')}
                >
                  <BarChart3 className="h-6 w-6" />
                  <span className="text-xs">View Reports</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
