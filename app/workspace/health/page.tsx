"use client"

import React, { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Activity,
  Shield,
  Zap,
  Eye,
  Wrench,
  Code,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  FileWarning,
  Search,
  AlertCircle,
  Sparkles,
  Globe,
  ShieldAlert,
  BarChart3,
  TrendingUp,
  FileCode,
} from "lucide-react"
import { storageManager } from "@/lib/storage-manager"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HealthIssue {
  severity: "low" | "medium" | "high" | "critical"
  message: string
  file?: string
  line?: number
  rule: string
}

interface HealthDimension {
  score: number
  grade: string
  issues: HealthIssue[]
  suggestions: string[]
}

interface FileHotspot {
  path: string
  lines: number
  issueCount: number
  worstSeverity: string
  dimensions: string[]
}

interface Recommendation {
  priority: "critical" | "high" | "medium" | "low"
  dimension: string
  message: string
}

interface HealthData {
  overall: {
    score: number
    grade: string
    totalFiles: number
    codeFiles: number
    totalLines: number
    totalIssues: number
    dimensionCount: number
  }
  dimensions: {
    codeQuality: HealthDimension
    security: HealthDimension
    performance: HealthDimension
    accessibility: HealthDimension
    maintainability: HealthDimension
    seo: HealthDimension
    errorHandling: HealthDimension
    bestPractices: HealthDimension
  }
  fileHotspots: FileHotspot[]
  recommendations: Recommendation[]
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DIMENSION_CONFIG: Record<
  string,
  { label: string; icon: any; description: string }
> = {
  codeQuality: { label: "Code Quality", icon: Code, description: "Structure, readability, type safety" },
  security: { label: "Security", icon: Shield, description: "Vulnerabilities, secrets, injection risks" },
  performance: { label: "Performance", icon: Zap, description: "Speed, bundle size, rendering" },
  accessibility: { label: "Accessibility", icon: Eye, description: "ARIA, keyboard, screen readers" },
  maintainability: { label: "Maintainability", icon: Wrench, description: "Organization, docs, complexity" },
  seo: { label: "SEO", icon: Globe, description: "Metadata, sitemap, semantic HTML" },
  errorHandling: { label: "Error Handling", icon: ShieldAlert, description: "Try/catch, boundaries, states" },
  bestPractices: { label: "Best Practices", icon: Sparkles, description: "React patterns, conventions" },
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-400 bg-red-500/10",
  high: "text-orange-400 bg-orange-500/10",
  medium: "text-yellow-400 bg-yellow-500/10",
  low: "text-gray-400 bg-gray-500/10",
}

const GRADE_COLORS: Record<string, string> = {
  A: "text-emerald-400",
  B: "text-blue-400",
  C: "text-yellow-400",
  D: "text-orange-400",
  F: "text-red-400",
}

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  critical: { color: "text-red-400", bg: "bg-red-500/5", border: "border-l-red-500" },
  high: { color: "text-orange-400", bg: "bg-orange-500/5", border: "border-l-orange-500" },
  medium: { color: "text-yellow-400", bg: "bg-yellow-500/5", border: "border-l-yellow-500" },
  low: { color: "text-gray-400", bg: "bg-gray-500/5", border: "border-l-gray-500" },
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function ScoreRing({
  score,
  grade,
  size = "lg",
}: {
  score: number
  grade: string
  size?: "sm" | "lg"
}) {
  const radius = size === "lg" ? 54 : 28
  const strokeWidth = size === "lg" ? 6 : 4
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const viewBox = size === "lg" ? 120 : 64

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
          className={`font-bold ${size === "lg" ? "text-2xl" : "text-sm"} ${GRADE_COLORS[grade] || "text-gray-300"}`}
        >
          {grade}
        </span>
        {size === "lg" && <span className="text-[10px] text-gray-500">{score}/100</span>}
      </div>
    </div>
  )
}

function DimensionBar({ dimensions }: { dimensions: Record<string, HealthDimension> }) {
  const entries = Object.entries(dimensions)
  return (
    <div className="space-y-2">
      {entries.map(([key, dim]) => {
        const config = DIMENSION_CONFIG[key]
        if (!config) return null
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="text-[10px] text-gray-500 w-24 shrink-0 truncate">{config.label}</span>
            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  dim.score >= 80 ? "bg-emerald-500" : dim.score >= 60 ? "bg-yellow-500" : "bg-red-500"
                }`}
                style={{ width: `${dim.score}%` }}
              />
            </div>
            <span
              className={`text-[10px] font-medium w-8 text-right ${
                dim.score >= 80 ? "text-emerald-400" : dim.score >= 60 ? "text-yellow-400" : "text-red-400"
              }`}
            >
              {dim.score}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function SeveritySummary({ issues }: { issues: HealthIssue[] }) {
  const counts = {
    critical: issues.filter((i) => i.severity === "critical").length,
    high: issues.filter((i) => i.severity === "high").length,
    medium: issues.filter((i) => i.severity === "medium").length,
    low: issues.filter((i) => i.severity === "low").length,
  }
  const total = counts.critical + counts.high + counts.medium + counts.low
  if (total === 0) return null

  const segments = [
    { key: "critical", count: counts.critical, color: "bg-red-500", label: "Critical" },
    { key: "high", count: counts.high, color: "bg-orange-500", label: "High" },
    { key: "medium", count: counts.medium, color: "bg-yellow-500", label: "Medium" },
    { key: "low", count: counts.low, color: "bg-gray-500", label: "Low" },
  ].filter((s) => s.count > 0)

  return (
    <div className="space-y-2">
      <div className="flex h-2 rounded-full overflow-hidden bg-gray-800">
        {segments.map((s) => (
          <div
            key={s.key}
            className={`${s.color} transition-all`}
            style={{ width: `${(s.count / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex gap-3 flex-wrap">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1 text-[10px]">
            <div className={`w-2 h-2 rounded-full ${s.color}`} />
            <span className="text-gray-500">
              {s.label}: {s.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function HealthScorePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        </div>
      }
    >
      <HealthScoreContent />
    </Suspense>
  )
}

function HealthScoreContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get("projectId")
  const projectName = searchParams.get("name") || "Project"

  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"dimensions" | "hotspots" | "recommendations">("dimensions")

  const runAnalysis = async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)

    try {
      const workspaces = await storageManager.getWorkspaces()
      const workspace = workspaces.find((w: any) => w.id === projectId)
      if (!workspace) {
        setError("Project not found")
        setLoading(false)
        return
      }

      const allFiles = await storageManager.getFiles(projectId)
      if (!allFiles || allFiles.length === 0) {
        setError("No files found in project")
        setLoading(false)
        return
      }

      const codeFiles = allFiles
        .filter((f: any) => {
          if (!f.name || f.isDirectory) return false
          const ext = f.name.split(".").pop()?.toLowerCase()
          return ["ts", "tsx", "js", "jsx", "css", "html", "json", "md", "xml"].includes(ext || "")
        })
        .map((f: any) => ({
          path: f.path || f.name,
          content: f.content || "",
        }))

      if (codeFiles.length === 0) {
        setError("No code files found to analyze")
        setLoading(false)
        return
      }

      const res = await fetch("/api/health-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: codeFiles }),
      })

      if (!res.ok) throw new Error("Analysis failed")
      const json = await res.json()
      setData(json)
      setActiveTab("dimensions")
    } catch (err: any) {
      setError(err.message || "Failed to analyze project")
    } finally {
      setLoading(false)
    }
  }

  // Collect all issues from all dimensions for severity summary
  const allIssues: HealthIssue[] = data
    ? Object.values(data.dimensions).flatMap((d) => d.issues)
    : []

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
              <Activity className="h-5 w-5 text-orange-400" />
              <h1 className="text-lg font-semibold text-gray-100">Health Score</h1>
              <Badge className="bg-gray-800 text-gray-400 border-0 text-[10px]">{projectName}</Badge>
            </div>
          </div>
          <Button
            onClick={runAnalysis}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-500 text-white text-xs h-8"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
            )}
            {data ? "Re-analyze" : "Analyze Project"}
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Empty State */}
        {!data && !loading && !error && (
          <Card className="bg-gray-900/80 border-gray-800/60">
            <CardContent className="py-12 text-center">
              <Activity className="h-12 w-12 text-gray-700 mx-auto mb-4" />
              <h2 className="text-lg font-medium text-gray-300 mb-2">Analyze Your Project</h2>
              <p className="text-sm text-gray-500 mb-2 max-w-md mx-auto">
                Run a comprehensive health check across 8 professional dimensions with weighted scoring.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {Object.values(DIMENSION_CONFIG).map((dim) => (
                  <Badge key={dim.label} className="text-[10px] bg-orange-500/10 text-orange-400 border-0">
                    {dim.label}
                  </Badge>
                ))}
              </div>
              <Button
                onClick={runAnalysis}
                className="bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-500/20"
              >
                <Activity className="h-4 w-4 mr-2" />
                Run Health Analysis
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500 mb-3" />
            <p className="text-sm text-gray-400">Analyzing your codebase across 8 dimensions...</p>
            <p className="text-xs text-gray-600 mt-1">Security, Performance, Accessibility, SEO, and more</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <Card className="bg-gray-900/80 border-red-500/30">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-gray-300">{error}</p>
            </CardContent>
          </Card>
        )}

        {data && !loading && (
          <>
            {/* Overall Score Card */}
            <Card className="bg-gray-900/80 border-gray-800/60">
              <CardContent className="pt-6 pb-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <ScoreRing score={data.overall.score} grade={data.overall.grade} size="lg" />
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-100 mb-1">
                      Overall Health: {data.overall.score}/100
                    </h2>
                    <p className="text-sm text-gray-400">
                      {data.overall.score >= 80
                        ? "Your project is in great shape!"
                        : data.overall.score >= 60
                        ? "Good foundation, but there are areas to improve."
                        : "Several issues found that should be addressed."}
                    </p>

                    {/* Stats Row */}
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                        <FileCode className="h-3 w-3" />
                        {data.overall.totalFiles} files ({data.overall.codeFiles} code)
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                        <Code className="h-3 w-3" />
                        {data.overall.totalLines.toLocaleString()} lines
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                        <AlertCircle className="h-3 w-3" />
                        {data.overall.totalIssues} issues
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                        <BarChart3 className="h-3 w-3" />
                        {data.overall.dimensionCount} dimensions
                      </div>
                    </div>

                    {/* Severity Bar */}
                    {allIssues.length > 0 && (
                      <div className="mt-3">
                        <SeveritySummary issues={allIssues} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Dimension Overview Bars */}
                <div className="mt-6 pt-4 border-t border-gray-800/60">
                  <DimensionBar dimensions={data.dimensions} />
                </div>
              </CardContent>
            </Card>

            {/* Tab Navigation */}
            <div className="flex gap-1 bg-gray-900/50 rounded-lg p-1">
              {(
                [
                  { key: "dimensions", label: "Dimensions", icon: BarChart3 },
                  { key: "hotspots", label: `File Hotspots (${data.fileHotspots.length})`, icon: FileWarning },
                  { key: "recommendations", label: `Recommendations (${data.recommendations.length})`, icon: TrendingUp },
                ] as const
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

            {/* Tab: Dimensions */}
            {activeTab === "dimensions" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(DIMENSION_CONFIG).map(([key, config]) => {
                  const dim = data.dimensions[key as keyof typeof data.dimensions]
                  if (!dim) return null
                  const isExpanded = expandedDimension === key
                  const IconComp = config.icon

                  return (
                    <Card
                      key={key}
                      className={`bg-gray-900/80 border-gray-800/60 cursor-pointer transition-all ${
                        isExpanded ? "border-orange-500/40 col-span-2 sm:col-span-4" : "hover:border-orange-500/20"
                      }`}
                      onClick={() => setExpandedDimension(isExpanded ? null : key)}
                    >
                      <CardContent className="pt-4 pb-3">
                        <div className={isExpanded ? "flex items-center gap-4" : "text-center"}>
                          <ScoreRing score={dim.score} grade={dim.grade} size="sm" />
                          <div className={isExpanded ? "flex-1" : ""}>
                            <div className={`flex items-center gap-1.5 ${isExpanded ? "" : "justify-center"} mt-2`}>
                              <IconComp className="h-3 w-3 text-orange-400" />
                              <p className="text-[11px] text-gray-300 font-medium">{config.label}</p>
                            </div>
                            <p className="text-[10px] text-gray-600 mt-0.5">
                              {dim.issues.length} issue{dim.issues.length !== 1 ? "s" : ""}
                              {isExpanded && ` - ${config.description}`}
                            </p>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-orange-400 shrink-0" />
                          ) : null}
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="mt-4 space-y-4 border-t border-gray-800/60 pt-3">
                            {/* Issues */}
                            {dim.issues.length > 0 && (
                              <div>
                                <h3 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1.5">
                                  <AlertTriangle className="h-3 w-3" />
                                  Issues ({dim.issues.length})
                                </h3>
                                <div className="space-y-2">
                                  {dim.issues.map((issue, i) => (
                                    <div key={i} className="flex items-start gap-2 text-xs">
                                      <Badge
                                        className={`text-[10px] px-1.5 py-0 border-0 shrink-0 ${
                                          SEVERITY_COLORS[issue.severity] || SEVERITY_COLORS.low
                                        }`}
                                      >
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
                                        <span className="text-gray-700 ml-1 text-[10px]">[{issue.rule}]</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Suggestions */}
                            {dim.suggestions.length > 0 && (
                              <div>
                                <h3 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1.5">
                                  <CheckCircle className="h-3 w-3 text-emerald-400" />
                                  Suggestions
                                </h3>
                                <div className="space-y-1.5">
                                  {dim.suggestions.map((s, i) => (
                                    <div key={i} className="flex items-start gap-2 text-xs">
                                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                                      <span className="text-gray-300">{s}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {dim.issues.length === 0 && dim.suggestions.length === 0 && (
                              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                                No issues found in this dimension
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Tab: File Hotspots */}
            {activeTab === "hotspots" && (
              <Card className="bg-gray-900/80 border-gray-800/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
                    <FileWarning className="h-4 w-4 text-orange-400" />
                    File Hotspots
                    <span className="text-[10px] text-gray-600 font-normal">Files with most issues across dimensions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.fileHotspots.length > 0 ? (
                    <div className="space-y-1">
                      {data.fileHotspots.map((hotspot, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 text-xs py-2.5 px-2 rounded-lg hover:bg-gray-800/50 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-md bg-gray-800 flex items-center justify-center shrink-0">
                            <span
                              className={`text-[11px] font-bold ${
                                hotspot.worstSeverity === "critical"
                                  ? "text-red-400"
                                  : hotspot.worstSeverity === "high"
                                  ? "text-orange-400"
                                  : hotspot.worstSeverity === "medium"
                                  ? "text-yellow-400"
                                  : "text-gray-400"
                              }`}
                            >
                              {hotspot.issueCount}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-200 font-mono text-[11px] truncate">{hotspot.path}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {hotspot.lines > 0 && (
                                <span className="text-gray-600 text-[10px]">{hotspot.lines} lines</span>
                              )}
                              {hotspot.dimensions.map((dim) => {
                                const cfg = DIMENSION_CONFIG[dim]
                                return cfg ? (
                                  <Badge key={dim} className="text-[9px] px-1 py-0 bg-orange-500/10 text-orange-400 border-0">
                                    {cfg.label}
                                  </Badge>
                                ) : null
                              })}
                            </div>
                          </div>
                          <Badge
                            className={`text-[10px] px-1.5 py-0 border-0 ${
                              SEVERITY_COLORS[hotspot.worstSeverity] || SEVERITY_COLORS.low
                            }`}
                          >
                            {hotspot.worstSeverity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 text-center py-6 flex flex-col items-center gap-2">
                      <CheckCircle className="h-6 w-6 text-emerald-400" />
                      No file hotspots detected
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tab: Recommendations */}
            {activeTab === "recommendations" && (
              <Card className="bg-gray-900/80 border-gray-800/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-orange-400" />
                    Priority Recommendations
                    <span className="text-[10px] text-gray-600 font-normal">Ordered by impact</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.recommendations.length > 0 ? (
                    <div className="space-y-3">
                      {data.recommendations.map((rec, i) => {
                        const pCfg = PRIORITY_CONFIG[rec.priority] || PRIORITY_CONFIG.low
                        const dimCfg = DIMENSION_CONFIG[rec.dimension]
                        const IconComp = dimCfg?.icon || Activity
                        return (
                          <div
                            key={i}
                            className={`flex items-start gap-3 text-xs p-3 rounded-lg border-l-2 ${pCfg.border} ${pCfg.bg}`}
                          >
                            <IconComp className="h-3.5 w-3.5 text-orange-400 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10px] text-gray-500">{dimCfg?.label || rec.dimension}</span>
                                <Badge
                                  className={`text-[9px] px-1 py-0 border-0 ${
                                    SEVERITY_COLORS[rec.priority] || SEVERITY_COLORS.low
                                  }`}
                                >
                                  {rec.priority}
                                </Badge>
                              </div>
                              <span className="text-gray-300">{rec.message}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 text-center py-6 flex flex-col items-center gap-2">
                      <CheckCircle className="h-6 w-6 text-emerald-400" />
                      No critical recommendations - your project is healthy!
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}
