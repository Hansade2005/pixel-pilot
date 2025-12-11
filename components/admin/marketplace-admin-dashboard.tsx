'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import {
  ShoppingCart, TrendingUp, Users, Star, FileText, Package,
  DollarSign, ArrowUp, ArrowDown, Eye
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

interface MarketplaceStats {
  summary: {
    totalCreators: number
    totalTemplates: number
    totalPaidTemplates: number
    totalFreeTemplates: number
    totalSales: number
    totalRevenue: string
    totalEarned: string
    totalPaidOut: string
    totalPending: string
    totalReviews: number
    totalBundles: number
    avgRating: string
    avgPricePerTemplate: string
    conversionRate: string
    avgReviewRating: string
  }
  topCreators: any[]
  topTemplates: any[]
  recentPurchases: any[]
  featuredTemplates: any[]
}

export function MarketplaceAdminDashboard() {
  const [stats, setStats] = useState<MarketplaceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchMarketplaceStats()
  }, [])

  const fetchMarketplaceStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/marketplace/stats')
      
      if (!response.ok) {
        throw new Error('Failed to fetch marketplace stats')
      }

      const data = await response.json()
      setStats(data)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading marketplace analytics...</p>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="p-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Data</CardTitle>
            <CardDescription>{error || 'No data available'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchMarketplaceStats}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { summary, topCreators, topTemplates, recentPurchases, featuredTemplates } = stats

  // Prepare data for charts
  const revenueChartData = topTemplates.slice(0, 10).map(t => ({
    name: t.tags?.[0] || 'Unknown',
    revenue: parseFloat(t.total_revenue || '0')
  }))

  const creatorEarningsData = topCreators.slice(0, 10).map(c => ({
    name: c.creator_id.substring(0, 8),
    earned: parseFloat(c.total_earned || '0'),
    paidOut: parseFloat(c.total_paid_out || '0')
  }))

  const templateDistribution = [
    { name: 'Paid', value: summary.totalPaidTemplates, color: '#3b82f6' },
    { name: 'Free', value: summary.totalFreeTemplates, color: '#10b981' }
  ]

  return (
    <div className="space-y-6 p-6 bg-background">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marketplace Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">Real-time marketplace analytics and monitoring</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Creators */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Creators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{summary.totalCreators}</div>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Active marketplace creators</p>
          </CardContent>
        </Card>

        {/* Total Templates */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{summary.totalTemplates}</div>
              <FileText className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {summary.totalPaidTemplates} paid · {summary.totalFreeTemplates} free
            </div>
          </CardContent>
        </Card>

        {/* Total Sales */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{summary.totalSales.toLocaleString()}</div>
              <ShoppingCart className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Purchase transactions</p>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">${parseFloat(summary.totalRevenue).toFixed(2)}</div>
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Platform earnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Creator Earnings Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Creator Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${parseFloat(summary.totalEarned).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total paid to creators</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Already Paid Out</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${parseFloat(summary.totalPaidOut).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Completed payouts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${parseFloat(summary.totalPending).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting withdrawal</p>
          </CardContent>
        </Card>
      </div>

      {/* Quality Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{summary.avgRating}/5</div>
              <Star className="h-4 w-4 text-yellow-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{summary.totalReviews} reviews</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.conversionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Sales per template</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Template Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.avgPricePerTemplate}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all paid templates</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue Trends</TabsTrigger>
          <TabsTrigger value="creators">Creator Earnings</TabsTrigger>
          <TabsTrigger value="distribution">Template Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Top Templates by Revenue</CardTitle>
              <CardDescription>Revenue generated by top 10 templates</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="creators">
          <Card>
            <CardHeader>
              <CardTitle>Top Creator Earnings</CardTitle>
              <CardDescription>Creator earnings vs payouts for top 10 creators</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={creatorEarningsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="earned" fill="#10b981" name="Total Earned" />
                  <Bar dataKey="paidOut" fill="#8b5cf6" name="Paid Out" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>Template Distribution</CardTitle>
              <CardDescription>Paid vs Free templates on marketplace</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={templateDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => 
                      `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {templateDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Featured Templates */}
      {featuredTemplates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Featured Templates</CardTitle>
            <CardDescription>Currently featured on marketplace ({featuredTemplates.length})</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featuredTemplates.map(template => (
                <div key={template.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold">{template.category || 'Uncategorized'}</h4>
                    <Badge>Featured</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Rating: {template.rating}/5 ({template.review_count} reviews)
                  </p>
                  <p className="text-sm font-medium">
                    Sales: {template.total_sales} · Revenue: ${template.total_revenue}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Purchases */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Purchases</CardTitle>
          <CardDescription>Latest {Math.min(20, recentPurchases.length)} purchase transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Purchase ID</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPurchases.map(purchase => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-mono text-xs">{purchase.id.substring(0, 8)}...</TableCell>
                    <TableCell className="font-mono text-xs">{purchase.template_id.substring(0, 8)}...</TableCell>
                    <TableCell className="font-mono text-xs">{purchase.buyer_id.substring(0, 8)}...</TableCell>
                    <TableCell>${parseFloat(purchase.price_paid || '0').toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={purchase.payment_status === 'completed' ? 'default' : 'secondary'}>
                        {purchase.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(purchase.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Top Creators Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Creators</CardTitle>
          <CardDescription>Creators ranked by total earnings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creator ID</TableHead>
                  <TableHead>Total Earned</TableHead>
                  <TableHead>Paid Out</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCreators.map(creator => (
                  <TableRow key={creator.id}>
                    <TableCell className="font-mono text-xs">{creator.creator_id.substring(0, 8)}...</TableCell>
                    <TableCell className="font-semibold">${parseFloat(creator.total_earned || '0').toFixed(2)}</TableCell>
                    <TableCell>${parseFloat(creator.total_paid_out || '0').toFixed(2)}</TableCell>
                    <TableCell>${parseFloat(creator.pending_payout || '0').toFixed(2)}</TableCell>
                    <TableCell>${parseFloat(creator.balance || '0').toFixed(2)}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(creator.updated_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button onClick={fetchMarketplaceStats} variant="outline">
          Refresh Data
        </Button>
      </div>
    </div>
  )
}
