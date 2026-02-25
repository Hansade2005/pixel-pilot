"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
  AlertCircle,
  Info,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { storageManager } from "@/lib/storage-manager"

interface HealthIssue {
  severity: 'low' | 'medium' | 'high'
  message: string
  file?: string
}

interface HealthDimension {
  score: number
  grade: string
  issues: HealthIssue[]
  suggestions: string[]
}

interface HealthData {
  overall: {
    score: number
    grade: string
    totalFiles: number
    totalLines: number
  }
  dimensions: {
    codeQuality: HealthDimension
    security: HealthDimension
    performance: HealthDimension
    accessibility: HealthDimension
    maintainability: HealthDimension
  }
}

const DIMENSION_CONFIG = {
  codeQuality: { label: 'Code Quality', icon: Code, color: 'orange' },
  security: { label: 'Security', icon: Shield, color: 'red' },
  performance: { label: 'Performance', icon: Zap, color: 'yellow' },
  accessibility: { label: 'Accessibility', icon: Eye, color: 'blue' },
  maintainability: { label: 'Maintainability', icon: Wrench, color: 'emerald' },
}

const SEVERITY_COLORS = {
  low: 'text-gray-400 bg-gray-500/10',
  medium: 'text-yellow-400 bg-yellow-500/10',
  high: 'text-red-400 bg-red-500/10',
}

const GRADE_COLORS: Record<string, string> = {
  A: 'text-emerald-400',
  B: 'text-blue-400',
  C: 'text-yellow-400',
  D: 'text-orange-400',
  F: 'text-red-400',
}

function ScoreRing({ score, grade, size = 'lg' }: { score: number; grade: string; size?: 'sm' | 'lg' }) {
  const radius = size === 'lg' ? 54 : 28
  const strokeWidth = size === 'lg' ? 6 : 4
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const viewBox = size === 'lg' ? 120 : 64

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={viewBox} height={viewBox} viewBox={`0 0 ${viewBox} ${viewBox}`}>
        <circle
          cx={viewBox / 2} cy={viewBox / 2} r={radius}
          fill="none" stroke="currentColor" strokeWidth={strokeWidth}
          className="text-gray-800"
        />
        <circle
          cx={viewBox / 2} cy={viewBox / 2} r={radius}
          fill="none" stroke="currentColor" strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${viewBox / 2} ${viewBox / 2})`}
          className={score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-yellow-500' : 'text-red-500'}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold ${size === 'lg' ? 'text-2xl' : 'text-sm'} ${GRADE_COLORS[grade] || 'text-gray-300'}`}>
          {grade}
        </span>
        {size === 'lg' && <span className="text-[10px] text-gray-500">{score}/100</span>}
      </div>
    </div>
  )
}

export default function HealthScorePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')
  const projectName = searchParams.get('name') || 'Project'

  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null)

  const runAnalysis = async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)

    try {
      // Get project files from storage
      const workspaces = await storageManager.getWorkspaces()
      const workspace = workspaces.find((w: any) => w.id === projectId)
      if (!workspace) {
        setError('Project not found')
        setLoading(false)
        return
      }

      const allFiles = await storageManager.getFiles(projectId)
      if (!allFiles || allFiles.length === 0) {
        setError('No files found in project')
        setLoading(false)
        return
      }

      // Filter to code files only
      const codeFiles = allFiles
        .filter((f: any) => {
          if (!f.name || f.isDirectory) return false
          const ext = f.name.split('.').pop()?.toLowerCase()
          return ['ts', 'tsx', 'js', 'jsx', 'css', 'html', 'json', 'md'].includes(ext || '')
        })
        .map((f: any) => ({
          path: f.path || f.name,
          content: f.content || '',
        }))

      if (codeFiles.length === 0) {
        setError('No code files found to analyze')
        setLoading(false)
        return
      }

      const res = await fetch('/api/health-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: codeFiles }),
      })

      if (!res.ok) throw new Error('Analysis failed')
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err.message || 'Failed to analyze project')
    } finally {
      setLoading(false)
    }
  }

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
            {data ? 'Re-analyze' : 'Analyze Project'}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {!data && !loading && !error && (
          <Card className="bg-gray-900/80 border-gray-800/60">
            <CardContent className="py-12 text-center">
              <Activity className="h-12 w-12 text-gray-700 mx-auto mb-4" />
              <h2 className="text-lg font-medium text-gray-300 mb-2">Analyze Your Project</h2>
              <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                Run a health check to get scores for code quality, security, performance, accessibility, and maintainability.
              </p>
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

        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500 mb-3" />
            <p className="text-sm text-gray-400">Analyzing your codebase...</p>
          </div>
        )}

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
            {/* Overall Score */}
            <Card className="bg-gray-900/80 border-gray-800/60">
              <CardContent className="pt-6 pb-5">
                <div className="flex items-center gap-6">
                  <ScoreRing score={data.overall.score} grade={data.overall.grade} size="lg" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-100 mb-1">Overall Health: {data.overall.score}/100</h2>
                    <p className="text-sm text-gray-400">
                      {data.overall.totalFiles} files analyzed, {data.overall.totalLines.toLocaleString()} lines of code
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {data.overall.score >= 80
                        ? 'Your project is in great shape!'
                        : data.overall.score >= 60
                        ? 'Good foundation, but there are areas to improve.'
                        : 'Several issues found that should be addressed.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dimension Scores */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {Object.entries(DIMENSION_CONFIG).map(([key, config]) => {
                const dim = data.dimensions[key as keyof typeof data.dimensions]
                return (
                  <Card
                    key={key}
                    className={`bg-gray-900/80 border-gray-800/60 cursor-pointer transition-all ${
                      expandedDimension === key ? 'border-orange-500/40' : 'hover:border-orange-500/20'
                    }`}
                    onClick={() => setExpandedDimension(expandedDimension === key ? null : key)}
                  >
                    <CardContent className="pt-4 pb-3 text-center">
                      <ScoreRing score={dim.score} grade={dim.grade} size="sm" />
                      <p className="text-[11px] text-gray-400 mt-2 font-medium">{config.label}</p>
                      <p className="text-[10px] text-gray-600">{dim.issues.length} issues</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Expanded Dimension Details */}
            {expandedDimension && (
              <Card className="bg-gray-900/80 border-orange-500/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
                    {React.createElement(DIMENSION_CONFIG[expandedDimension as keyof typeof DIMENSION_CONFIG].icon, { className: 'h-4 w-4 text-orange-400' })}
                    {DIMENSION_CONFIG[expandedDimension as keyof typeof DIMENSION_CONFIG].label} Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Issues */}
                  {data.dimensions[expandedDimension as keyof typeof data.dimensions].issues.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium text-gray-400 mb-2">Issues Found</h3>
                      <div className="space-y-2">
                        {data.dimensions[expandedDimension as keyof typeof data.dimensions].issues.map((issue, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <Badge className={`text-[10px] px-1.5 py-0 ${SEVERITY_COLORS[issue.severity]}`}>
                              {issue.severity}
                            </Badge>
                            <div className="flex-1">
                              <span className="text-gray-300">{issue.message}</span>
                              {issue.file && (
                                <span className="text-gray-600 ml-1 font-mono text-[10px]">({issue.file})</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  {data.dimensions[expandedDimension as keyof typeof data.dimensions].suggestions.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium text-gray-400 mb-2">Suggestions</h3>
                      <div className="space-y-1.5">
                        {data.dimensions[expandedDimension as keyof typeof data.dimensions].suggestions.map((s, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                            <span className="text-gray-300">{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
