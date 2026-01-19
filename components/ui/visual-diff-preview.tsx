"use client"

import * as React from "react"
import { useState, useMemo, useCallback } from "react"
import { Check, X, ChevronDown, ChevronUp, FileText, Copy, Edit3, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface DiffLine {
  type: "unchanged" | "added" | "removed" | "context"
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

interface FileChange {
  path: string
  oldContent: string
  newContent: string
  operation: "create" | "edit" | "delete"
}

interface VisualDiffPreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileChanges: FileChange[]
  onApprove: (changes: FileChange[]) => void
  onReject: () => void
  onEditAndApply?: (changes: FileChange[]) => void
  title?: string
  description?: string
}

// Compute diff between two strings
function computeDiff(oldContent: string, newContent: string): DiffLine[] {
  const oldLines = oldContent.split("\n")
  const newLines = newContent.split("\n")
  const diff: DiffLine[] = []

  // Simple LCS-based diff algorithm
  const lcs = computeLCS(oldLines, newLines)
  let oldIndex = 0
  let newIndex = 0
  let lcsIndex = 0

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (lcsIndex < lcs.length && oldIndex < oldLines.length && oldLines[oldIndex] === lcs[lcsIndex]) {
      if (newIndex < newLines.length && newLines[newIndex] === lcs[lcsIndex]) {
        // Unchanged line
        diff.push({
          type: "unchanged",
          content: oldLines[oldIndex],
          oldLineNumber: oldIndex + 1,
          newLineNumber: newIndex + 1,
        })
        oldIndex++
        newIndex++
        lcsIndex++
      } else {
        // Added line
        diff.push({
          type: "added",
          content: newLines[newIndex],
          newLineNumber: newIndex + 1,
        })
        newIndex++
      }
    } else if (oldIndex < oldLines.length && (lcsIndex >= lcs.length || oldLines[oldIndex] !== lcs[lcsIndex])) {
      // Removed line
      diff.push({
        type: "removed",
        content: oldLines[oldIndex],
        oldLineNumber: oldIndex + 1,
      })
      oldIndex++
    } else if (newIndex < newLines.length) {
      // Added line
      diff.push({
        type: "added",
        content: newLines[newIndex],
        newLineNumber: newIndex + 1,
      })
      newIndex++
    }
  }

  return diff
}

// Compute Longest Common Subsequence
function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to find LCS
  const lcs: string[] = []
  let i = m
  let j = n
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1])
      i--
      j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  return lcs
}

// Single file diff component
function FileDiff({ change, isExpanded, onToggle }: {
  change: FileChange
  isExpanded: boolean
  onToggle: () => void
}) {
  const diff = useMemo(() => {
    if (change.operation === "create") {
      return change.newContent.split("\n").map((line, i) => ({
        type: "added" as const,
        content: line,
        newLineNumber: i + 1,
      }))
    }
    if (change.operation === "delete") {
      return change.oldContent.split("\n").map((line, i) => ({
        type: "removed" as const,
        content: line,
        oldLineNumber: i + 1,
      }))
    }
    return computeDiff(change.oldContent, change.newContent)
  }, [change])

  const stats = useMemo(() => {
    const added = diff.filter((l) => l.type === "added").length
    const removed = diff.filter((l) => l.type === "removed").length
    return { added, removed }
  }, [diff])

  const getOperationBadge = () => {
    switch (change.operation) {
      case "create":
        return <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30">New</Badge>
      case "edit":
        return <Badge variant="default" className="bg-blue-500/20 text-blue-600 border-blue-500/30">Edit</Badge>
      case "delete":
        return <Badge variant="default" className="bg-red-500/20 text-red-600 border-red-500/30">Delete</Badge>
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* File header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{change.path}</span>
          {getOperationBadge()}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            {stats.added > 0 && (
              <span className="text-green-600">+{stats.added}</span>
            )}
            {stats.removed > 0 && (
              <span className="text-red-600">-{stats.removed}</span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Diff content */}
      {isExpanded && (
        <div className="max-h-[300px] overflow-auto font-mono text-xs">
          {diff.map((line, index) => (
            <div
              key={index}
              className={cn(
                "flex border-b border-border/50 last:border-b-0",
                line.type === "added" && "bg-green-500/10",
                line.type === "removed" && "bg-red-500/10",
                line.type === "unchanged" && "bg-transparent"
              )}
            >
              {/* Line numbers */}
              <div className="flex-shrink-0 w-20 flex text-muted-foreground select-none border-r border-border/50">
                <span className="w-10 px-2 py-0.5 text-right border-r border-border/50">
                  {line.oldLineNumber || ""}
                </span>
                <span className="w-10 px-2 py-0.5 text-right">
                  {line.newLineNumber || ""}
                </span>
              </div>
              {/* Line content */}
              <div className="flex-1 px-2 py-0.5 whitespace-pre overflow-x-auto">
                <span
                  className={cn(
                    line.type === "added" && "text-green-600",
                    line.type === "removed" && "text-red-600"
                  )}
                >
                  {line.type === "added" && "+ "}
                  {line.type === "removed" && "- "}
                  {line.type === "unchanged" && "  "}
                  {line.content}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function VisualDiffPreview({
  open,
  onOpenChange,
  fileChanges,
  onApprove,
  onReject,
  onEditAndApply,
  title = "Review Changes",
  description = "Review the proposed changes before applying them to your project.",
}: VisualDiffPreviewProps) {
  const { toast } = useToast()
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
  const [showUnchanged, setShowUnchanged] = useState(false)

  // Expand all files by default
  React.useEffect(() => {
    if (open && fileChanges.length > 0) {
      setExpandedFiles(new Set(fileChanges.map((c) => c.path)))
    }
  }, [open, fileChanges])

  const toggleFile = useCallback((path: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const totalStats = useMemo(() => {
    let added = 0
    let removed = 0
    fileChanges.forEach((change) => {
      if (change.operation === "create") {
        added += change.newContent.split("\n").length
      } else if (change.operation === "delete") {
        removed += change.oldContent.split("\n").length
      } else {
        const diff = computeDiff(change.oldContent, change.newContent)
        added += diff.filter((l) => l.type === "added").length
        removed += diff.filter((l) => l.type === "removed").length
      }
    })
    return { added, removed, files: fileChanges.length }
  }, [fileChanges])

  const handleApprove = () => {
    onApprove(fileChanges)
    onOpenChange(false)
    toast({
      title: "Changes Applied",
      description: `Successfully applied changes to ${fileChanges.length} file(s).`,
    })
  }

  const handleReject = () => {
    onReject()
    onOpenChange(false)
    toast({
      title: "Changes Rejected",
      description: "The proposed changes were not applied.",
    })
  }

  const handleCopyDiff = () => {
    const diffText = fileChanges
      .map((change) => {
        const header = `--- ${change.path}\n+++ ${change.path}\n`
        const diff = computeDiff(change.oldContent, change.newContent)
        const lines = diff
          .map((line) => {
            if (line.type === "added") return `+ ${line.content}`
            if (line.type === "removed") return `- ${line.content}`
            return `  ${line.content}`
          })
          .join("\n")
        return header + lines
      })
      .join("\n\n")

    navigator.clipboard.writeText(diffText)
    toast({
      title: "Diff Copied",
      description: "The diff has been copied to your clipboard.",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Stats bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              {totalStats.files} file{totalStats.files !== 1 ? "s" : ""} changed
            </span>
            <span className="text-green-600">+{totalStats.added} additions</span>
            <span className="text-red-600">-{totalStats.removed} deletions</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyDiff}
              className="h-7 px-2 text-xs"
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy Diff
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUnchanged(!showUnchanged)}
              className="h-7 px-2 text-xs"
            >
              {showUnchanged ? (
                <EyeOff className="h-3 w-3 mr-1" />
              ) : (
                <Eye className="h-3 w-3 mr-1" />
              )}
              {showUnchanged ? "Hide" : "Show"} Context
            </Button>
          </div>
        </div>

        {/* File diffs */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-3 p-1">
            {fileChanges.map((change) => (
              <FileDiff
                key={change.path}
                change={change}
                isExpanded={expandedFiles.has(change.path)}
                onToggle={() => toggleFile(change.path)}
              />
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleReject}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            Reject
          </Button>
          {onEditAndApply && (
            <Button
              variant="outline"
              onClick={() => onEditAndApply(fileChanges)}
              className="gap-1"
            >
              <Edit3 className="h-4 w-4" />
              Edit & Apply
            </Button>
          )}
          <Button
            variant="default"
            onClick={handleApprove}
            className="gap-1 bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4" />
            Apply All ({fileChanges.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
