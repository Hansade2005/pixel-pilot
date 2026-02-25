"use client"

import React, { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Shield,
  Zap,
  Wrench,
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Trash2,
  RefreshCw,
  Code,
  FileCode,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { storageManager } from "@/lib/storage-manager"

interface ReviewIssue {
  severity: "critical" | "high" | "medium" | "low"
  message: string
  file?: string
  line?: number
}

interface ReviewSuggestion {
  message: string
  file?: string
}

interface ReviewAnalysis {
  score: number
  issues: ReviewIssue[]
  suggestions: ReviewSuggestion[]
}

interface Review {
  id: string
  user_id: string
  project_id: string
  review_type: string
  content: string
  score: number
  issues_found: number
  created_at: string
}

const REVIEW_TYPES = [
  { value: "full", label: "Full Review", icon: Search, description: "Comprehensive code review" },
  { value: "security", label: "Security", icon: Shield, description: "Security vulnerabilities" },
  { value: "performance", label: "Performance", icon: Zap, description: "Performance issues" },
  { value: "maintainability", label: "Maintainability", icon: Wrench, description: "Code maintainability" },
]

const SEVERITY_CONFIG: Record<string, { color: string; bg: string }> = {
  critical: { color: "text-red-400", bg: "bg-red-500/10" },
  high: { color: "text-orange-400", bg: "bg-orange-500/10" },
  medium: { color: "text-yellow-400", bg: "bg-yellow-500/10" },
  low: { color: "text-gray-400", bg: "bg-gray-500/10" },
}

function ScoreRing({ score, size = "lg" }: { score: number; size?: "sm" | "lg" }) {
  const radius = size === "lg" ? 54 : 28
  const strokeWidth = size === "lg" ? 6 : 4
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const viewBox = size === "lg" ? 120 : 64
  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F"

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={viewBox} height={viewBox} viewBox={`0 0 ${viewBox} ${viewBox}`}>
        <circle
          cx={viewBox / 2}
          cy={viewBox / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-800"
        />
        <circle
          cx={viewBox / 2}
          cy={viewBox / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${viewBox / 2} ${viewBox / 2})`}
          className={score >= 80 ? "text-emerald-500" : score >= 60 ? "text-yellow-500" : "text-red-500"}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`font-bold ${size === "lg" ? "text-2xl" : "text-sm"} ${
            score >= 80 ? "text-emerald-400" : score >= 60 ? "text-yellow-400" : "text-red-400"
          }`}
        >
          {grade}
        </span>
        {size === "lg" && <span className="text-[10px] text-gray-500">{score}/100</span>}
      </div>
    </div>
  )
}

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
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function CodeReviewsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    }>
      <CodeReviewsContent />
    </Suspense>
  )
}

function CodeReviewsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get("projectId")
  const projectName = searchParams.get("name") || "Project"

  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reviewType, setReviewType] = useState("full")
  const [latestAnalysis, setLatestAnalysis] = useState<ReviewAnalysis | null>(null)
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null)
  const [expandedContent, setExpandedContent] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const getSession = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session
  }, [])

  const fetchReviews = useCallback(async () => {
    if (!projectId) return
    try {
      const session = await getSession()
      if (!session) {
        router.push("/login")
        return
      }

      const res = await fetch(`/api/code-reviews?projectId=${projectId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setReviews(json.reviews || [])
      }
    } catch (err) {
      console.error("Failed to fetch reviews:", err)
    } finally {
      setLoading(false)
    }
  }, [projectId, router, getSession])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const runReview = async () => {
    if (!projectId) return
    setRunning(true)
    setError(null)
    setLatestAnalysis(null)
    setSelectedReviewId(null)

    try {
      const session = await getSession()
      if (!session) {
        router.push("/login")
        return
      }

      const allFiles = await storageManager.getFiles(projectId)
      if (!allFiles || allFiles.length === 0) {
        setError("No files found in project")
        setRunning(false)
        return
      }

      const codeFiles = allFiles
        .filter((f: any) => {
          if (!f.name || f.isDirectory) return false
          const ext = f.name.split(".").pop()?.toLowerCase()
          return ["ts", "tsx", "js", "jsx", "css", "html", "json"].includes(ext || "")
        })
        .map((f: any) => ({ path: f.path || f.name, content: f.content || "" }))

      if (codeFiles.length === 0) {
        setError("No code files found to review")
        setRunning(false)
        return
      }

      const res = await fetch("/api/code-reviews", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          reviewType,
          files: codeFiles,
        }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.error || "Review failed")
      }

      const json = await res.json()
      if (json.analysis) {
        setLatestAnalysis(json.analysis)
      }
      if (json.review) {
        setSelectedReviewId(json.review.id)
      }
      fetchReviews()
    } catch (err: any) {
      setError(err.message || "Failed to run code review")
    } finally {
      setRunning(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const session = await getSession()
      if (!session) return

      const res = await fetch(`/api/code-reviews?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== id))
        if (selectedReviewId === id) {
          setSelectedReviewId(null)
          setLatestAnalysis(null)
        }
      }
    } catch (err) {
      console.error("Failed to delete review:", err)
    } finally {
      setDeletingId(null)
    }
  }

  const viewReview = (review: Review) => {
    setSelectedReviewId(review.id)
    setLatestAnalysis({
      score: review.score,
      issues: [],
      suggestions: [],
    })
    setExpandedContent(true)
  }

  const selectedReview = reviews.find((r) => r.id === selectedReviewId)

  if (!projectId) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Card className="bg-gray-900 border-gray-800 max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-10 w-10 text-orange-500 mx-auto mb-3" />
            <p className="text-gray-300">No project selected. Open a project first.</p>
          </CardContent>
        </Card>
      </div>
    )
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
              <FileCode className="h-5 w-5 text-orange-400" />
              <h1 className="text-lg font-semibold text-gray-100">Code Review</h1>
              <Badge className="bg-gray-800 text-gray-400 border-0 text-[10px]">{projectName}</Badge>
            </div>
          </div>
          <Button
            onClick={runReview}
            disabled={running}
            className="bg-orange-600 hover:bg-orange-500 text-white text-xs h-8 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {running ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
            )}
            {running ? "Reviewing..." : "Run Review"}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Review Type Selector */}
        <div>
          <p className="text-xs text-gray-500 mb-2">Review Type</p>
          <div className="flex gap-2 flex-wrap">
            {REVIEW_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setReviewType(type.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                  reviewType === type.value
                    ? "bg-orange-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10"
                }`}
              >
                <type.icon className="h-3.5 w-3.5" />
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="bg-gray-900/80 border-red-500/30">
            <CardContent className="pt-6 pb-5 text-center">
              <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-gray-300">{error}</p>
              <Button
                onClick={() => setError(null)}
                variant="ghost"
                size="sm"
                className="mt-3 text-gray-400 hover:text-orange-400 text-xs"
              >
                Dismiss
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {running && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500 mb-3" />
            <p className="text-sm text-gray-400">
              Running {REVIEW_TYPES.find((t) => t.value === reviewType)?.label || "code review"}...
            </p>
            <p className="text-xs text-gray-600 mt-1">This may take a moment depending on project size</p>
          </div>
        )}

        {/* Latest Review Results */}
        {!running && latestAnalysis && selectedReview && (
          <>
            {/* Score Card */}
            <Card className="bg-gray-900/80 border-gray-800/60">
              <CardContent className="pt-6 pb-5">
                <div className="flex items-center gap-6">
                  <ScoreRing score={latestAnalysis.score} size="lg" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-100 mb-1">
                      Review Score: {latestAnalysis.score}/100
                    </h2>
                    <p className="text-sm text-gray-400">
                      {REVIEW_TYPES.find((t) => t.value === selectedReview.review_type)?.label || selectedReview.review_type}{" "}
                      review completed
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {latestAnalysis.score >= 80
                        ? "Your code looks great! Minor improvements suggested."
                        : latestAnalysis.score >= 60
                        ? "Good foundation, but there are areas to improve."
                        : "Several issues found that should be addressed."}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      {latestAnalysis.issues.length > 0 && (
                        <Badge className="text-[10px] bg-red-500/10 text-red-400 border-0">
                          {latestAnalysis.issues.length} issue{latestAnalysis.issues.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      {latestAnalysis.suggestions.length > 0 && (
                        <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-0">
                          {latestAnalysis.suggestions.length} suggestion{latestAnalysis.suggestions.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Issues List */}
            {latestAnalysis.issues.length > 0 && (
              <Card className="bg-gray-900/80 border-gray-800/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-400" />
                    Issues Found ({latestAnalysis.issues.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {latestAnalysis.issues.map((issue, i) => {
                    const config = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.low
                    return (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <Badge className={`text-[10px] px-1.5 py-0 border-0 shrink-0 ${config.color} ${config.bg}`}>
                          {issue.severity}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <span className="text-gray-300">{issue.message}</span>
                          {issue.file && (
                            <span className="text-gray-600 ml-1 font-mono text-[10px]">
                              ({issue.file}
                              {issue.line ? `:${issue.line}` : ""})
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            {/* Suggestions List */}
            {latestAnalysis.suggestions.length > 0 && (
              <Card className="bg-gray-900/80 border-gray-800/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    Suggestions ({latestAnalysis.suggestions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {latestAnalysis.suggestions.map((suggestion, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-300">{suggestion.message}</span>
                        {suggestion.file && (
                          <span className="text-gray-600 ml-1 font-mono text-[10px]">({suggestion.file})</span>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Review Content (Markdown) */}
            {selectedReview.content && (
              <Card className="bg-gray-900/80 border-gray-800/60">
                <CardHeader className="pb-3">
                  <button
                    onClick={() => setExpandedContent(!expandedContent)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-200 hover:text-orange-400 transition-colors w-full text-left"
                  >
                    {expandedContent ? (
                      <ChevronDown className="h-4 w-4 text-orange-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                    <Code className="h-4 w-4 text-orange-400" />
                    Full Review Details
                  </button>
                </CardHeader>
                {expandedContent && (
                  <CardContent>
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono bg-gray-800/50 rounded-lg p-4 max-h-[500px] overflow-y-auto leading-relaxed">
                      {selectedReview.content}
                    </pre>
                  </CardContent>
                )}
              </Card>
            )}
          </>
        )}

        {/* Empty State (no reviews, not running, no latest result) */}
        {!running && !latestAnalysis && !loading && reviews.length === 0 && !error && (
          <Card className="bg-gray-900/80 border-gray-800/60">
            <CardContent className="py-12 text-center">
              <FileCode className="h-12 w-12 text-gray-700 mx-auto mb-4" />
              <h2 className="text-lg font-medium text-gray-300 mb-2">No Code Reviews Yet</h2>
              <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                Run an AI-powered code review to get insights on code quality, security vulnerabilities, performance issues, and maintainability.
              </p>
              <Button
                onClick={runReview}
                className="bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-500/20"
              >
                <Search className="h-4 w-4 mr-2" />
                Run First Review
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Review History */}
        {!loading && reviews.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-orange-500 rounded-sm" />
              <h2 className="text-sm font-medium text-gray-200">Review History</h2>
              <span className="text-[10px] text-gray-600">
                {reviews.length} review{reviews.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-2">
              {reviews.map((review) => {
                const isSelected = selectedReviewId === review.id
                return (
                  <Card
                    key={review.id}
                    className={`bg-gray-900/80 border-gray-800/60 cursor-pointer transition-all ${
                      isSelected ? "border-orange-500/40" : "hover:border-orange-500/20"
                    }`}
                    onClick={() => viewReview(review)}
                  >
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <ScoreRing score={review.score} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-medium text-gray-200">
                                {REVIEW_TYPES.find((t) => t.value === review.review_type)?.label || review.review_type}
                              </span>
                              <Badge className="text-[10px] bg-orange-500/10 text-orange-400 border-0">
                                {review.score}/100
                              </Badge>
                              {review.issues_found > 0 && (
                                <Badge className="text-[10px] bg-red-500/10 text-red-400 border-0">
                                  {review.issues_found} issue{review.issues_found !== 1 ? "s" : ""}
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-600">{formatDate(review.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(review.id)
                            }}
                            disabled={deletingId === review.id}
                            className="h-7 w-7 text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                            title="Delete review"
                          >
                            {deletingId === review.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Loading reviews */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          </div>
        )}
      </div>
    </div>
  )
}
