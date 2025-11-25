"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState, useRef, Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Users,
    Wallet,
    Key,
    Plus,
    ArrowUp,
    ArrowDown,
    Loader2,
    Sparkles,
    CreditCard,
    Activity,
    Settings,
    Trash2,
    Edit,
    Check
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface Team {
    id: string
    user_id: string
    name: string
    description: string | null
    wallet_id: string
    is_default: boolean
    created_at: string
    updated_at: string
    wallet?: {
        balance: number
        currency: string
    }
}

interface TeamActivity {
    id: string
    action_type: string
    description: string
    metadata: any
    created_at: string
}

interface TeamStats {
    apiRequests: number
    totalSpent: number
    apiKeys: number
    activeKeys: number
}

interface ApiKey {
    id: string
    name: string
    keyPrefix: string
    createdAt: string
    lastUsed?: string
    isActive: boolean
    rateLimitPerMinute?: number
    rateLimitPerDay?: number
    expiresAt?: string
}

interface Transaction {
    id: string
    amount: number
    type: 'credit' | 'debit'
    description: string
    createdAt: string
    status: 'completed' | 'pending' | 'failed'
}

function SearchParamsHandler({ onTabChange }: { onTabChange: (tab: string | null) => void }) {
    const searchParams = useSearchParams()

    useEffect(() => {
        const tab = searchParams.get('tab')
        onTabChange(tab)
    }, [searchParams, onTabChange])

    return null
}

function AIPlatformDashboardContent() {
    const supabase = createClient()
    const [teams, setTeams] = useState<Team[]>([])
    const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [activeTab, setActiveTab] = useState('overview')
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [showTopUpDialog, setShowTopUpDialog] = useState(false)
    const [topUpAmount, setTopUpAmount] = useState('10')

    // Form states
    const [teamName, setTeamName] = useState('')
    const [teamDescription, setTeamDescription] = useState('')

    // Stats
    const [animatedStats, setAnimatedStats] = useState({
        balance: 0,
        apiRequests: 0,
        totalSpent: 0,
        apiKeys: 0
    })

    const [realStats, setRealStats] = useState<TeamStats>({
        apiRequests: 0,
        totalSpent: 0,
        apiKeys: 0,
        activeKeys: 0
    })

    const [activity, setActivity] = useState<TeamActivity[]>([])

    const initialAnimationDone = useRef(false)

    // API Keys state
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
    const [loadingKeys, setLoadingKeys] = useState(false)
    const [creatingKey, setCreatingKey] = useState(false)
    const [showCreateKeyDialog, setShowCreateKeyDialog] = useState(false)
    const [newKeyName, setNewKeyName] = useState('')

    // Wallet state
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loadingWallet, setLoadingWallet] = useState(false)

    useEffect(() => {
        loadTeams()
    }, [])

    useEffect(() => {
        if (!currentTeam) return

        const interval = setInterval(() => {
            silentRefresh()
        }, 5000)

        return () => clearInterval(interval)
    }, [currentTeam])

    // Animate numbers
    useEffect(() => {
        if (!currentTeam) return

        const targetStats = {
            balance: currentTeam.wallet?.balance || 0,
            apiRequests: realStats.apiRequests,
            totalSpent: realStats.totalSpent,
            apiKeys: realStats.apiKeys
        }

        if (initialAnimationDone.current) {
            setAnimatedStats(targetStats)
            return
        }

        const duration = 1000
        const steps = 60
        const interval = duration / steps

        let step = 0
        const timer = setInterval(() => {
            step++
            const progress = step / steps

            setAnimatedStats({
                balance: targetStats.balance * progress,
                apiRequests: Math.floor(targetStats.apiRequests * progress),
                totalSpent: targetStats.totalSpent * progress,
                apiKeys: Math.floor(targetStats.apiKeys * progress)
            })

            if (step >= steps) {
                clearInterval(timer)
                setAnimatedStats(targetStats)
                initialAnimationDone.current = true
            }
        }, interval)

        return () => clearInterval(timer)
    }, [currentTeam, realStats])

    // Handle tab parameter from URL via callback
    const handleTabChange = (tab: string | null) => {
        if (tab && ['overview', 'keys', 'wallet', 'activity', 'settings'].includes(tab)) {
            setActiveTab(tab)
        }
    }

    // Load API keys when keys tab is selected
    useEffect(() => {
        if (activeTab === 'keys' && currentTeam) {
            loadApiKeys()
        }
    }, [activeTab, currentTeam])

    // Load wallet data when wallet tab is selected
    useEffect(() => {
        if (activeTab === 'wallet' && currentTeam) {
            loadWalletData()
        }
    }, [activeTab, currentTeam])

    async function loadTeams() {
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                toast.error('Please sign in to continue')
                return
            }

            const { data: teamsData, error } = await supabase
                .from('ai_platform_teams')
                .select(`
                    *,
                    wallet:ai_wallets(balance, currency)
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error

            setTeams(teamsData || [])

            // Auto-select first team or default team
            const storedTeamId = localStorage.getItem('current_ai_team_id')
            let selectedTeam = null

            if (storedTeamId) {
                selectedTeam = teamsData?.find(t => t.id === storedTeamId)
            }

            if (!selectedTeam && teamsData && teamsData.length > 0) {
                selectedTeam = teamsData.find(t => t.is_default) || teamsData[0]
            }

            if (selectedTeam) {
                await switchTeam(selectedTeam)
            }
        } catch (error) {
            console.error('Error loading teams:', error)
            toast.error('Failed to load teams')
        } finally {
            setLoading(false)
        }
    }

    async function switchTeam(team: Team) {
        setCurrentTeam(team)
        localStorage.setItem('current_ai_team_id', team.id)
        await loadTeamStats(team)
        await loadTeamActivity(team.id)
        initialAnimationDone.current = false
    }

    async function loadTeamStats(team: Team) {
        try {
            // Get API keys for this team's user
            const { data: keys, error: keysError } = await supabase
                .from('ai_api_keys')
                .select('*')
                .eq('user_id', team.user_id)

            if (keysError) throw keysError

            // Get usage logs
            const { data: usage, error: usageError } = await supabase
                .from('ai_usage_logs')
                .select('cost')
                .eq('wallet_id', team.wallet_id)
                .eq('user_id', team.user_id)

            if (usageError) throw usageError

            const totalSpent = usage?.reduce((sum, log) => sum + parseFloat(log.cost), 0) || 0
            const apiRequests = usage?.length || 0

            setRealStats({
                apiRequests,
                totalSpent,
                apiKeys: keys?.length || 0,
                activeKeys: keys?.filter(k => k.is_active).length || 0
            })
        } catch (error) {
            console.error('Error loading team stats:', error)
        }
    }

    async function loadTeamActivity(teamId: string) {
        try {
            const { data, error } = await supabase
                .from('ai_platform_activity')
                .select('*')
                .eq('team_id', teamId)
                .order('created_at', { ascending: false })
                .limit(20)

            if (error) throw error

            setActivity(data || [])
        } catch (error) {
            console.error('Error loading activity:', error)
        }
    }

    async function silentRefresh() {
        if (!currentTeam) return
        try {
            const { data: teamData, error } = await supabase
                .from('ai_platform_teams')
                .select(`
                    *,
                    wallet:ai_wallets(balance, currency)
                `)
                .eq('id', currentTeam.id)
                .single()

            if (error) throw error

            if (teamData) {
                setCurrentTeam(teamData)
                setTeams(prev => prev.map(t => t.id === teamData.id ? teamData : t))
                await loadTeamStats(teamData)
            }
        } catch (error) {
            console.error('Silent refresh error:', error)
        }
    }

    async function createTeam() {
        if (!teamName || teamName.trim().length === 0) {
            toast.error('Please enter a team name')
            return
        }

        if (teams.length >= 3) {
            toast.error('Maximum 3 teams allowed')
            return
        }

        try {
            setCreating(true)
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                toast.error('Please sign in to continue')
                return
            }

            const { data, error } = await supabase
                .from('ai_platform_teams')
                .insert({
                    user_id: user.id,
                    name: teamName.trim(),
                    description: teamDescription.trim() || null,
                    is_default: teams.length === 0
                })
                .select(`
                    *,
                    wallet:ai_wallets(balance, currency)
                `)
                .single()

            if (error) throw error

            toast.success(`Team "${teamName}" created successfully!`)
            setTeamName('')
            setTeamDescription('')
            setShowCreateDialog(false)
            await loadTeams()

            if (data) {
                await switchTeam(data)
            }
        } catch (error: any) {
            console.error('Error creating team:', error)
            if (error.message?.includes('Maximum 3 teams')) {
                toast.error('Maximum 3 teams allowed per user')
            } else {
                toast.error('Failed to create team')
            }
        } finally {
            setCreating(false)
        }
    }

    async function deleteTeam(teamId: string) {
        if (teams.length === 1) {
            toast.error('Cannot delete your only team')
            return
        }

        try {
            const { error } = await supabase
                .from('ai_platform_teams')
                .delete()
                .eq('id', teamId)

            if (error) throw error

            toast.success('Team deleted')
            await loadTeams()
        } catch (error) {
            console.error('Error deleting team:', error)
            toast.error('Failed to delete team')
        }
    }

    async function handleTopUp() {
        if (!currentTeam) return

        const amount = parseFloat(topUpAmount)
        if (isNaN(amount) || amount < 1 || amount > 1000) {
            toast.error('Amount must be between $1 and $1000')
            return
        }

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                toast.error('Please sign in to continue')
                return
            }

            const response = await fetch('/api/ai-api/stripe/checkout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount,
                    metadata: {
                        team_id: currentTeam.id,
                        team_name: currentTeam.name
                    }
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to create checkout session')
            }

            const data = await response.json()

            if (data.url) {
                window.location.href = data.url
            }
        } catch (error) {
            console.error('Error creating checkout:', error)
            toast.error('Failed to initiate payment')
        }
    }

    async function loadApiKeys() {
        if (!currentTeam) return

        try {
            setLoadingKeys(true)
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            const response = await fetch('/api/ai-api/keys', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            })

            if (response.ok) {
                const data = await response.json()
                setApiKeys(data.keys || [])
            }
        } catch (error) {
            console.error('Error loading API keys:', error)
        } finally {
            setLoadingKeys(false)
        }
    }

    async function loadWalletData() {
        if (!currentTeam) return

        try {
            setLoadingWallet(true)
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            const response = await fetch('/api/ai-api/wallet', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            })

            if (response.ok) {
                const data = await response.json()
                setTransactions(data.transactions || [])
            }
        } catch (error) {
            console.error('Error loading wallet data:', error)
        } finally {
            setLoadingWallet(false)
        }
    }

    async function createApiKey() {
        if (!newKeyName.trim()) {
            toast.error('Please enter a key name')
            return
        }

        try {
            setCreatingKey(true)
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            const response = await fetch('/api/ai-api/keys', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: newKeyName.trim(),
                }),
            })

            if (response.ok) {
                const data = await response.json()
                toast.success('API key created successfully!')
                setNewKeyName('')
                setShowCreateKeyDialog(false)
                await loadApiKeys()
                // Show the full key once
                setTimeout(() => {
                    toast.info(`Your API key: ${data.apiKey}`, { duration: 10000 })
                }, 1000)
            } else {
                const error = await response.json()
                toast.error(error.error || 'Failed to create API key')
            }
        } catch (error) {
            console.error('Error creating API key:', error)
            toast.error('Failed to create API key')
        } finally {
            setCreatingKey(false)
        }
    }

    async function deactivateApiKey(keyId: string) {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            const response = await fetch('/api/ai-api/keys', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    keyId,
                }),
            })

            if (response.ok) {
                toast.success('API key deactivated')
                await loadApiKeys()
            } else {
                const error = await response.json()
                toast.error(error.error || 'Failed to deactivate API key')
            }
        } catch (error) {
            console.error('Error deactivating API key:', error)
            toast.error('Failed to deactivate API key')
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount)
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'api_request': return <Activity className="h-4 w-4" />
            case 'payment': return <CreditCard className="h-4 w-4" />
            case 'key_created': return <Key className="h-4 w-4" />
            case 'key_deleted': return <Trash2 className="h-4 w-4" />
            case 'settings_updated': return <Settings className="h-4 w-4" />
            default: return <Activity className="h-4 w-4" />
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
        )
    }

    // No teams - show creation form
    if (teams.length === 0) {
        return (
            <div className="p-8 flex items-center justify-center min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="bg-gray-900/50 backdrop-blur-xl border-white/5 max-w-2xl w-full">
                    <CardHeader className="text-center pb-4">
                        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                            <Users className="h-10 w-10 text-purple-400" />
                        </div>
                        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Create Your First Team
                        </CardTitle>
                        <CardDescription className="text-gray-400 mt-2">
                            Teams help you organize your AI API usage with separate wallets and activity tracking
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="team-name" className="text-white">Team Name</Label>
                                <Input
                                    id="team-name"
                                    value={teamName}
                                    onChange={(e) => setTeamName(e.target.value)}
                                    placeholder="e.g., Production, Development, Testing"
                                    className="bg-gray-800/50 border-white/10 text-white"
                                    maxLength={50}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="team-description" className="text-white">Description (Optional)</Label>
                                <Textarea
                                    id="team-description"
                                    value={teamDescription}
                                    onChange={(e) => setTeamDescription(e.target.value)}
                                    placeholder="Describe what this team is for..."
                                    className="bg-gray-800/50 border-white/10 text-white resize-none"
                                    rows={3}
                                    maxLength={200}
                                />
                            </div>
                        </div>

                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                            <h4 className="text-white font-medium mb-2">What you get:</h4>
                            <ul className="space-y-1 text-sm text-gray-400">
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-purple-400" />
                                    Separate wallet for each team
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-purple-400" />
                                    Individual usage tracking
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-purple-400" />
                                    Team-specific API keys
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-purple-400" />
                                    Up to 3 teams per account
                                </li>
                            </ul>
                        </div>

                        <Button
                            onClick={createTeam}
                            disabled={creating || !teamName}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                        >
                            {creating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating Team...
                                </>
                            ) : (
                                <>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Team
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Has teams - show dashboard
    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Suspense fallback={null}>
                <SearchParamsHandler onTabChange={handleTabChange} />
            </Suspense>
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2">PiPilot AI Platform Dashboard</h1>
                    <p className="text-gray-400">Manage your teams, wallets, and API usage</p>
                </div>
            </div>

            {!currentTeam ? (
                <div className="flex items-center justify-center h-64">
                    <p className="text-gray-400">Select a team to view details</p>
                </div>
            ) : (
                <>
                    {/* Stats Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="bg-gradient-to-br from-purple-900/20 to-purple-700/10 border-purple-500/20 backdrop-blur-xl">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-purple-200">Wallet Balance</p>
                                        <h3 className="text-3xl font-bold text-white mt-1">
                                            {formatCurrency(animatedStats.balance)}
                                        </h3>
                                    </div>
                                    <div className="p-3 bg-purple-500/20 rounded-lg">
                                        <Wallet className="h-6 w-6 text-purple-400" />
                                    </div>
                                </div>
                                <Button
                                    onClick={() => setShowTopUpDialog(true)}
                                    size="sm"
                                    className="mt-4 w-full bg-purple-600 hover:bg-purple-500"
                                >
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Top Up
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-blue-900/20 to-blue-700/10 border-blue-500/20 backdrop-blur-xl">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-blue-200">API Requests</p>
                                        <h3 className="text-3xl font-bold text-white mt-1">
                                            {animatedStats.apiRequests.toLocaleString()}
                                        </h3>
                                    </div>
                                    <div className="p-3 bg-blue-500/20 rounded-lg">
                                        <Activity className="h-6 w-6 text-blue-400" />
                                    </div>
                                </div>
                                <p className="text-xs text-blue-200/60 mt-2">Total requests made</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-pink-900/20 to-pink-700/10 border-pink-500/20 backdrop-blur-xl">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-pink-200">Total Spent</p>
                                        <h3 className="text-3xl font-bold text-white mt-1">
                                            {formatCurrency(animatedStats.totalSpent)}
                                        </h3>
                                    </div>
                                    <div className="p-3 bg-pink-500/20 rounded-lg">
                                        <ArrowUp className="h-6 w-6 text-pink-400" />
                                    </div>
                                </div>
                                <p className="text-xs text-pink-200/60 mt-2">Lifetime spending</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-green-900/20 to-green-700/10 border-green-500/20 backdrop-blur-xl">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-green-200">API Keys</p>
                                        <h3 className="text-3xl font-bold text-white mt-1">
                                            {animatedStats.apiKeys}
                                        </h3>
                                    </div>
                                    <div className="p-3 bg-green-500/20 rounded-lg">
                                        <Key className="h-6 w-6 text-green-400" />
                                    </div>
                                </div>
                                <p className="text-xs text-green-200/60 mt-2">{realStats.activeKeys} active</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-1">
                                    {currentTeam ? currentTeam.name : 'Select a Team'}
                                </h2>
                                <p className="text-gray-400">
                                    {currentTeam ? `Created ${new Date(currentTeam.created_at).toLocaleDateString()}` : 'Choose a team from the sidebar'}
                                </p>
                            </div>
                            <TabsList className="bg-gray-900/50 border-white/5">
                                <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-pink-600/20 data-[state=active]:text-white">
                                    Overview
                                </TabsTrigger>
                                <TabsTrigger value="keys" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-pink-600/20 data-[state=active]:text-white">
                                    API Keys
                                </TabsTrigger>
                                <TabsTrigger value="wallet" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-pink-600/20 data-[state=active]:text-white">
                                    Wallet
                                </TabsTrigger>
                                <TabsTrigger value="activity" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-pink-600/20 data-[state=active]:text-white">
                                    Activity
                                </TabsTrigger>
                                <TabsTrigger value="settings" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-pink-600/20 data-[state=active]:text-white">
                                    Settings
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="overview" className="space-y-4">
                            <Card className="bg-gray-900/50 backdrop-blur-xl border-white/5">
                                <CardHeader>
                                    <CardTitle className="text-white">Team Information</CardTitle>
                                    <CardDescription className="text-gray-400">
                                        Details about {currentTeam.name}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-400">Team Name</p>
                                            <p className="text-white font-medium">{currentTeam.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Created</p>
                                            <p className="text-white font-medium">{formatDate(currentTeam.created_at)}</p>
                                        </div>
                                        {currentTeam.description && (
                                            <div className="col-span-2">
                                                <p className="text-sm text-gray-400">Description</p>
                                                <p className="text-white">{currentTeam.description}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2 pt-4">
                                        <Button
                                            onClick={() => setActiveTab('keys')}
                                            className="flex-1 bg-purple-600 hover:bg-purple-500"
                                        >
                                            <Key className="mr-2 h-4 w-4" />
                                            Manage API Keys
                                        </Button>
                                        <Button
                                            onClick={() => setActiveTab('wallet')}
                                            variant="outline"
                                            className="flex-1 border-white/10 text-white hover:bg-white/5"
                                        >
                                            <Wallet className="mr-2 h-4 w-4" />
                                            View Transactions
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="keys" className="space-y-4">
                            <Card className="bg-gray-900/50 backdrop-blur-xl border-white/5">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-white">API Keys</CardTitle>
                                            <CardDescription className="text-gray-400">
                                                Manage your API keys for accessing the PiPilot AI platform
                                            </CardDescription>
                                        </div>
                                        <Button
                                            onClick={() => setShowCreateKeyDialog(true)}
                                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Create Key
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {loadingKeys ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                                        </div>
                                    ) : apiKeys.length === 0 ? (
                                        <div className="text-center py-8">
                                            <Key className="mx-auto h-12 w-12 text-gray-600 opacity-20 mb-2" />
                                            <p className="text-gray-400">No API keys yet</p>
                                            <p className="text-gray-500 text-sm mt-2">Create your first API key to get started</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {apiKeys.map((key) => (
                                                <div key={key.id} className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-purple-500/20 rounded-lg">
                                                            <Key className="h-4 w-4 text-purple-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-medium">{key.name}</p>
                                                            <p className="text-gray-400 text-sm">
                                                                {key.keyPrefix}... • Created {formatDate(key.createdAt)}
                                                                {key.lastUsed && ` • Last used ${formatDate(key.lastUsed)}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={key.isActive ? "default" : "secondary"} className={key.isActive ? "bg-green-500/20 text-green-400" : ""}>
                                                            {key.isActive ? "Active" : "Inactive"}
                                                        </Badge>
                                                        {key.isActive && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => deactivateApiKey(key.id)}
                                                                className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="wallet" className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                {/* Balance Card */}
                                <Card className="bg-gradient-to-br from-purple-900/20 to-purple-700/10 border-purple-500/20 backdrop-blur-xl">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-purple-200">Current Balance</p>
                                                <h3 className="text-3xl font-bold text-white mt-1">
                                                    {currentTeam?.wallet ? formatCurrency(currentTeam.wallet.balance) : '$0.00'}
                                                </h3>
                                            </div>
                                            <div className="p-3 bg-purple-500/20 rounded-lg">
                                                <Wallet className="h-6 w-6 text-purple-400" />
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => setShowTopUpDialog(true)}
                                            size="sm"
                                            className="mt-4 w-full bg-purple-600 hover:bg-purple-500"
                                        >
                                            <CreditCard className="mr-2 h-4 w-4" />
                                            Top Up Balance
                                        </Button>
                                    </CardContent>
                                </Card>

                                {/* Quick Stats */}
                                <Card className="bg-gray-900/50 backdrop-blur-xl border-white/5">
                                    <CardContent className="p-6">
                                        <h4 className="text-white font-medium mb-4">Quick Stats</h4>
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">API Requests</span>
                                                <span className="text-white">{realStats.apiRequests.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Total Spent</span>
                                                <span className="text-white">{formatCurrency(realStats.totalSpent)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Active Keys</span>
                                                <span className="text-white">{realStats.activeKeys}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Transaction History */}
                            <Card className="bg-gray-900/50 backdrop-blur-xl border-white/5">
                                <CardHeader>
                                    <CardTitle className="text-white">Transaction History</CardTitle>
                                    <CardDescription className="text-gray-400">
                                        Recent transactions and balance changes
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {loadingWallet ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                                        </div>
                                    ) : transactions.length === 0 ? (
                                        <div className="text-center py-8">
                                            <Activity className="mx-auto h-12 w-12 text-gray-600 opacity-20 mb-2" />
                                            <p className="text-gray-400">No transactions yet</p>
                                            <p className="text-gray-500 text-sm mt-2">Your transaction history will appear here</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {transactions.map((transaction) => (
                                                <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${transaction.type === 'credit' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                                                            {transaction.type === 'credit' ? (
                                                                <ArrowUp className="h-4 w-4 text-green-400" />
                                                            ) : (
                                                                <ArrowDown className="h-4 w-4 text-red-400" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-medium">{transaction.description}</p>
                                                            <p className="text-gray-400 text-sm">{formatDate(transaction.createdAt)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`font-medium ${transaction.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                                                            {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                                        </p>
                                                        <Badge variant="outline" className={`text-xs ${transaction.status === 'completed' ? 'border-green-500/20 text-green-400' :
                                                            transaction.status === 'pending' ? 'border-yellow-500/20 text-yellow-400' :
                                                                'border-red-500/20 text-red-400'
                                                            }`}>
                                                            {transaction.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="activity" className="space-y-4">
                            <Card className="bg-gray-900/50 backdrop-blur-xl border-white/5">
                                <CardHeader>
                                    <CardTitle className="text-white">Recent Activity</CardTitle>
                                    <CardDescription className="text-gray-400">
                                        Latest actions for {currentTeam.name}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {activity.length === 0 ? (
                                        <div className="text-center py-8">
                                            <Activity className="mx-auto h-12 w-12 text-gray-600 opacity-20 mb-2" />
                                            <p className="text-gray-400">No activity yet</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {activity.map((item) => (
                                                <div key={item.id} className="flex items-start gap-3 p-3 bg-gray-800/30 rounded-lg">
                                                    <div className="p-2 bg-purple-500/20 rounded-lg">
                                                        {getActivityIcon(item.action_type)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-white text-sm">{item.description}</p>
                                                        <p className="text-gray-400 text-xs mt-1">{formatDate(item.created_at)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="settings" className="space-y-4">
                            <Card className="bg-gray-900/50 backdrop-blur-xl border-white/5">
                                <CardHeader>
                                    <CardTitle className="text-white">Team Settings</CardTitle>
                                    <CardDescription className="text-gray-400">
                                        Manage team configuration
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-white">Danger Zone</Label>
                                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                                            <h4 className="text-white font-medium mb-2">Delete Team</h4>
                                            <p className="text-gray-400 text-sm mb-3">
                                                Once you delete a team, there is no going back. Please be certain.
                                            </p>
                                            <Button
                                                variant="destructive"
                                                onClick={() => deleteTeam(currentTeam.id)}
                                                disabled={teams.length === 1}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete Team
                                            </Button>
                                            {teams.length === 1 && (
                                                <p className="text-xs text-gray-400 mt-2">Cannot delete your only team</p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </>
            )}

            {/* Create Team Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="bg-gray-900 border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-white">Create New Team</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            You can create up to 3 teams. Each team has its own wallet and activity.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-team-name" className="text-white">Team Name</Label>
                            <Input
                                id="new-team-name"
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                placeholder="e.g., Production, Development"
                                className="bg-gray-800/50 border-white/10 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-team-description" className="text-white">Description</Label>
                            <Textarea
                                id="new-team-description"
                                value={teamDescription}
                                onChange={(e) => setTeamDescription(e.target.value)}
                                placeholder="Optional description..."
                                className="bg-gray-800/50 border-white/10 text-white resize-none"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={createTeam}
                            disabled={creating || !teamName}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                        >
                            {creating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Team
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Top Up Dialog */}
            <Dialog open={showTopUpDialog} onOpenChange={setShowTopUpDialog}>
                <DialogContent className="bg-gray-900 border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-white">Top Up Wallet</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Add credits to {currentTeam?.name}'s wallet
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-white">Amount (USD)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                <Input
                                    type="number"
                                    min="1"
                                    max="1000"
                                    value={topUpAmount}
                                    onChange={(e) => setTopUpAmount(e.target.value)}
                                    className="bg-gray-800/50 border-white/10 text-white pl-7"
                                    placeholder="10.00"
                                />
                            </div>
                            <p className="text-xs text-gray-400">Minimum: $1.00, Maximum: $1,000.00</p>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {[10, 25, 50, 100].map(amount => (
                                <Button
                                    key={amount}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setTopUpAmount(amount.toString())}
                                    className="border-white/10 text-white hover:bg-white/5"
                                >
                                    ${amount}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={handleTopUp}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                        >
                            <CreditCard className="mr-2 h-4 w-4" />
                            Proceed to Payment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create API Key Dialog */}
            <Dialog open={showCreateKeyDialog} onOpenChange={setShowCreateKeyDialog}>
                <DialogContent className="bg-gray-900 border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-white">Create API Key</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Create a new API key for accessing the PiPilot AI platform
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="key-name" className="text-white">Key Name</Label>
                            <Input
                                id="key-name"
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                                placeholder="e.g., Production API Key"
                                className="bg-gray-800/50 border-white/10 text-white"
                                maxLength={50}
                            />
                            <p className="text-xs text-gray-400">Choose a descriptive name for your API key</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={createApiKey}
                            disabled={creatingKey || !newKeyName.trim()}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                        >
                            {creatingKey ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Key className="mr-2 h-4 w-4" />
                                    Create API Key
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}

function AIPlatformDashboardWrapper() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div></div>}>
            <AIPlatformDashboardContent />
        </Suspense>
    )
}

export default AIPlatformDashboardWrapper

