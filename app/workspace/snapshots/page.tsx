"use client"

import React, { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Camera,
  RotateCcw,
  Trash2,
  Loader2,
  FileText,
  Clock,
  HardDrive,
  ChevronDown,
  ChevronRight,
  Download,
  AlertTriangle,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Snapshot {
  id: string
  project_id: string
  name: string
  description: string | null
  file_count: number
  total_size: number
  created_at: string
}

interface SnapshotFile {
  path: string
  content: string
  size: number
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function SnapshotsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    }>
      <SnapshotsContent />
    </Suspense>
  )
}

function SnapshotsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')
  const projectName = searchParams.get('name') || 'Project'

  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedFiles, setExpandedFiles] = useState<SnapshotFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)

  const fetchSnapshots = useCallback(async () => {
    if (!projectId) return
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`/api/snapshots?projectId=${projectId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setSnapshots(json.snapshots || [])
      }
    } catch (err) {
      console.error('Failed to fetch snapshots:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchSnapshots()
  }, [fetchSnapshots])

  const toggleExpand = async (snapshot: Snapshot) => {
    if (expandedId === snapshot.id) {
      setExpandedId(null)
      setExpandedFiles([])
      return
    }

    setExpandedId(snapshot.id)
    setLoadingFiles(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`/api/snapshots?id=${snapshot.id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setExpandedFiles(json.snapshot?.files || [])
      }
    } catch (err) {
      console.error('Failed to load snapshot files:', err)
    } finally {
      setLoadingFiles(false)
    }
  }

  const handleRestore = async (snapshotId: string) => {
    setRestoring(snapshotId)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Fetch full snapshot with files
      const res = await fetch(`/api/snapshots?id=${snapshotId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      if (!res.ok) return

      const json = await res.json()
      const files = json.snapshot?.files || []

      if (files.length === 0) return

      // Store the restored files in localStorage for the workspace to pick up
      const restoreData = {
        snapshotId,
        projectId,
        files,
        restoredAt: new Date().toISOString(),
      }
      localStorage.setItem(`pipilot_restore_${projectId}`, JSON.stringify(restoreData))

      // Navigate back to workspace with restore flag
      router.push(`/workspace?projectId=${projectId}&restore=true`)
    } catch (err) {
      console.error('Failed to restore snapshot:', err)
    } finally {
      setRestoring(null)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      await fetch(`/api/snapshots?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      setSnapshots(prev => prev.filter(s => s.id !== id))
      if (expandedId === id) {
        setExpandedId(null)
        setExpandedFiles([])
      }
    } catch (err) {
      console.error('Failed to delete snapshot:', err)
    }
  }

  const handleExport = (files: SnapshotFile[]) => {
    const exportData = files.map(f => `// === ${f.path} ===\n${f.content}`).join('\n\n')
    const blob = new Blob([exportData], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `snapshot-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
    <div className="min-h-screen bg-gray-950 pt-16">
      <Navigation />
      {/* Header */}
      <div className="border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-sm sticky top-16 z-30">
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
              <Camera className="h-5 w-5 text-orange-400" />
              <h1 className="text-lg font-semibold text-gray-100">Snapshots</h1>
              <Badge className="bg-gray-800 text-gray-400 border-0 text-[10px]">{projectName}</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <p className="text-sm text-gray-400">
          Project snapshots capture the entire file state at a point in time. The AI can also create snapshots automatically before major changes. Restore any snapshot to roll back your project.
        </p>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          </div>
        ) : snapshots.length === 0 ? (
          <Card className="bg-gray-900/80 border-gray-800/60">
            <CardContent className="py-10 text-center">
              <Camera className="h-10 w-10 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-1">No snapshots yet</p>
              <p className="text-xs text-gray-600">Ask the AI to "create a snapshot" before making big changes, or snapshots are created automatically during major refactors.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {snapshots.map((snapshot) => (
              <Card key={snapshot.id} className="bg-gray-900/80 border-gray-800/60 hover:border-orange-500/20 transition-all">
                <CardContent className="pt-4 pb-3">
                  {/* Snapshot header */}
                  <div className="flex items-start justify-between">
                    <button
                      onClick={() => toggleExpand(snapshot)}
                      className="flex items-start gap-3 flex-1 min-w-0 text-left"
                    >
                      <div className="h-8 w-8 rounded-lg bg-orange-600/15 flex items-center justify-center text-orange-400 shrink-0 mt-0.5">
                        <Camera className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {expandedId === snapshot.id ? (
                            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                          )}
                          <span className="text-sm font-medium text-gray-200">{snapshot.name}</span>
                        </div>
                        {snapshot.description && (
                          <p className="text-xs text-gray-500 mb-1 pl-5">{snapshot.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-gray-600 pl-5">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {snapshot.file_count} files
                          </span>
                          <span className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3" />
                            {formatBytes(snapshot.total_size)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timeAgo(snapshot.created_at)}
                          </span>
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestore(snapshot.id)}
                        disabled={restoring === snapshot.id}
                        className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 text-xs h-7 px-2"
                      >
                        {restoring === snapshot.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            Restore
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(snapshot.id)}
                        className="h-7 w-7 text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded file list */}
                  {expandedId === snapshot.id && (
                    <div className="mt-3 pt-3 border-t border-gray-800/60">
                      {loadingFiles ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-500">Files in snapshot</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExport(expandedFiles)}
                              className="text-gray-500 hover:text-orange-400 text-[10px] h-6 px-2"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Export
                            </Button>
                          </div>
                          <div className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
                            {expandedFiles.map((file, i) => (
                              <div key={i} className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-gray-800/50 text-xs">
                                <span className="text-gray-300 truncate flex-1 font-mono">{file.path}</span>
                                <span className="text-gray-600 ml-2 shrink-0">{formatBytes(file.size)}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
