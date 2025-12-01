"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
    Users,
    Wallet,
    Key,
    Settings,
    Activity,
    ChevronDown,
    Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { User } from "@supabase/supabase-js"

interface AIPplatformTabProps {
    user: User
}

const platformItems = [
    {
        id: 'platform',
        label: 'Platform',
        icon: Users,
        href: '/ai/platform',
        description: 'Team management and overview'
    },
    {
        id: 'api-keys',
        label: 'API Keys',
        icon: Key,
        href: '/ai/platform/keys',
        description: 'Manage API keys'
    },
    {
        id: 'wallet',
        label: 'Wallet',
        icon: Wallet,
        href: '/ai/platform/wallet',
        description: 'Credits and billing'
    },
    {
        id: 'activity',
        label: 'Activity',
        icon: Activity,
        href: '/ai/platform/activity',
        description: 'Usage analytics'
    },
    {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        href: '/ai/platform/settings',
        description: 'Platform settings'
    }
]

export function AIPplatformTab({ user }: AIPplatformTabProps) {
    const router = useRouter()
    const [selectedItem, setSelectedItem] = useState(platformItems[0])

    const handleItemSelect = (item: typeof platformItems[0]) => {
        setSelectedItem(item)
        // Navigate to the selected platform page
        router.push(item.href)
    }

    return (
        <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Header with dropdown selector */}
            <div className="border-b border-white/10 bg-gray-900/95 backdrop-blur-xl p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">PiPilot AI Platform</h2>
                            <p className="text-sm text-gray-400">Manage your AI platform settings and resources</p>
                        </div>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="border-white/10 text-white hover:bg-white/5">
                                <selectedItem.icon className="w-4 h-4 mr-2" />
                                {selectedItem.label}
                                <ChevronDown className="w-4 h-4 ml-2" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-gray-900 border-white/10">
                            {platformItems.map((item) => {
                                const Icon = item.icon
                                return (
                                    <DropdownMenuItem
                                        key={item.id}
                                        onClick={() => handleItemSelect(item)}
                                        className="text-white hover:bg-gray-700 focus:bg-gray-700"
                                    >
                                        <Icon className="w-4 h-4 mr-2" />
                                        <div>
                                            <div className="font-medium">{item.label}</div>
                                            <div className="text-xs text-gray-400">{item.description}</div>
                                        </div>
                                    </DropdownMenuItem>
                                )
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Content area */}
            <div className="flex-1 p-6 overflow-auto">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Welcome card */}
                    <Card className="bg-gray-800/50 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center">
                                <Sparkles className="w-5 h-5 mr-2 text-purple-400" />
                                Welcome to PiPilot AI Platform
                            </CardTitle>
                            <CardDescription className="text-gray-400">
                                Manage your AI platform resources, API keys, wallet, and activity from here.
                                No need to navigate to external URLs - everything is integrated into your workspace.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {platformItems.map((item) => {
                                    const Icon = item.icon
                                    return (
                                        <Card
                                            key={item.id}
                                            className="bg-gray-700/50 border-white/5 hover:bg-gray-600/50 cursor-pointer transition-colors"
                                            onClick={() => handleItemSelect(item)}
                                        >
                                            <CardContent className="p-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center">
                                                        <Icon className="w-5 h-5 text-purple-400" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-medium text-white">{item.label}</h3>
                                                        <p className="text-xs text-gray-400">{item.description}</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick actions */}
                    <Card className="bg-gray-800/50 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white">Quick Actions</CardTitle>
                            <CardDescription className="text-gray-400">
                                Common tasks and shortcuts
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Button
                                    variant="outline"
                                    className="border-white/10 text-white hover:bg-white/5 justify-start h-auto p-4"
                                    onClick={() => handleItemSelect(platformItems.find(item => item.id === 'api-keys')!)}
                                >
                                    <Key className="w-4 h-4 mr-3" />
                                    <div className="text-left">
                                        <div className="font-medium">Generate API Key</div>
                                        <div className="text-xs text-gray-400">Create new API keys for your applications</div>
                                    </div>
                                </Button>

                                <Button
                                    variant="outline"
                                    className="border-white/10 text-white hover:bg-white/5 justify-start h-auto p-4"
                                    onClick={() => handleItemSelect(platformItems.find(item => item.id === 'wallet')!)}
                                >
                                    <Wallet className="w-4 h-4 mr-3" />
                                    <div className="text-left">
                                        <div className="font-medium">Top Up Credits</div>
                                        <div className="text-xs text-gray-400">Add credits to your wallet</div>
                                    </div>
                                </Button>

                                <Button
                                    variant="outline"
                                    className="border-white/10 text-white hover:bg-white/5 justify-start h-auto p-4"
                                    onClick={() => handleItemSelect(platformItems.find(item => item.id === 'activity')!)}
                                >
                                    <Activity className="w-4 h-4 mr-3" />
                                    <div className="text-left">
                                        <div className="font-medium">View Analytics</div>
                                        <div className="text-xs text-gray-400">Check your usage statistics</div>
                                    </div>
                                </Button>

                                <Button
                                    variant="outline"
                                    className="border-white/10 text-white hover:bg-white/5 justify-start h-auto p-4"
                                    onClick={() => handleItemSelect(platformItems.find(item => item.id === 'settings')!)}
                                >
                                    <Settings className="w-4 h-4 mr-3" />
                                    <div className="text-left">
                                        <div className="font-medium">Platform Settings</div>
                                        <div className="text-xs text-gray-400">Configure your platform preferences</div>
                                    </div>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}