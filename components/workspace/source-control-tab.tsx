"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Response } from "@/components/ai-elements/response"
import {
  GitCommit,
  GitBranch,
  Plus,
  Minus,
  FileText,
  Upload,
  Check,
  ChevronRight,
  ChevronDown,
  Clock,
  User,
  RefreshCw,
  Loader2,
  ArrowUp,
  Eye,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface SourceControlTabProps {
  projectId: string | undefined
  teamWorkspaceId: string | undefined
  organizationId: string | undefined
  isTeamWorkspace: boolean
  userId: string
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
  message: string
  author_id: string
  author_name: string
  author_email?: string
  file_count: number
  files: string[]
  created_at: string
}

export function SourceControlTab({
  projectId,
  teamWorkspaceId,
  organizationId,
  isTeamWorkspace,
  userId,
  onOpenDiff,
}: SourceControlTabProps) {
  const [stagedFiles, setStagedFiles] = useState<FileChange[]>([])
  const [unstagedFiles, setUnstagedFiles] = useState<FileChange[]>([])
  const [commitMessage, setCommitMessage] = useState("")
  const [isCommitting, setIsCommitting] = useState(false)
  const [isPushing, setIsPushing] = useState(false)
  const [commits, setCommits] = useState<CommitEntry[]>([])
  const [isLoadingCommits, setIsLoadingCommits] = useState(false)
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null)
  const [view, setView] = useState<"changes" | "history">("changes")
  const [stagedExpanded, setStagedExpanded] = useState(true)
  const [unstagedExpanded, setUnstagedExpanded] = useState(true)
  const [isScanning, setIsScanning] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  // Scan for local changes by comparing IndexedDB files with team workspace files
  const scanForChanges = useCallback(async () => {
    if (!projectId || !teamWorkspaceId || !isTeamWorkspace) return

    setIsScanning(true)
    try {
      const { storageManager } = await import("@/lib/storage-manager")
      await storageManager.init()
      const localFiles = await storageManager.getFiles(projectId)

      // Get team workspace files from Supabase
      const { data: workspace } = await supabase
        .from("team_workspaces")
        .select("files")
        .eq("id", teamWorkspaceId)
        .single()

      const remoteFiles: any[] = workspace?.files || []
      const remoteByPath = new Map(remoteFiles.map((f: any) => [f.path, f]))

      const changes: FileChange[] = []

      // Check local files against remote
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

      // Remaining remote files are deleted locally
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
    } catch (error) {
      console.error("Error scanning for changes:", error)
    } finally {
      setIsScanning(false)
    }
  }, [projectId, teamWorkspaceId, isTeamWorkspace, supabase])

  // Load commit history from team_activity
  const loadCommits = useCallback(async () => {
    if (!teamWorkspaceId || !organizationId) return

    setIsLoadingCommits(true)
    try {
      const { data, error } = await supabase
        .from("team_activity")
        .select("*")
        .eq("workspace_id", teamWorkspaceId)
        .eq("action", "commit")
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error

      // Fetch author profiles
      const authorIds = [...new Set((data || []).map((d: any) => d.actor_id))]
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
          author_name: profile?.full_name || d.metadata?.author_name || "Unknown",
          author_email: profile?.email,
          file_count: d.metadata?.file_count || 0,
          files: d.metadata?.files || [],
          created_at: d.created_at,
        }
      })

      setCommits(commitEntries)
    } catch (error) {
      console.error("Error loading commits:", error)
    } finally {
      setIsLoadingCommits(false)
    }
  }, [teamWorkspaceId, organizationId, supabase])

  // Initial load
  useEffect(() => {
    if (isTeamWorkspace) {
      scanForChanges()
      loadCommits()
    }
  }, [isTeamWorkspace, scanForChanges, loadCommits])

  // Realtime subscription for new commits
  useEffect(() => {
    if (!teamWorkspaceId) return

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
  }, [teamWorkspaceId, supabase, loadCommits])

  // Stage / unstage files
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

  // Commit staged changes
  const handleCommit = async () => {
    if (!commitMessage.trim() || stagedFiles.length === 0) return
    if (!teamWorkspaceId || !organizationId) return

    setIsCommitting(true)
    try {
      // Sync the staged files to the team workspace
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

      // Log the commit in team_activity
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
    } catch (error: any) {
      toast.error(error.message || "Commit failed")
    } finally {
      setIsCommitting(false)
    }
  }

  // Push (same as commit but also refreshes)
  const handlePush = async () => {
    if (stagedFiles.length === 0 && unstagedFiles.length === 0) {
      toast.info("Nothing to push - workspace is up to date")
      return
    }

    // If there are unstaged files but no staged, stage all first
    if (stagedFiles.length === 0 && unstagedFiles.length > 0) {
      stageAll()
      toast.info("All changes staged. Enter a commit message and commit first.")
      return
    }

    if (!commitMessage.trim()) {
      toast.error("Enter a commit message before pushing")
      return
    }

    setIsPushing(true)
    try {
      await handleCommit()
      toast.success("Changes pushed to team workspace")
    } finally {
      setIsPushing(false)
    }
  }

  // Generate diff markdown for a file
  const generateDiffMarkdown = (file: FileChange): string => {
    const lines: string[] = []
    lines.push(`# ${file.status === "added" ? "New File" : file.status === "deleted" ? "Deleted File" : "Modified File"}: \`${file.path}\`\n`)
    lines.push(`**Status:** ${file.status.charAt(0).toUpperCase() + file.status.slice(1)}\n`)

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

  // Generate commit detail markdown
  const generateCommitMarkdown = (commit: CommitEntry): string => {
    const lines: string[] = []
    lines.push(`# Commit: ${commit.message}\n`)
    lines.push(`**Author:** ${commit.author_name}`)
    lines.push(`**Date:** ${new Date(commit.created_at).toLocaleString()}`)
    lines.push(`**Files changed:** ${commit.file_count}\n`)

    if (commit.files.length > 0) {
      lines.push("## Changed Files\n")
      for (const file of commit.files) {
        const f = typeof file === "string" ? { path: file, status: "modified" } : file
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
      {/* Tab Switcher */}
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
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Commit message..."
              className="w-full h-16 resize-none rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2 text-xs text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50 transition-colors"
            />
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
                Commit ({stagedFiles.length})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handlePush}
                disabled={isPushing || totalChanges === 0}
                className="h-7 text-xs border-gray-700 text-gray-300 hover:text-orange-400 hover:border-orange-500/50 disabled:opacity-30"
              >
                {isPushing ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <ArrowUp className="w-3 h-3 mr-1" />
                )}
                Push
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
                  {/* Commit node */}
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
                        <span className="text-[10px] text-gray-600">
                          {formatTimeAgo(commit.created_at)}
                        </span>
                        <span className="text-[10px] text-gray-600">
                          {commit.file_count} file
                          {commit.file_count !== 1 ? "s" : ""}
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
                      {expandedCommit === commit.id ? (
                        <ChevronDown className="w-3 h-3 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-gray-500" />
                      )}
                    </div>
                  </button>

                  {/* Expanded file list */}
                  {expandedCommit === commit.id && commit.files.length > 0 && (
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
                                `# ${fileStatus === "added" ? "Added" : fileStatus === "deleted" ? "Deleted" : "Modified"}: \`${filePath}\`\n\nPart of commit: **${commit.message}**\nBy ${commit.author_name} at ${new Date(commit.created_at).toLocaleString()}`
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
