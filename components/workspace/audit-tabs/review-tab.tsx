"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, RefreshCw, FileText, FolderOpen, Shield, Bug, Zap } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Response } from "@/components/ai-elements/response"
import type { User } from "@supabase/supabase-js"
import type { Workspace } from "@/lib/storage-manager"

interface ReviewTabProps {
    user: User
    selectedProject: Workspace | null
}

interface ReviewFile {
    path: string
    name: string
    type: 'security' | 'performance' | 'maintainability' | 'general'
    lastModified?: string
}

export function ReviewTab({ user, selectedProject }: ReviewTabProps) {
    const { toast } = useToast()
    const [selectedReview, setSelectedReview] = useState<string>("")
    const [reviewContent, setReviewContent] = useState<string>("")
    const [availableReviews, setAvailableReviews] = useState<ReviewFile[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (selectedProject) {
            loadAvailableReviews()
        }
    }, [selectedProject])

    const loadAvailableReviews = async () => {
        if (!selectedProject) return

        setIsLoading(true)
        try {
            // Check for review files in docs/reviews/ directory
            const response = await fetch(`/api/chat-v2`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [{
                        role: 'user',
                        content: `List all markdown files in docs/reviews/ directory and provide their metadata`
                    }],
                    projectId: selectedProject.id,
                    model: 'gpt-4o'
                })
            })

            if (response.ok) {
                const result = await response.json()
                // Parse the result to get review files
                const reviews: ReviewFile[] = []

                // Mock some review files for now - in real implementation this would parse the API response
                const mockReviews: ReviewFile[] = [
                    { path: "docs/reviews/security-review.md", name: "Security Review", type: "security" },
                    { path: "docs/reviews/performance-review.md", name: "Performance Review", type: "performance" },
                    { path: "docs/reviews/maintainability-review.md", name: "Maintainability Review", type: "maintainability" },
                    { path: "docs/reviews/general-review.md", name: "General Code Review", type: "general" }
                ]

                // Filter to only include files that actually exist
                for (const review of mockReviews) {
                    try {
                        const checkResponse = await fetch(`/api/chat-v2`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                messages: [{
                                    role: 'user',
                                    content: `Check if file exists: ${review.path}`
                                }],
                                projectId: selectedProject.id,
                                model: 'gpt-4o'
                            })
                        })

                        if (checkResponse.ok) {
                            reviews.push(review)
                        }
                    } catch (error) {
                        continue
                    }
                }

                setAvailableReviews(reviews)

                // Auto-select the first review if available
                if (reviews.length > 0 && !selectedReview) {
                    setSelectedReview(reviews[0].path)
                    loadReviewContent(reviews[0].path)
                }
            }
        } catch (error) {
            console.error('Error loading reviews:', error)
            toast({
                title: "Error",
                description: "Failed to load code review files.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const loadReviewContent = async (filePath: string) => {
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
                throw new Error('Failed to load review')
            }

            const result = await response.json()
            // Extract content from the tool result
            const content = result.content || result.result?.content || "# Review Not Found\n\nThe requested code review file could not be loaded."
            setReviewContent(content)
        } catch (error) {
            console.error('Error loading review content:', error)
            setReviewContent("# Error Loading Review\n\nFailed to load the code review content. Please try again.")
            toast({
                title: "Error",
                description: "Failed to load review content.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleReviewSelect = (filePath: string) => {
        setSelectedReview(filePath)
        loadReviewContent(filePath)
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'security': return <Shield className="h-4 w-4" />
            case 'performance': return <Zap className="h-4 w-4" />
            case 'maintainability': return <Bug className="h-4 w-4" />
            default: return <FileText className="h-4 w-4" />
        }
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'security': return 'bg-red-100 text-red-800'
            case 'performance': return 'bg-yellow-100 text-yellow-800'
            case 'maintainability': return 'bg-blue-100 text-blue-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    return (
        <div className="h-full flex flex-col p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Code Reviews</h2>
                    <p className="text-muted-foreground">
                        View auto-generated code review reports and analysis
                    </p>
                </div>
                <Badge variant="secondary" className="flex items-center gap-1">
                    <Search className="h-3 w-3" />
                    AI Review
                </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1">
                {/* Reviews List */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FolderOpen className="h-5 w-5" />
                            Reviews
                        </CardTitle>
                        <CardDescription>
                            Available code review reports
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {availableReviews.map((review) => (
                                <button
                                    key={review.path}
                                    onClick={() => handleReviewSelect(review.path)}
                                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                        selectedReview === review.path
                                            ? 'bg-accent border-accent-foreground/20'
                                            : 'hover:bg-accent/50 border-border'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        {getTypeIcon(review.type)}
                                        <span className="font-medium text-sm">{review.name}</span>
                                    </div>
                                    <Badge variant="secondary" className={`text-xs ${getTypeColor(review.type)}`}>
                                        {review.type}
                                    </Badge>
                                </button>
                            ))}

                            {availableReviews.length === 0 && !isLoading && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No reviews found</p>
                                    <p className="text-xs">Code reviews will be generated automatically</p>
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
                                onClick={loadAvailableReviews}
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

                {/* Review Viewer */}
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            {selectedReview ? selectedReview.split('/').pop() : 'Select a review'}
                        </CardTitle>
                        {selectedReview && (
                            <CardDescription>
                                {selectedReview}
                            </CardDescription>
                        )}
                    </CardHeader>
                    <CardContent>
                        {reviewContent ? (
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                <Response>{reviewContent}</Response>
                            </div>
                        ) : selectedReview ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                                    <p className="text-muted-foreground">Loading review...</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <Search className="h-12 w-12 mx-auto text-muted-foreground" />
                                    <h3 className="text-lg font-medium mb-2">Select a Review</h3>
                                    <p className="text-muted-foreground">
                                        Choose a code review report from the list to view its contents
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
                            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No Project Selected</h3>
                            <p className="text-muted-foreground">
                                Select a project to view code reviews
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}