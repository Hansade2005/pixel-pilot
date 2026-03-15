"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  GitCommit,
  GitBranch,
  Plus,
  Minus,
  Check,
  ChevronRight,
  ChevronDown,
  User,
  RefreshCw,
  Loader2,
  ArrowDown,
  Eye,
  ExternalLink,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  commitFiles as githubCommitFiles,
  fetchCommits as githubFetchCommits,
  type GitHubCommitEntry,
} from "@/lib/github-client"

interface SourceControlTabProps {
  projectId: string | undefined
  teamWorkspaceId: string | undefined
  organizationId: string | undefined
  isTeamWorkspace: boolean
  isGitHubBacked?: boolean
  githubRepoUrl?: string
  userId: string
  // GitHub sync hook state (passed from parent)
  lastKnownSha?: string | null
  hasRemoteChanges?: boolean
  isPulling?: boolean
  onPull?: () => Promise<any>
  onOpenDiff?: (title: string, content: string) => void
}

interface FileChange {
  path: string
  name: string
  status: "added" | "modified" | "deleted"
  content?: string
  previousContent?: string
}

interface CommitEntry {
  id: string
  sha?: string
  message: string
  author_id?: string
  author_name: string
  author_email?: string
  author_avatar?: string
  file_count: number
  files: any[]
  created_at: string
}

export function SourceControlTab({
  projectId,
  teamWorkspaceId,
  organizationId,
  isTeamWorkspace,
  isGitHubBacked = false,
  githubRepoUrl,
  userId,
  lastKnownSha,
  hasRemoteChanges,
  isPulling,
  onPull,
  onOpenDiff,
}: SourceControlTabProps) {
  const [stagedFiles, setStagedFiles] = useState<FileChange[]>([])
  const [unstagedFiles, setUnstagedFiles] = useState<FileChange[]>([])
  const [commitMessage, setCommitMessage] = useState("")
  const [isCommitting, setIsCommitting] = useState(false)
  const [commits, setCommits] = useState<CommitEntry[]>([])
  const [isLoadingCommits, setIsLoadingCommits] = useState(false)
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null)
  const [view, setView] = useState<"changes" | "history">("changes")
  const [stagedExpanded, setStagedExpanded] = useState(true)
  const [unstagedExpanded, setUnstagedExpanded] = useState(true)
  const [isScanning, setIsScanning] = useState(false)
  const [isGeneratingMsg, setIsGeneratingMsg] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  // Scan for local changes by comparing IndexedDB files with remote
  const scanForChanges = useCallback(async () => {
    if (!projectId || !teamWorkspaceId || !isTeamWorkspace) return

    setIsScanning(true)
    try {
      const { storageManager } = await import("@/lib/storage-manager")
      await storageManager.init()
      const localFiles = await storageManager.getFiles(projectId)

      if (isGitHubBacked) {
        // For GitHub-backed workspaces, compare against what was last pulled
        // Deduplicate files that exist with both /path and path formats
        const seen = new Set<string>()
        const changes: FileChange[] = localFiles
          .filter((f) => !f.isDirectory)
          .filter((f) => {
            const normalized = f.path.startsWith('/') ? f.path : `/${f.path}`
            if (seen.has(normalized)) return false
            seen.add(normalized)
            return true
          })
          .map((f) => ({
            path: f.path,
            name: f.name,
            status: "modified" as const,
            content: f.content,
          }))

        setUnstagedFiles(changes)
        setStagedFiles([])
      } else {
        // Legacy: compare with Supabase JSONB
        const { data: workspace } = await supabase
          .from("team_workspaces")
          .select("files")
          .eq("id", teamWorkspaceId)
          .single()

        const remoteFiles: any[] = workspace?.files || []
        const remoteByPath = new Map(remoteFiles.map((f: any) => [f.path, f]))

        const changes: FileChange[] = []

        for (const localFile of localFiles) {
          if (localFile.isDirectory) continue
          const remote = remoteByPath.get(localFile.path)
          if (!remote) {
            changes.push({
              path: localFile.path,
              name: localFile.name,
              status: "added",
              content: localFile.content,
            })
          } else if (remote.content !== localFile.content) {
            changes.push({
              path: localFile.path,
              name: localFile.name,
              status: "modified",
              content: localFile.content,
              previousContent: remote.content,
            })
          }
          remoteByPath.delete(localFile.path)
        }

        for (const [path, remote] of remoteByPath) {
          if (remote.isDirectory) continue
          changes.push({
            path,
            name: remote.name,
            status: "deleted",
            previousContent: remote.content,
          })
        }

        setUnstagedFiles(changes)
        setStagedFiles([])
      }
    } catch (error) {
      console.error("Error scanning for changes:", error)
    } finally {
      setIsScanning(false)
    }
  }, [projectId, teamWorkspaceId, isTeamWorkspace, isGitHubBacked, supabase])

  // Load commit history
  const loadCommits = useCallback(async () => {
    if (!teamWorkspaceId) return

    setIsLoadingCommits(true)
    try {
      if (isGitHubBacked) {
        // Fetch real git commits from GitHub
        const gitCommits = await githubFetchCommits(teamWorkspaceId)
        const entries: CommitEntry[] = gitCommits.map((c) => ({
          id: c.sha,
          sha: c.sha,
          message: c.message,
          author_name: c.author_name,
          author_email: c.author_email,
          author_avatar: (c as any).author_avatar,
          file_count: c.files_changed || 0,
          files: [],
          created_at: c.date,
        }))
        setCommits(entries)
      } else {
        // Legacy: load from team_activity
        if (!organizationId) return

        const { data, error } = await supabase
          .from("team_activity")
          .select("*")
          .eq("workspace_id", teamWorkspaceId)
          .eq("action", "commit")
          .order("created_at", { ascending: false })
          .limit(50)

        if (error) throw error

        const authorIds = [
          ...new Set((data || []).map((d: any) => d.actor_id)),
        ]
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", authorIds)

        const profileMap = new Map(
          (profiles || []).map((p: any) => [p.id, p])
        )

        const commitEntries: CommitEntry[] = (data || []).map((d: any) => {
          const profile = profileMap.get(d.actor_id)
          return {
            id: d.id,
            message: d.metadata?.message || "No message",
            author_id: d.actor_id,
            author_name:
              profile?.full_name || d.metadata?.author_name || "Unknown",
            author_email: profile?.email,
            file_count: d.metadata?.file_count || 0,
            files: d.metadata?.files || [],
            created_at: d.created_at,
          }
        })

        setCommits(commitEntries)
      }
    } catch (error) {
      console.error("Error loading commits:", error)
    } finally {
      setIsLoadingCommits(false)
    }
  }, [teamWorkspaceId, organizationId, isGitHubBacked, supabase])

  // Initial load
  useEffect(() => {
    if (isTeamWorkspace) {
      scanForChanges()
      loadCommits()
    }
  }, [isTeamWorkspace, scanForChanges, loadCommits])

  // Realtime subscription for new commits (legacy mode only)
  useEffect(() => {
    if (!teamWorkspaceId || isGitHubBacked) return

    const channel = supabase
      .channel(`commits:${teamWorkspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_activity",
          filter: `workspace_id=eq.${teamWorkspaceId}`,
        },
        (payload: any) => {
          if (payload.new?.action === "commit") {
            loadCommits()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [teamWorkspaceId, isGitHubBacked, supabase, loadCommits])

  // Stage / unstage
  const stageFile = (file: FileChange) => {
    setUnstagedFiles((prev) => prev.filter((f) => f.path !== file.path))
    setStagedFiles((prev) => [...prev, file])
  }

  const unstageFile = (file: FileChange) => {
    setStagedFiles((prev) => prev.filter((f) => f.path !== file.path))
    setUnstagedFiles((prev) => [...prev, file])
  }

  const stageAll = () => {
    setStagedFiles((prev) => [...prev, ...unstagedFiles])
    setUnstagedFiles([])
  }

  const unstageAll = () => {
    setUnstagedFiles((prev) => [...prev, ...stagedFiles])
    setStagedFiles([])
  }

  // Generate commit message using a0 LLM API
  const generateCommitMessage = async () => {
    const allChanges = [...stagedFiles, ...unstagedFiles]
    if (allChanges.length === 0) {
      toast.error("No changes to describe")
      return
    }

    setIsGeneratingMsg(true)
    try {
      // Build a summary of changed files
      const changeSummary = allChanges.slice(0, 20).map(f => {
        const status = f.status === 'added' ? 'A' : f.status === 'deleted' ? 'D' : 'M'
        const snippet = f.content ? f.content.slice(0, 200) : ''
        return `${status} ${f.path}${snippet ? `\n${snippet}...` : ''}`
      }).join('\n\n')

      // Get last user/assistant message pair for context
      let chatContext = ''
      try {
        const { storageManager } = await import('@/lib/storage-manager')
        await storageManager.init()
        const sessions = await storageManager.getChatSessions(userId)
        const activeSession = sessions
          .filter(s => s.workspaceId === projectId && s.isActive)
          .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())[0]

        if (activeSession) {
          const msgs = await storageManager.getMessages(activeSession.id)
          // Get the last user message and last assistant message
          const lastUser = [...msgs].reverse().find(m => m.role === 'user')
          const lastAssistant = [...msgs].reverse().find(m => m.role === 'assistant')
          if (lastUser || lastAssistant) {
            chatContext = '\n\nChat context (what the user asked and AI did):'
            if (lastUser) {
              const userText = typeof lastUser.content === 'string' ? lastUser.content : JSON.stringify(lastUser.content)
              chatContext += `\nUser: ${userText.slice(0, 300)}`
            }
            if (lastAssistant) {
              const aiText = typeof lastAssistant.content === 'string' ? lastAssistant.content : JSON.stringify(lastAssistant.content)
              chatContext += `\nAI: ${aiText.slice(0, 300)}`
            }
          }
        }
      } catch {
        // Chat context is optional, continue without it
      }

      const res = await fetch('https://api.a0.dev/ai/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a commit message generator. Given file changes and optional chat context about what the user asked the AI to do, write a concise, conventional commit message (1 line, max 72 chars). Use prefixes like feat:, fix:, refactor:, docs:, style:, chore: when appropriate. Focus on the "why" from the chat context, not just the "what" from the file list. Only output the commit message text, nothing else.'
            },
            {
              role: 'user',
              content: `Generate a commit message for these changes:\n\n${changeSummary}${chatContext}`
            }
          ]
        }),
      })

      if (!res.ok) throw new Error('Failed to generate commit message')

      const data = await res.json()
      const message = (data.completion || '').trim().replace(/^["']|["']$/g, '')

      if (message) {
        setCommitMessage(message)
      } else {
        toast.error("Could not generate a message")
      }
    } catch (err: any) {
      console.error('[Source Control] Commit message generation error:', err)
      toast.error("Failed to generate commit message")
    } finally {
      setIsGeneratingMsg(false)
    }
  }

  // Commit staged changes
  const handleCommit = async () => {
    if (!commitMessage.trim() || stagedFiles.length === 0) return
    if (!teamWorkspaceId || !organizationId) return

    setIsCommitting(true)
    try {
      if (isGitHubBacked) {
        // GitHub commit: real git commit + push
        const filesToCommit = stagedFiles
          .filter((f) => f.status !== "deleted")
          .map((f) => ({
            path: f.path.replace(/^\//, ''),
            content: f.content || "",
          }))

        const deletedPaths = stagedFiles
          .filter((f) => f.status === "deleted")
          .map((f) => f.path.replace(/^\//, ''))

        const result = await githubCommitFiles(
          teamWorkspaceId,
          filesToCommit,
          deletedPaths,
          commitMessage.trim(),
          lastKnownSha || ""
        )

        toast.success(`Committed ${stagedFiles.length} file(s) to GitHub`)
        setStagedFiles([])
        setCommitMessage("")
        loadCommits()
      } else {
        // Legacy: sync to Supabase JSONB + log activity
        const filesToSync = stagedFiles
          .filter((f) => f.status !== "deleted")
          .map((f) => ({
            path: f.path,
            name: f.name,
            content: f.content || "",
            fileType: f.path.split(".").pop() || "text",
            size: (f.content || "").length,
            isDirectory: false,
          }))

        const deletedPaths = stagedFiles
          .filter((f) => f.status === "deleted")
          .map((f) => f.path)

        const response = await fetch(
          `/api/teams/workspaces/${teamWorkspaceId}/sync`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              files: filesToSync,
              deletedPaths: deletedPaths.length > 0 ? deletedPaths : undefined,
            }),
          }
        )

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Sync failed")
        }

        await supabase.from("team_activity").insert({
          organization_id: organizationId,
          workspace_id: teamWorkspaceId,
          action: "commit",
          actor_id: userId,
          metadata: {
            message: commitMessage.trim(),
            file_count: stagedFiles.length,
            files: stagedFiles.map((f) => ({
              path: f.path,
              status: f.status,
            })),
            author_name:
              (await supabase.auth.getUser()).data.user?.user_metadata
                ?.full_name || "Unknown",
          },
        })

        toast.success(`Committed ${stagedFiles.length} file(s)`)
        setStagedFiles([])
        setCommitMessage("")
        loadCommits()
        scanForChanges()
      }
    } catch (error: any) {
      if (error.name === "ConflictError") {
        toast.error("Remote has changed. Pull latest changes first.")
      } else {
        toast.error(error.message || "Commit failed")
      }
    } finally {
      setIsCommitting(false)
    }
  }

  // Generate diff markdown for a file
  const generateDiffMarkdown = (file: FileChange): string => {
    const lines: string[] = []
    lines.push(
      `# ${
        file.status === "added"
          ? "New File"
          : file.status === "deleted"
          ? "Deleted File"
          : "Modified File"
      }: \`${file.path}\`\n`
    )
    lines.push(
      `**Status:** ${
        file.status.charAt(0).toUpperCase() + file.status.slice(1)
      }\n`
    )

    if (file.status === "added" && file.content) {
      lines.push("## Added Content\n")
      const ext = file.path.split(".").pop() || ""
      lines.push("```" + ext)
      lines.push(file.content)
      lines.push("```\n")
    } else if (file.status === "deleted" && file.previousContent) {
      lines.push("## Deleted Content\n")
      const ext = file.path.split(".").pop() || ""
      lines.push("```" + ext)
      lines.push(file.previousContent)
      lines.push("```\n")
    } else if (file.status === "modified") {
      if (file.previousContent) {
        lines.push("## Previous Version\n")
        const ext = file.path.split(".").pop() || ""
        lines.push("```" + ext)
        lines.push(file.previousContent)
        lines.push("```\n")
      }
      if (file.content) {
        lines.push("## Current Version\n")
        const ext = file.path.split(".").pop() || ""
        lines.push("```" + ext)
        lines.push(file.content)
        lines.push("```\n")
      }
    }

    return lines.join("\n")
  }

  const generateCommitMarkdown = (commit: CommitEntry): string => {
    const lines: string[] = []
    lines.push(`# Commit: ${commit.message}\n`)
    if (commit.sha) {
      lines.push(`**SHA:** \`${commit.sha.slice(0, 7)}\``)
    }
    lines.push(`**Author:** ${commit.author_name}`)
    lines.push(`**Date:** ${new Date(commit.created_at).toLocaleString()}`)
    lines.push(`**Files changed:** ${commit.file_count}\n`)

    if (commit.files.length > 0) {
      lines.push("## Changed Files\n")
      for (const file of commit.files) {
        const f =
          typeof file === "string"
            ? { path: file, status: "modified" }
            : file
        const icon =
          (f as any).status === "added"
            ? "+"
            : (f as any).status === "deleted"
            ? "-"
            : "~"
        lines.push(`- \`${icon}\` \`${(f as any).path || f}\``)
      }
    }

    return lines.join("\n")
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diff < 60) return "just now"
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return date.toLocaleDateString()
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "added":
        return <span className="text-green-400 text-xs font-bold">A</span>
      case "modified":
        return <span className="text-orange-400 text-xs font-bold">M</span>
      case "deleted":
        return <span className="text-red-400 text-xs font-bold">D</span>
      default:
        return null
    }
  }

  if (!isTeamWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
        <GitBranch className="h-12 w-12 text-gray-600 mb-4" />
        <h3 className="text-sm font-medium text-gray-300 mb-2">
          Source Control
        </h3>
        <p className="text-xs text-gray-500 mb-4 max-w-[240px]">
          Convert this workspace to a team workspace to enable source control
          with staging, commits, and push.
        </p>
      </div>
    )
  }

  const totalChanges = stagedFiles.length + unstagedFiles.length

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="flex items-center border-b border-gray-800/60 px-3 py-1.5 gap-1 flex-shrink-0">
        <button
          onClick={() => setView("changes")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
            view === "changes"
              ? "bg-orange-600/15 text-orange-400"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
          )}
        >
          Changes
          {totalChanges > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px]">
              {totalChanges}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setView("history")
            loadCommits()
          }}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
            view === "history"
              ? "bg-orange-600/15 text-orange-400"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
          )}
        >
          History
        </button>
        <div className="flex-1" />

        {/* Pull button for GitHub-backed workspaces */}
        {isGitHubBacked && onPull && (
          <button
            onClick={async () => {
              const result = await onPull()
              if (result?.success) {
                toast.success(
                  `Pulled ${result.filesUpdated || 0} file(s) from GitHub`
                )
                scanForChanges()
              } else if (result?.error) {
                toast.error(result.error)
              }
            }}
            disabled={isPulling}
            className={cn(
              "h-6 px-2 flex items-center gap-1 rounded text-xs transition-colors",
              hasRemoteChanges
                ? "text-orange-400 bg-orange-500/10 hover:bg-orange-500/20"
                : "text-gray-500 hover:text-orange-400 hover:bg-orange-500/10"
            )}
            title={
              hasRemoteChanges
                ? "Remote changes available - click to pull"
                : "Pull latest from GitHub"
            }
          >
            {isPulling ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ArrowDown className="w-3 h-3" />
            )}
            {hasRemoteChanges && (
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            )}
          </button>
        )}

        {/* GitHub repo link */}
        {isGitHubBacked && githubRepoUrl && (
          <a
            href={githubRepoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-6 w-6 flex items-center justify-center rounded text-gray-500 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
            title="Open on GitHub"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        )}

        <button
          onClick={scanForChanges}
          disabled={isScanning}
          className="h-6 w-6 flex items-center justify-center rounded text-gray-500 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
          title="Refresh changes"
        >
          <RefreshCw
            className={cn("w-3.5 h-3.5", isScanning && "animate-spin")}
          />
        </button>
      </div>

      {view === "changes" ? (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Commit Message Input */}
          <div className="px-3 py-2 border-b border-gray-800/60 flex-shrink-0">
            <div className="relative">
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder={
                  isGitHubBacked
                    ? "Commit message (pushes to GitHub)..."
                    : "Commit message..."
                }
                className="w-full h-16 resize-none rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2 pr-8 text-xs text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50 transition-colors"
              />
              <button
                onClick={generateCommitMessage}
                disabled={isGeneratingMsg || (stagedFiles.length === 0 && unstagedFiles.length === 0)}
                className="absolute right-2 top-2 h-5 w-5 flex items-center justify-center rounded text-gray-500 hover:text-orange-400 hover:bg-orange-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Generate commit message with AI"
              >
                {isGeneratingMsg ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <div className="flex gap-1.5 mt-1.5">
              <Button
                size="sm"
                onClick={handleCommit}
                disabled={
                  isCommitting ||
                  stagedFiles.length === 0 ||
                  !commitMessage.trim()
                }
                className="flex-1 h-7 text-xs bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-30"
              >
                {isCommitting ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Check className="w-3 h-3 mr-1" />
                )}
                {isGitHubBacked
                  ? `Commit & Push (${stagedFiles.length})`
                  : `Commit (${stagedFiles.length})`}
              </Button>
            </div>
          </div>

          {/* File Lists */}
          <div className="flex-1 overflow-y-auto">
            {/* Staged Changes */}
            <div>
              <button
                onClick={() => setStagedExpanded(!stagedExpanded)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  {stagedExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <span>Staged Changes</span>
                  {stagedFiles.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px]">
                      {stagedFiles.length}
                    </span>
                  )}
                </div>
                {stagedFiles.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      unstageAll()
                    }}
                    className="text-[10px] text-gray-500 hover:text-gray-300 px-1"
                    title="Unstage all"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                )}
              </button>
              {stagedExpanded &&
                stagedFiles.map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center gap-2 px-4 py-1 hover:bg-gray-800/40 group cursor-pointer"
                    onClick={() =>
                      onOpenDiff?.(
                        `${file.name} (staged)`,
                        generateDiffMarkdown(file)
                      )
                    }
                  >
                    {statusIcon(file.status)}
                    <span className="flex-1 text-xs text-gray-300 truncate">
                      {file.path}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        unstageFile(file)
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-300 transition-opacity"
                      title="Unstage"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                  </div>
                ))}
            </div>

            {/* Unstaged Changes */}
            <div>
              <button
                onClick={() => setUnstagedExpanded(!unstagedExpanded)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  {unstagedExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <span>Changes</span>
                  {unstagedFiles.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px]">
                      {unstagedFiles.length}
                    </span>
                  )}
                </div>
                {unstagedFiles.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      stageAll()
                    }}
                    className="text-[10px] text-gray-500 hover:text-gray-300 px-1"
                    title="Stage all"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </button>
              {unstagedExpanded &&
                unstagedFiles.map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center gap-2 px-4 py-1 hover:bg-gray-800/40 group cursor-pointer"
                    onClick={() =>
                      onOpenDiff?.(
                        `${file.name} (changes)`,
                        generateDiffMarkdown(file)
                      )
                    }
                  >
                    {statusIcon(file.status)}
                    <span className="flex-1 text-xs text-gray-300 truncate">
                      {file.path}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        stageFile(file)
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-300 transition-opacity"
                      title="Stage"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                ))}
            </div>

            {totalChanges === 0 && !isScanning && (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <Check className="h-8 w-8 text-green-500/50 mb-2" />
                <p className="text-xs text-gray-500">
                  Working tree clean - no changes
                </p>
              </div>
            )}

            {isScanning && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 text-orange-400 animate-spin mr-2" />
                <span className="text-xs text-gray-500">
                  Scanning for changes...
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* History / Git Tree View */
        <div className="flex-1 overflow-y-auto">
          {isLoadingCommits ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-4 h-4 text-orange-400 animate-spin mr-2" />
              <span className="text-xs text-gray-500">
                Loading history...
              </span>
            </div>
          ) : commits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <GitCommit className="h-8 w-8 text-gray-600 mb-2" />
              <p className="text-xs text-gray-500">
                No commits yet. Stage and commit changes to start tracking
                history.
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Git tree line */}
              <div className="absolute left-[22px] top-0 bottom-0 w-px bg-gray-800" />

              {commits.map((commit, index) => (
                <div key={commit.id} className="relative">
                  <button
                    onClick={() =>
                      setExpandedCommit(
                        expandedCommit === commit.id ? null : commit.id
                      )
                    }
                    className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-gray-800/40 transition-colors text-left"
                  >
                    {/* Tree dot */}
                    <div className="relative z-10 w-[18px] h-[18px] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div
                        className={cn(
                          "w-2.5 h-2.5 rounded-full border-2",
                          index === 0
                            ? "bg-orange-500 border-orange-500"
                            : "bg-gray-950 border-gray-600"
                        )}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-200 font-medium truncate">
                        {commit.message}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <User className="w-2.5 h-2.5" />
                          {commit.author_name}
                        </span>
                        {commit.sha && (
                          <span className="text-[10px] text-gray-600 font-mono">
                            {commit.sha.slice(0, 7)}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-600">
                          {formatTimeAgo(commit.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenDiff?.(
                            `Commit: ${commit.message}`,
                            generateCommitMarkdown(commit)
                          )
                        }}
                        className="h-5 w-5 flex items-center justify-center rounded text-gray-500 hover:text-orange-400 hover:bg-orange-500/10"
                        title="View commit details"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                      {commit.sha && githubRepoUrl && (
                        <a
                          href={`${githubRepoUrl}/commit/${commit.sha}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="h-5 w-5 flex items-center justify-center rounded text-gray-500 hover:text-orange-400 hover:bg-orange-500/10"
                          title="View on GitHub"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {expandedCommit === commit.id ? (
                        <ChevronDown className="w-3 h-3 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-gray-500" />
                      )}
                    </div>
                  </button>

                  {/* Expanded file list */}
                  {expandedCommit === commit.id &&
                    commit.files.length > 0 && (
                      <div className="pl-[34px] pb-1">
                        {commit.files.map((file: any, fi: number) => {
                          const filePath =
                            typeof file === "string" ? file : file.path
                          const fileStatus =
                            typeof file === "string"
                              ? "modified"
                              : file.status || "modified"
                          return (
                            <div
                              key={fi}
                              className="flex items-center gap-2 px-2 py-0.5 hover:bg-gray-800/30 rounded cursor-pointer"
                              onClick={() =>
                                onOpenDiff?.(
                                  filePath,
                                  `# ${
                                    fileStatus === "added"
                                      ? "Added"
                                      : fileStatus === "deleted"
                                      ? "Deleted"
                                      : "Modified"
                                  }: \`${filePath}\`\n\nPart of commit: **${
                                    commit.message
                                  }**\nBy ${
                                    commit.author_name
                                  } at ${new Date(
                                    commit.created_at
                                  ).toLocaleString()}`
                                )
                              }
                            >
                              {statusIcon(fileStatus)}
                              <span className="text-[11px] text-gray-400 truncate">
                                {filePath}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
