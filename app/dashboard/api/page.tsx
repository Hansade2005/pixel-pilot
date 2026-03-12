"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Server,
  TrendingUp,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Clock,
  BarChart3
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { STRIPE_API_PLANS } from "@/config/stripe-api-plans"
import { useRouter } from "next/navigation"

interface ApiKey {
  id: string
  name: string
  key: string
  key_prefix: string
  created_at: string
  last_used_at: string | null
  requests_count: number
  tier: string
}

export default function ApiDashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentTier, setCurrentTier] = useState('free')
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])

  // Quota status
  const [quotaUsed, setQuotaUsed] = useState(0)
  const [quotaLimit, setQuotaLimit] = useState(10000)
  const [quotaLoading, setQuotaLoading] = useState(true)

  // Key generation
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [generatingKey, setGeneratingKey] = useState(false)

  // Key visibility
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      router.push('/auth/login?redirect=/dashboard/api')
      return
    }

    setUser(user)
    await fetchUserSubscription(user.id)
    await fetchApiKeys(user.id)
    await fetchQuotaStatus()
    setLoading(false)
  }

  const fetchUserSubscription = async (userId: string) => {
    try {
      // Fetch subscription from KV via API
      const response = await fetch(`/api/subscription/current`)
      const data = await response.json()

      if (data.tier) {
        setCurrentTier(data.tier)
        const planConfig = STRIPE_API_PLANS[data.tier as keyof typeof STRIPE_API_PLANS]
        if (planConfig) {
          setQuotaLimit(planConfig.requests)
        }
      } else {
        // Default to free tier
        setCurrentTier('free')
        setQuotaLimit(10000)
      }
    } catch (err) {
      console.error('Error fetching subscription:', err)
      // Default to free tier on error
      setCurrentTier('free')
      setQuotaLimit(10000)
    }
  }

  const fetchApiKeys = async (userId: string) => {
    try {
      const response = await fetch('/api/keys/list')
      const data = await response.json()

      if (data.keys) {
        setApiKeys(data.keys)
      }
    } catch (err) {
      console.error('Error fetching API keys:', err)
    }
  }

  const fetchQuotaStatus = async () => {
    try {
      // Fetch from Worker API
      const response = await fetch('https://pipilot-search-api.hanscadx8.workers.dev/health')
      const data = await response.json()

      if (data.quota) {
        setQuotaUsed(data.quota.used)
      }
      setQuotaLoading(false)
    } catch (err) {
      console.error('Error fetching quota:', err)
      setQuotaLoading(false)
    }
  }

  const generateApiKey = async () => {
    if (!newKeyName.trim()) {
      alert('Please enter a key name')
      return
    }

    setGeneratingKey(true)

    try {
      const response = await fetch('/api/keys/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName,
          tier: currentTier
        })
      })

      const data = await response.json()

      if (data.error) {
        alert(data.error)
        return
      }

      setGeneratedKey(data.apiKey)
      setNewKeyName('')
      await fetchApiKeys(user.id)

    } catch (err: any) {
      console.error('Error generating key:', err)
      alert('Failed to generate API key')
    } finally {
      setGeneratingKey(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys)
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId)
    } else {
      newVisible.add(keyId)
    }
    setVisibleKeys(newVisible)
  }

  const revokeKey = async (apiKey: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return
    }

    try {
      await fetch(`/api/keys/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId: apiKey }) // API expects keyId field
      })

      await fetchApiKeys(user.id)
    } catch (err) {
      console.error('Error revoking key:', err)
      alert('Failed to revoke API key')
    }
  }

  const currentPlan = STRIPE_API_PLANS[currentTier as keyof typeof STRIPE_API_PLANS]
  const quotaPercentage = quotaLimit > 0 ? Math.round((quotaUsed / quotaLimit) * 100) : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Search API Dashboard</h1>
          <p className="text-gray-400">Manage your API keys, monitor usage, and upgrade your plan.</p>
        </div>

        {/* Subscription Status */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400">Current Plan</h3>
              <Server className="w-5 h-5 text-orange-400" />
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-white">{currentPlan?.name}</span>
              {currentPlan?.price !== null && (
                <span className="text-gray-400">${currentPlan?.price}/mo</span>
              )}
            </div>
            <p className="text-sm text-gray-400 mb-4">{currentPlan?.requestsDisplay}</p>
            {currentTier === 'free' && (
              <Button
                size="sm"
                className="w-full bg-orange-500 hover:bg-orange-600"
                asChild
              >
                <Link href="/api#pricing">
                  Upgrade Plan
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            )}
          </Card>

          <Card className="bg-gray-800 border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400">Monthly Usage</h3>
              <BarChart3 className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-white">
                {quotaUsed.toLocaleString()}
              </span>
              <span className="text-gray-400">/ {quotaLimit.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full ${
                  quotaPercentage > 80
                    ? 'bg-red-500'
                    : quotaPercentage > 60
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-400">{quotaPercentage}% used this month</p>
          </Card>

          <Card className="bg-gray-800 border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400">Active API Keys</h3>
              <Key className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-white">{apiKeys.length}</span>
              <span className="text-gray-400">keys</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              {apiKeys.length === 0 ? 'No keys generated yet' : 'Managing your access'}
            </p>
            <Button
              size="sm"
              className="w-full bg-purple-500 hover:bg-purple-600"
              onClick={() => setShowNewKeyDialog(true)}
            >
              <Plus className="mr-2 w-4 h-4" />
              Generate New Key
            </Button>
          </Card>
        </div>

        {/* API Keys List */}
        <Card className="bg-gray-800 border-gray-700 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Your API Keys</h2>
            <Button
              onClick={() => setShowNewKeyDialog(true)}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Plus className="mr-2 w-4 h-4" />
              Generate New Key
            </Button>
          </div>

          {apiKeys.length === 0 ? (
            <div className="text-center py-12">
              <Key className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No API Keys Yet</h3>
              <p className="text-gray-400 mb-6">
                Generate your first API key to start using the Search API.
              </p>
              <Button
                onClick={() => setShowNewKeyDialog(true)}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="mr-2 w-4 h-4" />
                Generate Your First Key
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <Card key={key.id} className="bg-gray-700 border-gray-600 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-white">{key.name}</h3>
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                          {key.tier}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-sm text-gray-300 bg-gray-800 px-3 py-1 rounded font-mono">
                          {visibleKeys.has(key.id) ? key.key : `${key.key_prefix}••••••••••••••••`}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleKeyVisibility(key.id)}
                        >
                          {visibleKeys.has(key.id) ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(key.key)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Created {new Date(key.created_at).toLocaleDateString()}
                        </span>
                        {key.last_used_at && (
                          <span className="flex items-center gap-1">
                            <Zap className="w-4 h-4" />
                            Last used {new Date(key.last_used_at).toLocaleDateString()}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          {key.requests_count || 0} requests
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => revokeKey(key.key)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Start Guide */}
        <Card className="bg-gray-800 border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Quick Start</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">1. Copy your API key above</h3>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">2. Make your first request</h3>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-gray-300 font-mono">
{`curl -X POST https://pipilot-search-api.hanscadx8.workers.dev/search \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "AI news", "maxResults": 5}'`}
                </pre>
              </div>
            </div>
            <div>
              <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-700" asChild>
                <Link href="/docs">
                  Read Full Documentation
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* New Key Dialog */}
      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          {generatedKey ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                  API Key Generated!
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Copy your API key now. You won't be able to see it again.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Your New API Key</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      value={generatedKey}
                      readOnly
                      className="bg-gray-700 border-gray-600 text-white font-mono"
                    />
                    <Button
                      onClick={() => copyToClipboard(generatedKey)}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <div className="text-sm text-yellow-200">
                      <strong>Important:</strong> Store this key securely. You won't be able to see it again after closing this dialog.
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => {
                    setGeneratedKey(null)
                    setShowNewKeyDialog(false)
                  }}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Generate New API Key</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Create a new API key for your {currentPlan?.name} plan.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="keyName" className="text-gray-300">
                    Key Name
                  </Label>
                  <Input
                    id="keyName"
                    placeholder="e.g., Production, Development, Testing"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white mt-2"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowNewKeyDialog(false)}
                  className="border-gray-600 text-white hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={generateApiKey}
                  disabled={generatingKey}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {generatingKey ? (
                    <>
                      <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Key className="mr-2 w-4 h-4" />
                      Generate Key
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
