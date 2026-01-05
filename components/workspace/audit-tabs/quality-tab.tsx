"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, RefreshCw, FileText, FolderOpen, TrendingUp, AlertCircle, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Response } from "@/components/ai-elements/response"
import type { User } from "@supabase/supabase-js"
import type { Workspace } from "@/lib/storage-manager"

interface QualityTabProps {
    user: User
    selectedProject: Workspace | null
}

interface QualityFile {
    path: string
    name: string
    type: 'complexity' | 'coverage' | 'standards' | 'metrics' | 'general'
    lastModified?: string
}

export function QualityTab({ user, selectedProject }: QualityTabProps) {
    const { toast } = useToast()
    const [selectedQuality, setSelectedQuality] = useState<string>("")
    const [qualityContent, setQualityContent] = useState<string>("")
    const [availableQuality, setAvailableQuality] = useState<QualityFile[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (selectedProject) {
            loadAvailableQuality()
        }
    }, [selectedProject])

    const loadAvailableQuality = async () => {
        if (!selectedProject) return

        setIsLoading(true)
        try {
            // Check for quality analysis files in docs/quality/ directory
            const response = await fetch(`/api/chat-v2`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [{
                        role: 'user',
                        content: `List all markdown files in docs/quality/ directory and provide their metadata`
                    }],
                    projectId: selectedProject.id,
                    model: 'gpt-4o'
                })
            })

            if (response.ok) {
                const result = await response.json()
                // Parse the result to get quality files
                const qualityFiles: QualityFile[] = []

                // Mock some quality files for now - in real implementation this would parse the API response
                const mockQualityFiles: QualityFile[] = [
                    { path: "docs/quality/complexity-analysis.md", name: "Complexity Analysis", type: "complexity" },
                    { path: "docs/quality/test-coverage.md", name: "Test Coverage Report", type: "coverage" },
                    { path: "docs/quality/coding-standards.md", name: "Coding Standards", type: "standards" },
                    { path: "docs/quality/quality-metrics.md", name: "Quality Metrics", type: "metrics" },
                    { path: "docs/quality/general-quality.md", name: "General Quality Report", type: "general" }
                ]

                // Filter to only include files that actually exist
                for (const quality of mockQualityFiles) {
                    try {
                        const checkResponse = await fetch(`/api/chat-v2`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                messages: [{
                                    role: 'user',
                                    content: `Check if file exists: ${quality.path}`
                                }],
                                projectId: selectedProject.id,
                                model: 'gpt-4o'
                            })
                        })

                        if (checkResponse.ok) {
                            qualityFiles.push(quality)
                        }
                    } catch (error) {
                        continue
                    }
                }

                setAvailableQuality(qualityFiles)

                // Auto-select the first quality report if available
                if (qualityFiles.length > 0 && !selectedQuality) {
                    setSelectedQuality(qualityFiles[0].path)
                    loadQualityContent(qualityFiles[0].path)
                }
            }
        } catch (error) {
            console.error('Error loading quality reports:', error)
            toast({
                title: "Error",
                description: "Failed to load quality analysis files.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const loadQualityContent = async (filePath: string) => {
        if (!selectedProject || !filePath) return

        setIsLoading(true)
        try {
            const response = await fetch(`/api/chat-v2`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [{
                        role: 'user',
                        content: `Read the content of file: ${filePath}`
                    }],
                    projectId: selectedProject.id,
                    model: 'gpt-4o'
                })
            })

            if (!response.ok) {
                throw new Error('Failed to load quality report')
            }

            const result = await response.json()
            // Extract content from the tool result
            const content = result.content || result.result?.content || "# Quality Report Not Found\n\nThe requested quality analysis file could not be loaded."
            setQualityContent(content)
        } catch (error) {
            console.error('Error loading quality content:', error)
            setQualityContent("# Error Loading Quality Report\n\nFailed to load the quality analysis content. Please try again.")
            toast({
                title: "Error",
                description: "Failed to load quality report content.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleQualitySelect = (filePath: string) => {
        setSelectedQuality(filePath)
        loadQualityContent(filePath)
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'complexity': return <TrendingUp className="h-4 w-4" />
            case 'coverage': return <CheckCircle className="h-4 w-4" />
            case 'standards': return <AlertCircle className="h-4 w-4" />
            case 'metrics': return <BarChart3 className="h-4 w-4" />
            default: return <FileText className="h-4 w-4" />
        }
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'complexity': return 'bg-purple-100 text-purple-800'
            case 'coverage': return 'bg-green-100 text-green-800'
            case 'standards': return 'bg-blue-100 text-blue-800'
            case 'metrics': return 'bg-orange-100 text-orange-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    return (
        <div className="h-full flex flex-col p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Code Quality Reports</h2>
                    <p className="text-muted-foreground">
                        View auto-generated quality analysis and metrics reports
                    </p>
                </div>
                <Badge variant="secondary" className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    Quality Metrics
                </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1">
                {/* Quality Reports List */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FolderOpen className="h-5 w-5" />
                            Quality Reports
                        </CardTitle>
                        <CardDescription>
                            Available quality analysis files
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {availableQuality.map((quality) => (
                                <button
                                    key={quality.path}
                                    onClick={() => handleQualitySelect(quality.path)}
                                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                        selectedQuality === quality.path
                                            ? 'bg-accent border-accent-foreground/20'
                                            : 'hover:bg-accent/50 border-border'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        {getTypeIcon(quality.type)}
                                        <span className="font-medium text-sm">{quality.name}</span>
                                    </div>
                                    <Badge variant="secondary" className={`text-xs ${getTypeColor(quality.type)}`}>
                                        {quality.type}
                                    </Badge>
                                </button>
                            ))}

                            {availableQuality.length === 0 && !isLoading && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No quality reports found</p>
                                    <p className="text-xs">Quality reports will be generated automatically</p>
                                </div>
                            )}

                            {isLoading && (
                                <div className="flex items-center justify-center py-4">
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t">
                            <Button
                                onClick={loadAvailableQuality}
                                variant="outline"
                                size="sm"
                                className="w-full"
                                disabled={isLoading}
                            >
                                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Quality Report Viewer */}
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            {selectedQuality ? selectedQuality.split('/').pop() : 'Select a quality report'}
                        </CardTitle>
                        {selectedQuality && (
                            <CardDescription>
                                {selectedQuality}
                            </CardDescription>
                        )}
                    </CardHeader>
                    <CardContent>
                        {qualityContent ? (
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                <Response>{qualityContent}</Response>
                            </div>
                        ) : selectedQuality ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                                    <p className="text-muted-foreground">Loading quality report...</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground" />
                                    <h3 className="text-lg font-medium mb-2">Select a Quality Report</h3>
                                    <p className="text-muted-foreground">
                                        Choose a quality analysis report from the list to view its contents
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {!selectedProject && (
                <Card>
                    <CardContent className="flex items-center justify-center py-8">
                        <div className="text-center">
                            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No Project Selected</h3>
                            <p className="text-muted-foreground">
                                Select a project to view quality reports
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}