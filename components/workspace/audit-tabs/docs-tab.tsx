"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, RefreshCw, BookOpen, File, FolderOpen } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Response } from "@/components/ai-elements/response"
import type { User } from "@supabase/supabase-js"
import type { Workspace } from "@/lib/storage-manager"

interface DocsTabProps {
    user: User
    selectedProject: Workspace | null
}

interface DocFile {
    path: string
    name: string
    type: 'readme' | 'api' | 'feature' | 'contributing' | 'changelog' | 'other'
    lastModified?: string
}

export function DocsTab({ user, selectedProject }: DocsTabProps) {
    const { toast } = useToast()
    const [selectedDoc, setSelectedDoc] = useState<string>("")
    const [docContent, setDocContent] = useState<string>("")
    const [availableDocs, setAvailableDocs] = useState<DocFile[]>([])
    const [isLoading, setIsLoading] = useState(false)

    // Default documentation files to check
    const defaultDocs: DocFile[] = [
        { path: "README.md", name: "README", type: "readme" },
        { path: "docs/api.md", name: "API Documentation", type: "api" },
        { path: "docs/features.md", name: "Features", type: "feature" },
        { path: "docs/contributing.md", name: "Contributing Guide", type: "contributing" },
        { path: "CHANGELOG.md", name: "Changelog", type: "changelog" }
    ]

    useEffect(() => {
        if (selectedProject) {
            loadAvailableDocs()
        }
    }, [selectedProject])

    const loadAvailableDocs = async () => {
        if (!selectedProject) return

        setIsLoading(true)
        try {
            // Check which documentation files exist
            const existingDocs: DocFile[] = []

            for (const doc of defaultDocs) {
                try {
                    // Try to read each documentation file
                    const response = await fetch(`/api/chat-v2`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            messages: [{
                                role: 'user',
                                content: `Check if file exists: ${doc.path}`
                            }],
                            projectId: selectedProject.id,
                            model: 'gpt-4o'
                        })
                    })

                    if (response.ok) {
                        const result = await response.json()
                        // If we can read the file, it exists
                        existingDocs.push(doc)
                    }
                } catch (error) {
                    // File doesn't exist, skip
                    continue
                }
            }

            // Also check for review and quality docs
            try {
                const reviewsResponse = await fetch(`/api/chat-v2`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        messages: [{
                            role: 'user',
                            content: `List files in docs/reviews/ directory`
                        }],
                        projectId: selectedProject.id,
                        model: 'gpt-4o'
                    })
                })

                if (reviewsResponse.ok) {
                    // Add review docs to the list
                    existingDocs.push(
                        { path: "docs/reviews/", name: "Code Reviews", type: "other" }
                    )
                }
            } catch (error) {
                // No review docs
            }

            try {
                const qualityResponse = await fetch(`/api/chat-v2`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        messages: [{
                            role: 'user',
                            content: `List files in docs/quality/ directory`
                        }],
                        projectId: selectedProject.id,
                        model: 'gpt-4o'
                    })
                })

                if (qualityResponse.ok) {
                    // Add quality docs to the list
                    existingDocs.push(
                        { path: "docs/quality/", name: "Quality Reports", type: "other" }
                    )
                }
            } catch (error) {
                // No quality docs
            }

            setAvailableDocs(existingDocs)

            // Auto-select README if it exists
            const readme = existingDocs.find(doc => doc.type === 'readme')
            if (readme && !selectedDoc) {
                setSelectedDoc(readme.path)
                loadDocContent(readme.path)
            }
        } catch (error) {
            console.error('Error loading docs:', error)
            toast({
                title: "Error",
                description: "Failed to load documentation files.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const loadDocContent = async (filePath: string) => {
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
                throw new Error('Failed to load document')
            }

            const result = await response.json()
            // Extract content from the tool result
            const content = result.content || result.result?.content || "# Document Not Found\n\nThe requested documentation file could not be loaded."
            setDocContent(content)
        } catch (error) {
            console.error('Error loading doc content:', error)
            setDocContent("# Error Loading Document\n\nFailed to load the documentation content. Please try again.")
            toast({
                title: "Error",
                description: "Failed to load document content.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleDocSelect = (filePath: string) => {
        setSelectedDoc(filePath)
        loadDocContent(filePath)
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'readme': return <BookOpen className="h-4 w-4" />
            case 'api': return <FileText className="h-4 w-4" />
            case 'feature': return <File className="h-4 w-4" />
            case 'contributing': return <FileText className="h-4 w-4" />
            case 'changelog': return <FileText className="h-4 w-4" />
            default: return <FolderOpen className="h-4 w-4" />
        }
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'readme': return 'bg-blue-100 text-blue-800'
            case 'api': return 'bg-green-100 text-green-800'
            case 'feature': return 'bg-purple-100 text-purple-800'
            case 'contributing': return 'bg-orange-100 text-orange-800'
            case 'changelog': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    return (
        <div className="h-full flex flex-col p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Documentation</h2>
                    <p className="text-muted-foreground">
                        View auto-generated documentation and guides
                    </p>
                </div>
                <Badge variant="secondary" className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    Auto Docs
                </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1">
                {/* Documentation List */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FolderOpen className="h-5 w-5" />
                            Documents
                        </CardTitle>
                        <CardDescription>
                            Available documentation files
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {availableDocs.map((doc) => (
                                <button
                                    key={doc.path}
                                    onClick={() => handleDocSelect(doc.path)}
                                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                        selectedDoc === doc.path
                                            ? 'bg-accent border-accent-foreground/20'
                                            : 'hover:bg-accent/50 border-border'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        {getTypeIcon(doc.type)}
                                        <span className="font-medium text-sm">{doc.name}</span>
                                    </div>
                                    <Badge variant="secondary" className={`text-xs ${getTypeColor(doc.type)}`}>
                                        {doc.type}
                                    </Badge>
                                </button>
                            ))}

                            {availableDocs.length === 0 && !isLoading && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No documentation found</p>
                                    <p className="text-xs">Documentation will be generated automatically</p>
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
                                onClick={loadAvailableDocs}
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

                {/* Document Viewer */}
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            {selectedDoc ? selectedDoc.split('/').pop() : 'Select a document'}
                        </CardTitle>
                        {selectedDoc && (
                            <CardDescription>
                                {selectedDoc}
                            </CardDescription>
                        )}
                    </CardHeader>
                    <CardContent>
                        {docContent ? (
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                <Response>{docContent}</Response>
                            </div>
                        ) : selectedDoc ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                                    <p className="text-muted-foreground">Loading document...</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                                    <h3 className="text-lg font-medium mb-2">Select a Document</h3>
                                    <p className="text-muted-foreground">
                                        Choose a documentation file from the list to view its contents
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
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No Project Selected</h3>
                            <p className="text-muted-foreground">
                                Select a project to view documentation
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}