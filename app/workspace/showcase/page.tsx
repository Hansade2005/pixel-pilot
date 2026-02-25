"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Globe,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Heart,
  Eye,
  Trash2,
  Plus,
  Upload,
  Github,
  Link,
  Tag,
  Image,
  Code,
  Star,
  ChevronRight,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface ShowcaseProject {
  id: string
  user_id: string
  project_id: string
  title: string
  description: string | null
  category: string
  thumbnail_url: string | null
  live_url: string | null
  github_url: string | null
  tech_stack: string[] | null
  status: string
  views: number
  likes: number
  created_at: string
  updated_at: string
}

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "web-app", label: "Web App" },
  { value: "mobile-app", label: "Mobile App" },
  { value: "ai-ml", label: "AI / ML" },
  { value: "e-commerce", label: "E-Commerce" },
  { value: "saas", label: "SaaS" },
  { value: "portfolio", label: "Portfolio" },
  { value: "game", label: "Game" },
  { value: "tool", label: "Tool" },
  { value: "other", label: "Other" },
]

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function ShowcasePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get("projectId")
  const projectName = searchParams.get("name") || ""

  const [activeTab, setActiveTab] = useState<"my-projects" | "publish-new">(
    projectId ? "publish-new" : "my-projects"
  )
  const [projects, setProjects] = useState<ShowcaseProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Publish form state
  const [formProjectId, setFormProjectId] = useState(projectId || "")
  const [formTitle, setFormTitle] = useState(projectName || "")
  const [formDescription, setFormDescription] = useState("")
  const [formCategory, setFormCategory] = useState("general")
  const [formLiveUrl, setFormLiveUrl] = useState("")
  const [formGithubUrl, setFormGithubUrl] = useState("")
  const [formThumbnailUrl, setFormThumbnailUrl] = useState("")
  const [formTechStack, setFormTechStack] = useState("")
  const [publishing, setPublishing] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)

  // Unpublish dialog state
  const [unpublishDialog, setUnpublishDialog] = useState<ShowcaseProject | null>(null)
  const [unpublishing, setUnpublishing] = useState(false)

  const getSession = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session
  }, [])

  const fetchMyProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const session = await getSession()
      if (!session) {
        router.push("/login")
        return
      }

      const res = await fetch("/api/showcase?mine=true", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.error || "Failed to fetch projects")
      }

      const json = await res.json()
      setProjects(json.projects || [])
    } catch (err: any) {
      setError(err.message || "Failed to load your showcase projects")
    } finally {
      setLoading(false)
    }
  }, [getSession, router])

  useEffect(() => {
    fetchMyProjects()
  }, [fetchMyProjects])

  const handlePublish = async () => {
    if (!formProjectId.trim() || !formTitle.trim()) return

    setPublishing(true)
    setPublishError(null)
    setPublishSuccess(false)

    try {
      const session = await getSession()
      if (!session) {
        router.push("/login")
        return
      }

      const techStackArray = formTechStack
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)

      const res = await fetch("/api/showcase", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: formProjectId.trim(),
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          category: formCategory,
          thumbnailUrl: formThumbnailUrl.trim() || null,
          liveUrl: formLiveUrl.trim() || null,
          githubUrl: formGithubUrl.trim() || null,
          techStack: techStackArray.length > 0 ? techStackArray : null,
        }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.error || "Failed to publish project")
      }

      setPublishSuccess(true)
      fetchMyProjects()
    } catch (err: any) {
      setPublishError(err.message || "Failed to publish project")
    } finally {
      setPublishing(false)
    }
  }

  const handleUnpublish = async () => {
    if (!unpublishDialog) return

    setUnpublishing(true)
    try {
      const session = await getSession()
      if (!session) return

      const res = await fetch(`/api/showcase?id=${unpublishDialog.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== unpublishDialog.id))
        setUnpublishDialog(null)
      } else {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.error || "Failed to unpublish")
      }
    } catch (err: any) {
      console.error("Failed to unpublish:", err)
    } finally {
      setUnpublishing(false)
    }
  }

  const resetForm = () => {
    setFormProjectId(projectId || "")
    setFormTitle(projectName || "")
    setFormDescription("")
    setFormCategory("general")
    setFormLiveUrl("")
    setFormGithubUrl("")
    setFormThumbnailUrl("")
    setFormTechStack("")
    setPublishSuccess(false)
    setPublishError(null)
  }

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find((c) => c.value === value)?.label || value
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-8 w-8 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-orange-400" />
              <h1 className="text-lg font-semibold text-gray-100">Project Showcase</h1>
              {projectName && (
                <Badge className="bg-gray-800 text-gray-400 border-0 text-[10px]">
                  {projectName}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Tab Bar */}
        <div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("my-projects")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                activeTab === "my-projects"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10"
              }`}
            >
              <Star className="h-3.5 w-3.5" />
              My Projects
            </button>
            <button
              onClick={() => {
                setActiveTab("publish-new")
                if (publishSuccess) resetForm()
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                activeTab === "publish-new"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10"
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              Publish New
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && activeTab === "my-projects" && (
          <Card className="bg-gray-900/80 border-red-500/30">
            <CardContent className="pt-6 pb-5 text-center">
              <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-gray-300">{error}</p>
              <Button
                onClick={() => {
                  setError(null)
                  fetchMyProjects()
                }}
                variant="ghost"
                size="sm"
                className="mt-3 text-gray-400 hover:text-orange-400 text-xs"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* My Projects Tab */}
        {activeTab === "my-projects" && (
          <>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
              </div>
            ) : !error && projects.length === 0 ? (
              <Card className="bg-gray-900/80 border-gray-800/60">
                <CardContent className="py-12 text-center">
                  <Globe className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                  <h2 className="text-lg font-medium text-gray-300 mb-2">
                    No Published Projects
                  </h2>
                  <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                    You haven't published any projects to the showcase yet. Share your work with the
                    community by publishing a project.
                  </p>
                  <Button
                    onClick={() => setActiveTab("publish-new")}
                    className="bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Publish a Project
                  </Button>
                </CardContent>
              </Card>
            ) : (
              !error && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-5 bg-orange-500 rounded-sm" />
                    <h2 className="text-sm font-medium text-gray-200">Published Projects</h2>
                    <span className="text-[10px] text-gray-600">
                      {projects.length} project{projects.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {projects.map((project) => (
                      <Card
                        key={project.id}
                        className="bg-gray-900/80 border-gray-800/60 hover:border-orange-500/20 transition-all"
                      >
                        <CardContent className="pt-4 pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <h3 className="text-sm font-medium text-gray-200">
                                  {project.title}
                                </h3>
                                <Badge
                                  className={`text-[10px] border-0 ${
                                    project.status === "featured"
                                      ? "bg-yellow-500/15 text-yellow-400"
                                      : "bg-emerald-500/15 text-emerald-400"
                                  }`}
                                >
                                  {project.status === "featured" ? "Featured" : "Published"}
                                </Badge>
                                <Badge className="text-[10px] bg-orange-500/10 text-orange-400 border-0">
                                  {getCategoryLabel(project.category)}
                                </Badge>
                              </div>

                              {project.description && (
                                <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                                  {project.description}
                                </p>
                              )}

                              {/* Tech Stack */}
                              {project.tech_stack && project.tech_stack.length > 0 && (
                                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                                  <Code className="h-3 w-3 text-gray-600 shrink-0" />
                                  {project.tech_stack.map((tech, i) => (
                                    <Badge
                                      key={i}
                                      className="text-[10px] bg-gray-800 text-gray-400 border-0 px-1.5 py-0"
                                    >
                                      {tech}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              {/* Stats and Links Row */}
                              <div className="flex items-center gap-3 text-[10px] text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  {project.views}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Heart className="h-3 w-3" />
                                  {project.likes}
                                </span>
                                <span className="text-gray-700">|</span>
                                <span>{formatDate(project.created_at)}</span>

                                {project.live_url && (
                                  <a
                                    href={project.live_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-orange-400 hover:text-orange-300 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    Live
                                  </a>
                                )}
                                {project.github_url && (
                                  <a
                                    href={project.github_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-orange-400 hover:text-orange-300 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Github className="h-3 w-3" />
                                    GitHub
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Unpublish Button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setUnpublishDialog(project)}
                              className="h-7 w-7 text-gray-500 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                              title="Unpublish project"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            )}
          </>
        )}

        {/* Publish New Tab */}
        {activeTab === "publish-new" && (
          <>
            {publishSuccess ? (
              <Card className="bg-gray-900/80 border-gray-800/60">
                <CardContent className="py-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                    <Globe className="h-6 w-6 text-emerald-400" />
                  </div>
                  <h2 className="text-lg font-medium text-gray-200 mb-2">
                    Project Published
                  </h2>
                  <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                    Your project is now live on the showcase. It may take a moment to appear in the
                    public listing.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      onClick={() => {
                        setActiveTab("my-projects")
                        fetchMyProjects()
                      }}
                      className="bg-orange-600 hover:bg-orange-500 text-white"
                    >
                      <Star className="h-4 w-4 mr-2" />
                      View My Projects
                    </Button>
                    <Button
                      onClick={resetForm}
                      variant="ghost"
                      className="text-gray-400 hover:text-orange-400 hover:bg-orange-500/10"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Publish Another
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gray-900/80 border-gray-800/60">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
                    <Upload className="h-4 w-4 text-orange-400" />
                    Publish to Showcase
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Project ID */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 flex items-center gap-1.5">
                      <Tag className="h-3 w-3" />
                      Project ID
                    </label>
                    <Input
                      value={formProjectId}
                      onChange={(e) => setFormProjectId(e.target.value)}
                      readOnly={!!projectId}
                      placeholder="Enter project ID"
                      className={`h-9 bg-gray-800/50 border-gray-700/60 text-gray-200 text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50 ${
                        projectId ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                    />
                  </div>

                  {/* Title */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 flex items-center gap-1.5">
                      <ChevronRight className="h-3 w-3" />
                      Title <span className="text-red-400">*</span>
                    </label>
                    <Input
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Give your project a catchy title"
                      className="h-9 bg-gray-800/50 border-gray-700/60 text-gray-200 text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 flex items-center gap-1.5">
                      <ChevronRight className="h-3 w-3" />
                      Description
                    </label>
                    <Textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Describe what your project does, key features, and why it's interesting..."
                      rows={3}
                      className="bg-gray-800/50 border-gray-700/60 text-gray-200 text-sm placeholder:text-gray-600 resize-none focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50"
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 flex items-center gap-1.5">
                      <Tag className="h-3 w-3" />
                      Category
                    </label>
                    <Select value={formCategory} onValueChange={setFormCategory}>
                      <SelectTrigger className="h-9 bg-gray-800/50 border-gray-700/60 text-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50 w-full">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {CATEGORIES.map((cat) => (
                          <SelectItem
                            key={cat.value}
                            value={cat.value}
                            className="text-gray-200 text-sm focus:bg-orange-600/15 focus:text-orange-400"
                          >
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Thumbnail URL */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 flex items-center gap-1.5">
                      <Image className="h-3 w-3" />
                      Thumbnail URL
                    </label>
                    <Input
                      value={formThumbnailUrl}
                      onChange={(e) => setFormThumbnailUrl(e.target.value)}
                      placeholder="https://example.com/thumbnail.png"
                      className="h-9 bg-gray-800/50 border-gray-700/60 text-gray-200 text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50"
                    />
                  </div>

                  {/* Live URL */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 flex items-center gap-1.5">
                      <Link className="h-3 w-3" />
                      Live URL
                    </label>
                    <Input
                      value={formLiveUrl}
                      onChange={(e) => setFormLiveUrl(e.target.value)}
                      placeholder="https://your-app.vercel.app"
                      className="h-9 bg-gray-800/50 border-gray-700/60 text-gray-200 text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50"
                    />
                  </div>

                  {/* GitHub URL */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 flex items-center gap-1.5">
                      <Github className="h-3 w-3" />
                      GitHub URL
                    </label>
                    <Input
                      value={formGithubUrl}
                      onChange={(e) => setFormGithubUrl(e.target.value)}
                      placeholder="https://github.com/user/repo"
                      className="h-9 bg-gray-800/50 border-gray-700/60 text-gray-200 text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50"
                    />
                  </div>

                  {/* Tech Stack */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 flex items-center gap-1.5">
                      <Code className="h-3 w-3" />
                      Tech Stack
                    </label>
                    <Input
                      value={formTechStack}
                      onChange={(e) => setFormTechStack(e.target.value)}
                      placeholder="React, Next.js, Tailwind CSS, Supabase"
                      className="h-9 bg-gray-800/50 border-gray-700/60 text-gray-200 text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50"
                    />
                    <p className="text-[10px] text-gray-600">Separate technologies with commas</p>
                  </div>

                  {/* Publish Error */}
                  {publishError && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                      <p className="text-xs text-red-400">{publishError}</p>
                    </div>
                  )}

                  {/* Publish Button */}
                  <Button
                    onClick={handlePublish}
                    disabled={publishing || !formProjectId.trim() || !formTitle.trim()}
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {publishing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {publishing ? "Publishing..." : "Publish to Showcase"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Unpublish Confirmation Dialog */}
      <Dialog open={!!unpublishDialog} onOpenChange={(open) => !open && setUnpublishDialog(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-200">Unpublish Project</DialogTitle>
            <DialogDescription className="text-gray-500">
              Are you sure you want to unpublish{" "}
              <span className="text-gray-300 font-medium">{unpublishDialog?.title}</span> from the
              showcase? This will remove it from the public listing. You can always publish it again
              later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setUnpublishDialog(null)}
              disabled={unpublishing}
              className="text-gray-400 hover:text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUnpublish}
              disabled={unpublishing}
              className="bg-red-500 hover:bg-red-600 text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {unpublishing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {unpublishing ? "Unpublishing..." : "Unpublish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
