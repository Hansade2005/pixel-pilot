"use client"

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import ReactMarkdown from "react-markdown"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
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
  Eye,
  Sparkles,
  Palette,
  FileWarning,
  BarChart3,
  TrendingUp,
  Info,
  Brain,
  StopCircle,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { storageManager } from "@/lib/storage-manager"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReviewIssue {
  severity: "critical" | "high" | "medium" | "low" | "info"
  category: string
  message: string
  file?: string
  line?: number
  rule: string
}

interface CategorySummary {
  score: number
  grade: string
  issueCount: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  infoCount: number
}

interface FileMetric {
  path: string
  lines: number
  complexity: number
  issueCount: number
  topIssues: string[]
}

interface ReviewSuggestion {
  category: string
  message: string
  priority: "high" | "medium" | "low"
}

interface ReviewAnalysis {
  score: number
  grade: string
  issues: ReviewIssue[]
  suggestions: ReviewSuggestion[]
  categories: Record<string, CategorySummary>
  fileMetrics: FileMetric[]
  stats: {
    totalFiles: number
    totalLines: number
    totalFunctions: number
    avgComplexity: number
    rulesChecked: number
  }
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

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const REVIEW_TYPES = [
  { value: "full", label: "Full Review", icon: Search, description: "All categories" },
  { value: "security", label: "Security", icon: Shield, description: "Vulnerabilities & risks" },
  { value: "performance", label: "Performance", icon: Zap, description: "Speed & efficiency" },
  { value: "maintainability", label: "Maintainability", icon: Wrench, description: "Code structure" },
  { value: "accessibility", label: "Accessibility", icon: Eye, description: "A11y compliance" },
  { value: "best-practices", label: "Best Practices", icon: Sparkles, description: "React & Next.js patterns" },
  { value: "code-style", label: "Code Style", icon: Palette, description: "Consistency & conventions" },
]

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: "text-red-400", bg: "bg-red-500/10", label: "Critical" },
  high: { color: "text-orange-400", bg: "bg-orange-500/10", label: "High" },
  medium: { color: "text-yellow-400", bg: "bg-yellow-500/10", label: "Medium" },
  low: { color: "text-gray-400", bg: "bg-gray-500/10", label: "Low" },
  info: { color: "text-blue-400", bg: "bg-blue-500/10", label: "Info" },
}

const CATEGORY_ICONS: Record<string, any> = {
  Security: Shield,
  Performance: Zap,
  Maintainability: Wrench,
  Accessibility: Eye,
  "Best Practices": Sparkles,
  "Code Style": Palette,
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

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

function SeverityBar({ counts }: { counts: { critical: number; high: number; medium: number; low: number; info: number } }) {
  const total = counts.critical + counts.high + counts.medium + counts.low + counts.info
  if (total === 0) return null

  const segments = [
    { key: "critical", count: counts.critical, color: "bg-red-500" },
    { key: "high", count: counts.high, color: "bg-orange-500" },
    { key: "medium", count: counts.medium, color: "bg-yellow-500" },
    { key: "low", count: counts.low, color: "bg-gray-500" },
    { key: "info", count: counts.info, color: "bg-blue-500" },
  ].filter(s => s.count > 0)

  return (
    <div className="space-y-2">
      <div className="flex h-2 rounded-full overflow-hidden bg-gray-800">
        {segments.map(s => (
          <div
            key={s.key}
            className={`${s.color} transition-all`}
            style={{ width: `${(s.count / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex gap-3 flex-wrap">
        {segments.map(s => {
          const config = SEVERITY_CONFIG[s.key]
          return (
            <div key={s.key} className="flex items-center gap-1 text-[10px]">
              <div className={`w-2 h-2 rounded-full ${s.color}`} />
              <span className="text-gray-500">{config.label}: {s.count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
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

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CodeReviewsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        </div>
      }
    >
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
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"overview" | "issues" | "files" | "suggestions" | "ai-insights">("overview")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // AI Insights state
  const [aiInsights, setAiInsights] = useState("")
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false)
  const [aiInsightsError, setAiInsightsError] = useState<string | null>(null)
  const aiAbortRef = useRef<AbortController | null>(null)
  const cachedFilesRef = useRef<Array<{ path: string; content: string }>>([])
  const aiScrollRef = useRef<HTMLDivElement | null>(null)

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
    setActiveTab("overview")
    setAiInsights("")
    setAiInsightsError(null)
    if (aiAbortRef.current) aiAbortRef.current.abort()

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

      // Cache files for AI insights
      cachedFilesRef.current = codeFiles

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
      grade: review.score >= 90 ? "A" : review.score >= 80 ? "B" : review.score >= 70 ? "C" : review.score >= 60 ? "D" : "F",
      issues: [],
      suggestions: [],
      categories: {},
      fileMetrics: [],
      stats: { totalFiles: 0, totalLines: 0, totalFunctions: 0, avgComplexity: 0, rulesChecked: 0 },
    })
    setExpandedContent(true)
    setActiveTab("overview")
  }

  // AI Insights streaming function
  const runAiInsights = useCallback(async (analysis: ReviewAnalysis) => {
    if (cachedFilesRef.current.length === 0) return
    setAiInsights("")
    setAiInsightsLoading(true)
    setAiInsightsError(null)

    // Abort previous request if any
    if (aiAbortRef.current) aiAbortRef.current.abort()
    const controller = new AbortController()
    aiAbortRef.current = controller

    try {
      const session = await getSession()
      if (!session) return

      const res = await fetch("/api/code-reviews/ai-insights", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: cachedFilesRef.current,
          staticAnalysis: analysis,
          reviewType,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || "AI analysis failed")
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response stream")

      const decoder = new TextDecoder()
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk
        setAiInsights(accumulated)

        // Auto-scroll to bottom
        if (aiScrollRef.current) {
          aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") return
      setAiInsightsError(err.message || "AI analysis failed")
    } finally {
      setAiInsightsLoading(false)
      aiAbortRef.current = null
    }
  }, [getSession, reviewType])

  const stopAiInsights = useCallback(() => {
    if (aiAbortRef.current) {
      aiAbortRef.current.abort()
      aiAbortRef.current = null
    }
    setAiInsightsLoading(false)
  }, [])

  const selectedReview = reviews.find((r) => r.id === selectedReviewId)

  // Compute severity counts from analysis
  const severityCounts = latestAnalysis
    ? {
        critical: latestAnalysis.issues.filter((i) => i.severity === "critical").length,
        high: latestAnalysis.issues.filter((i) => i.severity === "high").length,
        medium: latestAnalysis.issues.filter((i) => i.severity === "medium").length,
        low: latestAnalysis.issues.filter((i) => i.severity === "low").length,
        info: latestAnalysis.issues.filter((i) => i.severity === "info").length,
      }
    : { critical: 0, high: 0, medium: 0, low: 0, info: 0 }

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
    <div className="min-h-screen bg-gray-950 pt-16">
      <Navigation />
      {/* Header */}
      <div className="border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-sm sticky top-16 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
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
            <p className="text-xs text-gray-600 mt-1">Checking {reviewType === "full" ? "64+" : "10+"} rules across your codebase</p>
          </div>
        )}

        {/* Latest Review Results */}
        {!running && latestAnalysis && (
          <>
            {/* Score Card + Stats */}
            <Card className="bg-gray-900/80 border-gray-800/60">
              <CardContent className="pt-6 pb-5">
                <div className="flex items-center gap-6">
                  <ScoreRing score={latestAnalysis.score} size="lg" />
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-100 mb-1">
                      Review Score: {latestAnalysis.score}/100
                    </h2>
                    <p className="text-sm text-gray-400">
                      {selectedReview
                        ? `${REVIEW_TYPES.find((t) => t.value === selectedReview.review_type)?.label || selectedReview.review_type} review completed`
                        : "Review completed"}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {latestAnalysis.score >= 80
                        ? "Your code looks great! Minor improvements suggested."
                        : latestAnalysis.score >= 60
                        ? "Good foundation, but there are areas to improve."
                        : "Several issues found that should be addressed."}
                    </p>

                    {/* Stats Row */}
                    {latestAnalysis.stats.totalFiles > 0 && (
                      <div className="flex items-center gap-4 mt-3 flex-wrap">
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                          <FileCode className="h-3 w-3" />
                          {latestAnalysis.stats.totalFiles} files
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                          <Code className="h-3 w-3" />
                          {latestAnalysis.stats.totalLines.toLocaleString()} lines
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                          <BarChart3 className="h-3 w-3" />
                          {latestAnalysis.stats.rulesChecked} rules checked
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                          <TrendingUp className="h-3 w-3" />
                          Avg complexity: {latestAnalysis.stats.avgComplexity}
                        </div>
                      </div>
                    )}

                    {/* Severity Distribution */}
                    {latestAnalysis.issues.length > 0 && (
                      <div className="mt-3">
                        <SeverityBar counts={severityCounts} />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tab Navigation */}
            {(latestAnalysis.issues.length > 0 || latestAnalysis.stats.totalFiles > 0) && (
              <div className="flex gap-1 bg-gray-900/50 rounded-lg p-1">
                {(
                  [
                    { key: "overview" as const, label: "Categories", icon: BarChart3 },
                    { key: "issues" as const, label: `Issues (${latestAnalysis.issues.length})`, icon: AlertTriangle },
                    { key: "files" as const, label: "File Hotspots", icon: FileWarning },
                    { key: "suggestions" as const, label: "Recommendations", icon: Sparkles },
                    { key: "ai-insights" as const, label: "AI Insights", icon: Brain },
                  ]
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all flex-1 justify-center ${
                      activeTab === tab.key
                        ? "bg-orange-600/15 text-orange-400"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    <tab.icon className="h-3 w-3" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Tab: Categories */}
            {activeTab === "overview" && Object.keys(latestAnalysis.categories).length > 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(latestAnalysis.categories).map(([catName, summary]) => {
                    const IconComp = CATEGORY_ICONS[catName] || Code
                    const isExpanded = expandedCategory === catName
                    return (
                      <Card
                        key={catName}
                        className={`bg-gray-900/80 border-gray-800/60 cursor-pointer transition-all ${
                          isExpanded ? "border-orange-500/40 col-span-2 sm:col-span-3" : "hover:border-orange-500/20"
                        }`}
                        onClick={() => setExpandedCategory(isExpanded ? null : catName)}
                      >
                        <CardContent className="pt-4 pb-3">
                          <div className="flex items-center gap-3">
                            <ScoreRing score={summary.score} size="sm" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <IconComp className="h-3.5 w-3.5 text-orange-400" />
                                <span className="text-xs font-medium text-gray-200">{catName}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] text-gray-500">{summary.issueCount} issues</span>
                                {summary.criticalCount > 0 && (
                                  <Badge className="text-[9px] px-1 py-0 bg-red-500/10 text-red-400 border-0">
                                    {summary.criticalCount} critical
                                  </Badge>
                                )}
                                {summary.highCount > 0 && (
                                  <Badge className="text-[9px] px-1 py-0 bg-orange-500/10 text-orange-400 border-0">
                                    {summary.highCount} high
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-orange-400 shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-600 shrink-0" />
                            )}
                          </div>

                          {/* Expanded: issues for this category */}
                          {isExpanded && (
                            <div className="mt-4 space-y-2 border-t border-gray-800/60 pt-3">
                              {latestAnalysis.issues
                                .filter((i) => i.category === catName)
                                .map((issue, idx) => {
                                  const cfg = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.low
                                  return (
                                    <div key={idx} className="flex items-start gap-2 text-xs">
                                      <Badge className={`text-[10px] px-1.5 py-0 border-0 shrink-0 ${cfg.color} ${cfg.bg}`}>
                                        {cfg.label}
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
                              {latestAnalysis.issues.filter((i) => i.category === catName).length === 0 && (
                                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                                  No issues found in this category
                                </p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Tab: All Issues */}
            {activeTab === "issues" && latestAnalysis.issues.length > 0 && (
              <Card className="bg-gray-900/80 border-gray-800/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-400" />
                    All Issues ({latestAnalysis.issues.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                  {latestAnalysis.issues.map((issue, i) => {
                    const config = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.low
                    const IconComp = CATEGORY_ICONS[issue.category] || Code
                    return (
                      <div key={i} className="flex items-start gap-2 text-xs py-1.5 border-b border-gray-800/40 last:border-0">
                        <Badge className={`text-[10px] px-1.5 py-0 border-0 shrink-0 ${config.color} ${config.bg}`}>
                          {config.label}
                        </Badge>
                        <IconComp className="h-3 w-3 text-gray-600 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-gray-300">{issue.message}</span>
                          {issue.file && (
                            <span className="text-gray-600 ml-1 font-mono text-[10px]">
                              ({issue.file}
                              {issue.line ? `:${issue.line}` : ""})
                            </span>
                          )}
                          <span className="text-gray-700 ml-1 text-[10px]">[{issue.rule}]</span>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            {/* Tab: File Hotspots */}
            {activeTab === "files" && latestAnalysis.fileMetrics.length > 0 && (
              <Card className="bg-gray-900/80 border-gray-800/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
                    <FileWarning className="h-4 w-4 text-orange-400" />
                    File Hotspots
                    <span className="text-[10px] text-gray-600 font-normal">Files with most issues</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {latestAnalysis.fileMetrics
                      .filter((f) => f.issueCount > 0)
                      .map((fm, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 text-xs py-2 px-2 rounded-lg hover:bg-gray-800/50 transition-colors"
                        >
                          <div className="w-6 h-6 rounded-md bg-gray-800 flex items-center justify-center shrink-0">
                            <span
                              className={`text-[10px] font-bold ${
                                fm.issueCount > 5 ? "text-red-400" : fm.issueCount > 2 ? "text-yellow-400" : "text-gray-400"
                              }`}
                            >
                              {fm.issueCount}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-200 font-mono text-[11px] truncate">{fm.path}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-gray-600 text-[10px]">{fm.lines} lines</span>
                              <span className="text-gray-600 text-[10px]">complexity: {fm.complexity}</span>
                            </div>
                          </div>
                          {fm.topIssues.length > 0 && (
                            <div className="hidden sm:block max-w-[200px]">
                              <p className="text-[10px] text-gray-500 truncate">{fm.topIssues[0]}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    {latestAnalysis.fileMetrics.filter((f) => f.issueCount > 0).length === 0 && (
                      <p className="text-xs text-gray-500 text-center py-4">No file hotspots detected</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tab: Suggestions / Recommendations */}
            {activeTab === "suggestions" && latestAnalysis.suggestions.length > 0 && (
              <Card className="bg-gray-900/80 border-gray-800/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-orange-400" />
                    Recommendations ({latestAnalysis.suggestions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {latestAnalysis.suggestions.map((suggestion, i) => {
                    const IconComp = CATEGORY_ICONS[suggestion.category] || Info
                    const priorityColors = {
                      high: "border-l-red-500 bg-red-500/5",
                      medium: "border-l-yellow-500 bg-yellow-500/5",
                      low: "border-l-gray-500 bg-gray-500/5",
                    }
                    return (
                      <div
                        key={i}
                        className={`flex items-start gap-3 text-xs p-3 rounded-lg border-l-2 ${
                          priorityColors[suggestion.priority]
                        }`}
                      >
                        <IconComp className="h-3.5 w-3.5 text-orange-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] text-gray-500">{suggestion.category}</span>
                            <Badge
                              className={`text-[9px] px-1 py-0 border-0 ${
                                suggestion.priority === "high"
                                  ? "bg-red-500/10 text-red-400"
                                  : suggestion.priority === "medium"
                                  ? "bg-yellow-500/10 text-yellow-400"
                                  : "bg-gray-500/10 text-gray-400"
                              }`}
                            >
                              {suggestion.priority}
                            </Badge>
                          </div>
                          <span className="text-gray-300">{suggestion.message}</span>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            {/* Tab: AI Insights */}
            {activeTab === "ai-insights" && (
              <Card className="bg-gray-900/80 border-gray-800/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
                      <Brain className="h-4 w-4 text-orange-400" />
                      AI-Powered Deep Analysis
                      <Badge className="text-[9px] bg-orange-500/10 text-orange-400 border-0">
                        Devstral
                      </Badge>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {aiInsightsLoading && (
                        <Button
                          onClick={stopAiInsights}
                          size="sm"
                          className="h-7 bg-red-500 hover:bg-red-600 text-white text-[10px] px-2"
                        >
                          <StopCircle className="h-3 w-3 mr-1" />
                          Stop
                        </Button>
                      )}
                      {!aiInsightsLoading && (
                        <Button
                          onClick={() => latestAnalysis && runAiInsights(latestAnalysis)}
                          disabled={cachedFilesRef.current.length === 0}
                          size="sm"
                          className="h-7 bg-orange-600 hover:bg-orange-500 text-white text-[10px] px-2 disabled:opacity-30"
                        >
                          <Brain className="h-3 w-3 mr-1" />
                          {aiInsights ? "Re-analyze" : "Run AI Analysis"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Not started yet */}
                  {!aiInsights && !aiInsightsLoading && !aiInsightsError && (
                    <div className="text-center py-8">
                      <Brain className="h-10 w-10 text-gray-700 mx-auto mb-3" />
                      <p className="text-sm text-gray-400 mb-1">Get AI-Powered Code Review Insights</p>
                      <p className="text-xs text-gray-600 mb-4 max-w-md mx-auto">
                        Devstral AI will analyze your code beyond static rules - finding architectural issues,
                        suggesting design patterns, and providing specific code improvements with before/after examples.
                      </p>
                      <Button
                        onClick={() => latestAnalysis && runAiInsights(latestAnalysis)}
                        disabled={cachedFilesRef.current.length === 0}
                        className="bg-orange-600 hover:bg-orange-500 text-white text-xs disabled:opacity-30"
                      >
                        <Brain className="h-3.5 w-3.5 mr-1.5" />
                        Generate AI Insights
                      </Button>
                    </div>
                  )}

                  {/* Error state */}
                  {aiInsightsError && (
                    <div className="text-center py-6">
                      <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-300 mb-3">{aiInsightsError}</p>
                      <Button
                        onClick={() => latestAnalysis && runAiInsights(latestAnalysis)}
                        size="sm"
                        className="bg-orange-600 hover:bg-orange-500 text-white text-xs"
                      >
                        Retry
                      </Button>
                    </div>
                  )}

                  {/* Loading state */}
                  {aiInsightsLoading && !aiInsights && (
                    <div className="flex flex-col items-center justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-orange-500 mb-3" />
                      <p className="text-xs text-gray-400">AI is analyzing your codebase...</p>
                      <p className="text-[10px] text-gray-600 mt-1">This may take 10-30 seconds</p>
                    </div>
                  )}

                  {/* Streaming / completed content */}
                  {aiInsights && (
                    <div
                      ref={aiScrollRef}
                      className="max-h-[700px] overflow-y-auto rounded-lg bg-gray-800/30 p-4"
                    >
                      <div className="prose prose-invert prose-sm max-w-none
                        prose-headings:text-gray-100 prose-headings:font-semibold prose-headings:border-b prose-headings:border-gray-800/60 prose-headings:pb-2 prose-headings:mb-3
                        prose-h2:text-base prose-h2:mt-6
                        prose-h3:text-sm prose-h3:mt-4
                        prose-p:text-gray-300 prose-p:text-xs prose-p:leading-relaxed
                        prose-li:text-gray-300 prose-li:text-xs
                        prose-strong:text-orange-400
                        prose-code:text-orange-300 prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[11px]
                        prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700/60 prose-pre:rounded-lg prose-pre:text-[11px]
                        prose-a:text-orange-400 prose-a:no-underline hover:prose-a:underline
                      ">
                        <ReactMarkdown>{aiInsights}</ReactMarkdown>
                      </div>
                      {aiInsightsLoading && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-800/60">
                          <Loader2 className="h-3 w-3 animate-spin text-orange-500" />
                          <span className="text-[10px] text-gray-500">AI is writing...</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Review Content (Markdown) */}
            {selectedReview?.content && (
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
                    Full Review Report
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

        {/* Empty State */}
        {!running && !latestAnalysis && !loading && reviews.length === 0 && !error && (
          <Card className="bg-gray-900/80 border-gray-800/60">
            <CardContent className="py-12 text-center">
              <FileCode className="h-12 w-12 text-gray-700 mx-auto mb-4" />
              <h2 className="text-lg font-medium text-gray-300 mb-2">No Code Reviews Yet</h2>
              <p className="text-sm text-gray-500 mb-2 max-w-md mx-auto">
                Run a professional code review: 64+ static rules across 6 categories, plus AI-powered deep analysis by Devstral with actionable code improvements.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {["Security", "Performance", "Accessibility", "Maintainability", "Best Practices", "Code Style"].map((cat) => (
                  <Badge key={cat} className="text-[10px] bg-orange-500/10 text-orange-400 border-0">
                    {cat}
                  </Badge>
                ))}
              </div>
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

      <Footer />
    </div>
  )
}
