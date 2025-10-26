"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { checkAdminAccess } from "@/lib/admin-utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ArrowLeft,
  Search,
  Filter,
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Receipt,
  RefreshCw,
  Calendar,
  Shield
} from "lucide-react"

interface SubscriptionData {
  id: string
  user_id: string
  user_email: string
  user_name: string | null
  subscription_plan: string
  subscription_status: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  deployments_this_month: number
  github_pushes_this_month: number
  subscription_start_date: string | null
  subscription_end_date: string | null
  last_payment_date: string | null
  cancel_at_period_end: boolean
  created_at: string
}

export default function AdminBillingPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionData | null>(null)
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAndLoadSubscriptions()
  }, [])

  const checkAdminAndLoadSubscriptions = async () => {
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
      await loadSubscriptions()
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/workspace')
    } finally {
      setLoading(false)
    }
  }

  const loadSubscriptions = async () => {
    try {
      // Fetch subscriptions with user profile data
      const { data: userSettings, error: settingsError } = await supabase
        .from('user_settings')
        .select(`
          *,
          profiles!inner(email, full_name)
        `)
        .neq('subscription_plan', 'free')

      if (settingsError) {
        console.error('Error fetching subscriptions:', settingsError)
        return
      }

      // Transform data to match our interface
      const transformedData = userSettings?.map(setting => ({
        id: setting.id,
        user_id: setting.user_id,
        user_email: setting.profiles?.email || '',
        user_name: setting.profiles?.full_name || null,
        subscription_plan: setting.subscription_plan,
        subscription_status: setting.subscription_status,
        stripe_customer_id: setting.stripe_customer_id,
        stripe_subscription_id: setting.stripe_subscription_id,
        deployments_this_month: setting.deployments_this_month || 0,
        github_pushes_this_month: setting.github_pushes_this_month || 0,
        subscription_start_date: setting.subscription_start_date,
        subscription_end_date: setting.subscription_end_date,
        last_payment_date: setting.last_payment_date,
        cancel_at_period_end: setting.cancel_at_period_end,
        created_at: setting.created_at
      })) || []

      setSubscriptions(transformedData)
    } catch (error) {
      console.error('Error loading subscriptions:', error)
    }
  }

  const filteredSubscriptions = subscriptions.filter(sub =>
    sub.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (sub.user_name && sub.user_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    sub.subscription_plan.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'trialing':
        return <Badge className="bg-blue-100 text-blue-800">Trial</Badge>
      case 'past_due':
        return <Badge className="bg-yellow-100 text-yellow-800">Past Due</Badge>
      case 'canceled':
        return <Badge className="bg-red-100 text-red-800">Canceled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'pro':
        return <Badge className="bg-purple-100 text-purple-800">$15/month</Badge>
      case 'teams':
        return <Badge className="bg-blue-100 text-blue-800">$30/month</Badge>
      case 'enterprise':
        return <Badge className="bg-orange-100 text-orange-800">$60/month</Badge>
      default:
        return <Badge variant="outline">{plan}</Badge>
    }
  }

  const calculateRevenue = () => {
    return subscriptions.reduce((total, sub) => {
      if (sub.subscription_status === 'active' || sub.subscription_status === 'trialing') {
        const monthlyRate = sub.subscription_plan === 'pro' ? 15 :
                           sub.subscription_plan === 'teams' ? 30 :
                           sub.subscription_plan === 'enterprise' ? 60 : 0
        return total + monthlyRate
      }
      return total
    }, 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading billing management...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                <h1 className="text-2xl font-bold">Billing Management</h1>
                <p className="text-sm text-muted-foreground">Manage subscriptions, payments, and revenue</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="bg-green-100 text-green-800 w-fit">
                <CheckCircle className="h-3 w-3 mr-1" />
                Admin Access
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subscriptions by email, name, or plan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" onClick={loadSubscriptions}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Revenue Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <DollarSign className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${calculateRevenue()}</p>
                  <p className="text-xs text-muted-foreground">Monthly Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{subscriptions.length}</p>
                  <p className="text-xs text-muted-foreground">Active Subscriptions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    ${Math.round(calculateRevenue() * 12)}
                  </p>
                  <p className="text-xs text-muted-foreground">Annual Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {subscriptions.filter(s => s.subscription_status === 'past_due').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Past Due</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscriptions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Active Subscriptions ({filteredSubscriptions.length})</CardTitle>
            <CardDescription>
              Monitor and manage all paid subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Mobile Card Layout */}
            <div className="block md:hidden space-y-4">
              {filteredSubscriptions.map((subscription) => (
                <Card key={subscription.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{subscription.user_name || 'No name'}</h3>
                        <p className="text-sm text-muted-foreground truncate">{subscription.user_email}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedSubscription(subscription)
                            setShowSubscriptionDialog(true)
                          }}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {subscription.subscription_status === 'active' && (
                            <DropdownMenuItem
                              onClick={async () => {
                                if (confirm(`Cancel subscription for ${subscription.user_email}?`)) {
                                  try {
                                    const response = await fetch('/api/admin/billing', {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        subscriptionId: subscription.id,
                                        action: 'cancel'
                                      })
                                    })
                                    if (response.ok) {
                                      alert('Subscription cancelled successfully!')
                                      await loadSubscriptions()
                                    } else {
                                      const err = await response.json()
                                      alert(err.error || 'Failed to cancel subscription')
                                    }
                                  } catch (error) {
                                    console.error('Error cancelling subscription:', error)
                                    alert('Error cancelling subscription')
                                  }
                                }
                              }}
                              className="text-red-600"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel Subscription
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {getPlanBadge(subscription.subscription_plan)}
                      {getStatusBadge(subscription.subscription_status)}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Deployments: {subscription.deployments_this_month}/∞</div>
                      <div>GitHub: {subscription.github_pushes_this_month}/∞</div>
                      <div>Next billing: {subscription.subscription_end_date ? new Date(subscription.subscription_end_date).toLocaleDateString() : 'N/A'}</div>
                      <div>Started: {new Date(subscription.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Next Billing</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{subscription.user_name || 'No name'}</p>
                        <p className="text-sm text-muted-foreground">{subscription.user_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getPlanBadge(subscription.subscription_plan)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(subscription.subscription_status)}
                        {subscription.cancel_at_period_end && (
                          <Badge variant="outline" className="text-xs">
                            Cancels at period end
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="text-xs text-muted-foreground">
                          Deployments: {subscription.deployments_this_month}/{subscription.subscription_plan === 'pro' ? 10 : 5}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          GitHub: {subscription.github_pushes_this_month}/2
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {subscription.subscription_end_date
                            ? new Date(subscription.subscription_end_date).toLocaleDateString()
                            : 'N/A'
                          }
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedSubscription(subscription)
                            setShowSubscriptionDialog(true)
                          }}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Receipt className="h-4 w-4 mr-2" />
                            View Invoices
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-yellow-600">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Pause Subscription
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel Subscription
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>

            {filteredSubscriptions.length === 0 && (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No active subscriptions found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery ? 'Try adjusting your search terms' : 'Subscriptions will appear here when users upgrade'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription Details Dialog */}
        <Dialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Subscription Details</DialogTitle>
              <DialogDescription>
                Detailed information about {selectedSubscription?.user_email}'s subscription
              </DialogDescription>
            </DialogHeader>

            {selectedSubscription && (
              <div className="space-y-6">
                {/* Customer Info */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary">
                      {selectedSubscription.user_email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {selectedSubscription.user_name || 'No name'}
                    </h3>
                    <p className="text-muted-foreground">{selectedSubscription.user_email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {getPlanBadge(selectedSubscription.subscription_plan)}
                      {getStatusBadge(selectedSubscription.subscription_status)}
                    </div>
                  </div>
                </div>

                {/* Subscription Details */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Stripe Customer ID</span>
                      </div>
                      <p className="text-sm font-mono break-all">
                        {selectedSubscription.stripe_customer_id || 'Not available'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Subscription ID</span>
                      </div>
                      <p className="text-sm font-mono break-all">
                        {selectedSubscription.stripe_subscription_id || 'Not available'}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Usage Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedSubscription.deployments_this_month}
                      </div>
                      <p className="text-xs text-muted-foreground">Deployments (Month)</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedSubscription.github_pushes_this_month}
                      </div>
                      <p className="text-xs text-muted-foreground">GitHub Pushes (Month)</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedSubscription.subscription_plan === 'pro' ? 29 :
                         selectedSubscription.subscription_plan === 'teams' ? 30 :
                         selectedSubscription.subscription_plan === 'enterprise' ? 60 : 0}
                      </div>
                      <p className="text-xs text-muted-foreground">Monthly Rate</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Subscription Timeline */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Subscription Timeline</h4>
                  <div className="space-y-2">
                    {selectedSubscription.subscription_start_date && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Started: {new Date(selectedSubscription.subscription_start_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedSubscription.last_payment_date && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>Last Payment: {new Date(selectedSubscription.last_payment_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedSubscription.subscription_end_date && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className={`w-2 h-2 rounded-full ${selectedSubscription.cancel_at_period_end ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                        <span>
                          {selectedSubscription.cancel_at_period_end ? 'Cancels' : 'Renews'}: {new Date(selectedSubscription.subscription_end_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    <Receipt className="h-4 w-4 mr-2" />
                    View Invoices
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Update Payment Method
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Send Notification
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSubscriptionDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
