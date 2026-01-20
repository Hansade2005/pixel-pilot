"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useRef } from "react"
import {
  Search,
  FileCode,
  X,
  ChevronDown,
  ChevronRight,
  Plus,
  Replace,
  Check,
  Loader2,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

// Search result item
export interface SearchResult {
  id: string
  filePath: string
  fileName: string
  lineNumber: number
  lineContent: string
  matchStart: number
  matchEnd: number
  context: {
    before: string[]
    after: string[]
  }
}

// File with multiple results
interface FileResults {
  filePath: string
  fileName: string
  results: SearchResult[]
  isExpanded: boolean
}

// Attached context item (to be shown as pill)
export interface AttachedSearchContext {
  id: string
  filePath: string
  lineNumber: number
  content: string
  type: 'search-result'
}

interface CodebaseSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string | null
  onOpenFile?: (filePath: string, lineNumber?: number) => void
  onAttachContext?: (context: AttachedSearchContext) => void
  attachedContexts?: AttachedSearchContext[]
  onRemoveContext?: (id: string) => void
}

export function CodebaseSearch({
  open,
  onOpenChange,
  projectId,
  onOpenFile,
  onAttachContext,
  attachedContexts = [],
  onRemoveContext,
}: CodebaseSearchProps) {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [replaceQuery, setReplaceQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [isReplacing, setIsReplacing] = useState(false)
  const [results, setResults] = useState<FileResults[]>([])
  const [totalMatches, setTotalMatches] = useState(0)
  const [activeTab, setActiveTab] = useState<"search" | "replace">("search")

  // Search options
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [includePattern, setIncludePattern] = useState("")
  const [excludePattern, setExcludePattern] = useState("node_modules,dist,.git,.next")

  // Replace state
  const [replacePreview, setReplacePreview] = useState<{
    filePath: string
    originalContent: string
    newContent: string
    matchCount: number
  }[]>([])
  const [selectedFilesForReplace, setSelectedFilesForReplace] = useState<Set<string>>(new Set())
  const [replaceProgress, setReplaceProgress] = useState<{ current: number; total: number } | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)

  // Focus search input when dialog opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [open])

  // Build regex from search query
  const buildSearchRegex = useCallback((query: string): RegExp | null => {
    if (!query.trim()) return null

    try {
      let pattern = query

      if (!useRegex) {
        // Escape special regex characters
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      }

      if (wholeWord) {
        pattern = `\\b${pattern}\\b`
      }

      const flags = caseSensitive ? 'g' : 'gi'
      return new RegExp(pattern, flags)
    } catch (e) {
      return null
    }
  }, [caseSensitive, useRegex, wholeWord])

  // Check if file should be included based on patterns
  const shouldIncludeFile = useCallback((filePath: string): boolean => {
    // Check exclude patterns
    if (excludePattern) {
      const excludes = excludePattern.split(',').map(p => p.trim()).filter(Boolean)
      for (const exclude of excludes) {
        if (filePath.includes(exclude)) return false
      }
    }

    // Check include patterns
    if (includePattern) {
      const includes = includePattern.split(',').map(p => p.trim()).filter(Boolean)
      let matches = false
      for (const include of includes) {
        if (include.startsWith('*.')) {
          // Extension match
          const ext = include.slice(1)
          if (filePath.endsWith(ext)) matches = true
        } else if (filePath.includes(include)) {
          matches = true
        }
      }
      return matches
    }

    return true
  }, [includePattern, excludePattern])

  // Perform search across all project files
  const performSearch = useCallback(async () => {
    if (!projectId || !searchQuery.trim()) return

    const regex = buildSearchRegex(searchQuery)
    if (!regex) {
      toast({ title: 'Invalid regex', description: 'Please check your search pattern', variant: 'destructive' })
      return
    }

    setIsSearching(true)
    setResults([])
    setTotalMatches(0)

    try {
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()

      const files = await storageManager.getFiles(projectId)
      const fileResults: FileResults[] = []
      let totalCount = 0

      for (const file of files) {
        if (file.isDirectory || !file.content) continue
        if (!shouldIncludeFile(file.path)) continue

        const lines = file.content.split('\n')
        const searchResults: SearchResult[] = []

        lines.forEach((line, index) => {
          // Reset regex lastIndex for each line
          regex.lastIndex = 0
          let match

          while ((match = regex.exec(line)) !== null) {
            const contextBefore = lines.slice(Math.max(0, index - 2), index)
            const contextAfter = lines.slice(index + 1, Math.min(lines.length, index + 3))

            searchResults.push({
              id: `${file.path}-${index}-${match.index}`,
              filePath: file.path,
              fileName: file.path.split('/').pop() || file.path,
              lineNumber: index + 1,
              lineContent: line,
              matchStart: match.index,
              matchEnd: match.index + match[0].length,
              context: {
                before: contextBefore,
                after: contextAfter,
              },
            })
            totalCount++

            // Prevent infinite loop for zero-length matches
            if (match[0].length === 0) regex.lastIndex++
          }
        })

        if (searchResults.length > 0) {
          fileResults.push({
            filePath: file.path,
            fileName: file.path.split('/').pop() || file.path,
            results: searchResults,
            isExpanded: fileResults.length < 5, // Auto-expand first 5 files
          })
        }
      }

      setResults(fileResults)
      setTotalMatches(totalCount)

      if (totalCount === 0) {
        toast({ title: 'No matches found', description: `No results for "${searchQuery}"` })
      }
    } catch (error) {
      console.error('Search error:', error)
      toast({ title: 'Search failed', description: 'An error occurred during search', variant: 'destructive' })
    } finally {
      setIsSearching(false)
    }
  }, [projectId, searchQuery, buildSearchRegex, shouldIncludeFile, toast])

  // Preview replace changes
  const previewReplace = useCallback(async () => {
    if (!projectId || !searchQuery.trim()) return

    const regex = buildSearchRegex(searchQuery)
    if (!regex) return

    setIsReplacing(true)

    try {
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()

      const files = await storageManager.getFiles(projectId)
      const previews: typeof replacePreview = []

      for (const file of files) {
        if (file.isDirectory || !file.content) continue
        if (!shouldIncludeFile(file.path)) continue

        // Reset regex
        regex.lastIndex = 0
        const matches = file.content.match(regex)

        if (matches && matches.length > 0) {
          const newContent = file.content.replace(regex, replaceQuery)
          previews.push({
            filePath: file.path,
            originalContent: file.content,
            newContent,
            matchCount: matches.length,
          })
        }
      }

      setReplacePreview(previews)
      setSelectedFilesForReplace(new Set(previews.map(p => p.filePath)))
    } catch (error) {
      console.error('Preview error:', error)
      toast({ title: 'Preview failed', description: 'An error occurred', variant: 'destructive' })
    } finally {
      setIsReplacing(false)
    }
  }, [projectId, searchQuery, replaceQuery, buildSearchRegex, shouldIncludeFile, toast])

  // Execute replace across selected files
  const executeReplace = useCallback(async () => {
    if (selectedFilesForReplace.size === 0) {
      toast({ title: 'No files selected', description: 'Select files to replace', variant: 'destructive' })
      return
    }

    if (!projectId) {
      toast({ title: 'No project', description: 'Select a project first', variant: 'destructive' })
      return
    }

    setIsReplacing(true)
    setReplaceProgress({ current: 0, total: selectedFilesForReplace.size })

    try {
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()

      let replacedCount = 0
      let totalReplacements = 0
      const errors: string[] = []

      for (const preview of replacePreview) {
        if (!selectedFilesForReplace.has(preview.filePath)) continue

        try {
          // Use the correct API: updateFile(projectId, filePath, data)
          await storageManager.updateFile(projectId, preview.filePath, {
            content: preview.newContent,
            updatedAt: new Date().toISOString()
          })

          replacedCount++
          totalReplacements += preview.matchCount
          setReplaceProgress({ current: replacedCount, total: selectedFilesForReplace.size })
        } catch (fileError) {
          console.error(`Failed to update ${preview.filePath}:`, fileError)
          errors.push(preview.filePath)
        }
      }

      // Dispatch files-changed event to refresh file explorer
      window.dispatchEvent(new CustomEvent('files-changed', {
        detail: { projectId, forceRefresh: true }
      }))

      if (errors.length > 0) {
        toast({
          title: 'Replace partially completed',
          description: `Replaced ${totalReplacements} occurrences in ${replacedCount} files. Failed: ${errors.length}`,
          variant: 'destructive'
        })
      } else {
        toast({
          title: 'Replace completed',
          description: `Replaced ${totalReplacements} occurrences in ${replacedCount} files`,
        })
      }

      // Clear preview and reset
      setReplacePreview([])
      setSelectedFilesForReplace(new Set())
      setReplaceProgress(null)
    } catch (error) {
      console.error('Replace error:', error)
      toast({ title: 'Replace failed', description: 'An error occurred', variant: 'destructive' })
    } finally {
      setIsReplacing(false)
      setReplaceProgress(null)
    }
  }, [projectId, replacePreview, selectedFilesForReplace, toast])

  // Toggle file expansion
  const toggleFileExpansion = (filePath: string) => {
    setResults(prev => prev.map(f =>
      f.filePath === filePath ? { ...f, isExpanded: !f.isExpanded } : f
    ))
  }

  // Handle result click - open file
  const handleResultClick = (result: SearchResult) => {
    onOpenFile?.(result.filePath, result.lineNumber)
    // Don't close the dialog so user can continue searching
  }

  // Attach result as context
  const handleAttachContext = (result: SearchResult) => {
    const context: AttachedSearchContext = {
      id: result.id,
      filePath: result.filePath,
      lineNumber: result.lineNumber,
      content: result.lineContent.trim(),
      type: 'search-result',
    }
    onAttachContext?.(context)
    toast({ title: 'Context attached', description: `Added ${result.fileName}:${result.lineNumber}` })
  }

  // Check if result is already attached
  const isResultAttached = (resultId: string) => {
    return attachedContexts.some(c => c.id === resultId)
  }

  // Highlight match in line content
  const highlightMatch = (line: string, start: number, end: number) => {
    return (
      <>
        <span className="text-muted-foreground">{line.slice(0, start)}</span>
        <span className="bg-yellow-500/30 text-yellow-200 font-medium">{line.slice(start, end)}</span>
        <span className="text-muted-foreground">{line.slice(end)}</span>
      </>
    )
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (activeTab === 'search') {
        performSearch()
      } else {
        previewReplace()
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl h-[90vh] sm:h-[85vh] flex flex-col p-4 sm:p-6 z-[100]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            Codebase Search
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Search across your entire codebase with regex support.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'search' | 'replace')} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
            <TabsTrigger value="search" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Search className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Search</span>
            </TabsTrigger>
            <TabsTrigger value="replace" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Replace className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Search &</span> Replace
            </TabsTrigger>
          </TabsList>

          {/* Search Tab */}
          <TabsContent value="search" className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-2 sm:space-y-4 mt-2">
            {/* Search Input */}
            <div className="space-y-2 sm:space-y-3 flex-shrink-0">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    ref={searchInputRef}
                    placeholder="Search text or regex..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="font-mono text-sm h-9 sm:h-10"
                  />
                </div>
                <Button onClick={performSearch} disabled={isSearching || !searchQuery.trim()} className="h-9 sm:h-10 px-3">
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>

              {/* Search Options - Responsive */}
              <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={caseSensitive} onCheckedChange={(c) => setCaseSensitive(!!c)} className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Case</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={useRegex} onCheckedChange={(c) => setUseRegex(!!c)} className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Regex</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={wholeWord} onCheckedChange={(c) => setWholeWord(!!c)} className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Word</span>
                </label>
              </div>

              {/* File Filters - Collapsible */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <ChevronRight className="h-3 w-3" />
                  Filters
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Include</Label>
                      <Input
                        value={includePattern}
                        onChange={(e) => setIncludePattern(e.target.value)}
                        placeholder="*.tsx,*.ts"
                        className="h-7 sm:h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Exclude</Label>
                      <Input
                        value={excludePattern}
                        onChange={(e) => setExcludePattern(e.target.value)}
                        placeholder="node_modules"
                        className="h-7 sm:h-8 text-xs"
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Results Summary */}
            {totalMatches > 0 && (
              <div className="flex items-center justify-between text-xs sm:text-sm flex-shrink-0">
                <span className="text-muted-foreground">
                  <strong className="text-foreground">{totalMatches}</strong> matches in{" "}
                  <strong className="text-foreground">{results.length}</strong> files
                </span>
              </div>
            )}

            {/* Results List - Fixed height scrollable container */}
            <div className="flex-1 min-h-0 border rounded-md overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-2 space-y-1">
                  {results.length === 0 && !isSearching && (
                    <div className="text-center py-6 sm:py-8 text-muted-foreground">
                      <Search className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 opacity-20" />
                      <p className="text-xs sm:text-sm">Enter a search term and press Enter</p>
                    </div>
                  )}

                  {isSearching && (
                    <div className="text-center py-6 sm:py-8 text-muted-foreground">
                      <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin opacity-50" />
                      <p className="text-xs sm:text-sm">Searching...</p>
                    </div>
                  )}

                  {results.map((fileResult) => (
                    <Collapsible
                      key={fileResult.filePath}
                      open={fileResult.isExpanded}
                      onOpenChange={() => toggleFileExpansion(fileResult.filePath)}
                    >
                      <CollapsibleTrigger className="flex items-center gap-2 w-full p-1.5 sm:p-2 hover:bg-muted/50 rounded text-left">
                        {fileResult.isExpanded ? (
                          <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                        ) : (
                          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                        )}
                        <FileCode className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-blue-400" />
                        <span className="font-mono text-xs sm:text-sm truncate flex-1">{fileResult.filePath}</span>
                        <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5">
                          {fileResult.results.length}
                        </Badge>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="ml-4 sm:ml-6 border-l pl-2 sm:pl-4 space-y-0.5 sm:space-y-1">
                          {fileResult.results.map((result) => (
                            <div
                              key={result.id}
                              className="group flex items-start gap-1 sm:gap-2 py-1 px-1 sm:px-2 hover:bg-muted/30 rounded cursor-pointer"
                            >
                              <span className="text-[10px] sm:text-xs text-muted-foreground w-6 sm:w-8 text-right shrink-0 pt-0.5">
                                {result.lineNumber}
                              </span>
                              <div
                                className="flex-1 font-mono text-[10px] sm:text-xs overflow-hidden min-w-0"
                                onClick={() => handleResultClick(result)}
                              >
                                <code className="whitespace-pre-wrap break-all block">
                                  {highlightMatch(result.lineContent, result.matchStart, result.matchEnd)}
                                </code>
                              </div>
                              <div className="flex items-center gap-0.5 sm:gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 sm:h-6 sm:w-6 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleResultClick(result)
                                        }}
                                      >
                                        <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Open file</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                          "h-5 w-5 sm:h-6 sm:w-6 p-0",
                                          isResultAttached(result.id) && "text-green-500"
                                        )}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleAttachContext(result)
                                        }}
                                        disabled={isResultAttached(result.id)}
                                      >
                                        {isResultAttached(result.id) ? (
                                          <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                        ) : (
                                          <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {isResultAttached(result.id) ? 'Attached' : 'Attach'}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          </div>
          </TabsContent>

          {/* Replace Tab */}
          <TabsContent value="replace" className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-2 sm:space-y-4 mt-2">
            {/* Search and Replace Inputs */}
            <div className="space-y-2 sm:space-y-3 flex-shrink-0">
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <Label className="text-xs">Search</Label>
                  <Input
                    placeholder="Search text or regex..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="font-mono text-sm h-9 sm:h-10"
                  />
                </div>
                <div>
                  <Label className="text-xs">Replace with</Label>
                  <Input
                    placeholder="Replacement text..."
                    value={replaceQuery}
                    onChange={(e) => setReplaceQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="font-mono text-sm h-9 sm:h-10"
                  />
                </div>
              </div>

              {/* Options - Responsive */}
              <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={caseSensitive} onCheckedChange={(c) => setCaseSensitive(!!c)} className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Case</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={useRegex} onCheckedChange={(c) => setUseRegex(!!c)} className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Regex</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={wholeWord} onCheckedChange={(c) => setWholeWord(!!c)} className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Word</span>
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={previewReplace} disabled={isReplacing || !searchQuery.trim()} variant="outline" className="h-8 sm:h-9 text-xs sm:text-sm">
                  {isReplacing ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1 sm:mr-2" /> : null}
                  Preview
                </Button>
                {replacePreview.length > 0 && (
                  <Button onClick={executeReplace} disabled={isReplacing || selectedFilesForReplace.size === 0} className="h-8 sm:h-9 text-xs sm:text-sm">
                    <Replace className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Replace ({selectedFilesForReplace.size})
                  </Button>
                )}
              </div>
            </div>

            {/* Replace Preview */}
            {replacePreview.length > 0 && (
              <div className="space-y-2 flex-shrink-0">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {replacePreview.reduce((acc, p) => acc + p.matchCount, 0)} in {replacePreview.length} files
                  </span>
                  <div className="flex gap-1 sm:gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 sm:h-7 text-xs px-2"
                      onClick={() => setSelectedFilesForReplace(new Set(replacePreview.map(p => p.filePath)))}
                    >
                      All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 sm:h-7 text-xs px-2"
                      onClick={() => setSelectedFilesForReplace(new Set())}
                    >
                      None
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Replace Preview List - Fixed height scrollable */}
            <div className="flex-1 min-h-0 border rounded-md overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-2 space-y-1.5 sm:space-y-2">
                  {replacePreview.length === 0 && (
                    <div className="text-center py-6 sm:py-8 text-muted-foreground">
                      <Replace className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 opacity-20" />
                      <p className="text-xs sm:text-sm">Enter search and replace text</p>
                      <p className="text-[10px] sm:text-xs mt-1">Click "Preview" to see affected files</p>
                    </div>
                  )}

                  {replacePreview.map((preview) => (
                    <div
                      key={preview.filePath}
                      className={cn(
                        "p-2 sm:p-3 border rounded-md",
                        selectedFilesForReplace.has(preview.filePath)
                          ? "border-primary bg-primary/5"
                          : "border-muted"
                      )}
                    >
                      <label className="flex items-center gap-2 sm:gap-3 cursor-pointer">
                        <Checkbox
                          checked={selectedFilesForReplace.has(preview.filePath)}
                          onCheckedChange={(checked) => {
                            setSelectedFilesForReplace(prev => {
                              const next = new Set(prev)
                              if (checked) {
                                next.add(preview.filePath)
                              } else {
                                next.delete(preview.filePath)
                              }
                              return next
                            })
                          }}
                          className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                        />
                        <FileCode className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400 shrink-0" />
                        <span className="font-mono text-xs sm:text-sm flex-1 truncate min-w-0">{preview.filePath}</span>
                        <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0">{preview.matchCount}</Badge>
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Progress indicator during replace */}
            {replaceProgress && (
              <div className="space-y-2 flex-shrink-0">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">
                    Replacing... {replaceProgress.current}/{replaceProgress.total} files
                  </span>
                  <span className="font-mono">{Math.round((replaceProgress.current / replaceProgress.total) * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${(replaceProgress.current / replaceProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Attached Contexts Preview */}
        {attachedContexts.length > 0 && (
          <div className="border-t pt-2 sm:pt-3 mt-2 flex-shrink-0">
            <Label className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2 block">
              Attached ({attachedContexts.length})
            </Label>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {attachedContexts.map((ctx) => (
                <Badge
                  key={ctx.id}
                  variant="secondary"
                  className="text-[10px] sm:text-xs flex items-center gap-1 pr-1"
                >
                  <FileCode className="h-3 w-3" />
                  <span className="font-mono text-xs">
                    {ctx.filePath.split('/').pop()}:{ctx.lineNumber}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1 hover:bg-destructive/20"
                    onClick={() => onRemoveContext?.(ctx.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Search context pill component for displaying attached search results
export function SearchContextPill({
  context,
  onRemove,
  onClick,
}: {
  context: AttachedSearchContext
  onRemove?: () => void
  onClick?: () => void
}) {
  return (
    <Badge
      variant="outline"
      className="flex items-center gap-1 pr-1 cursor-pointer hover:bg-muted/50"
      onClick={onClick}
    >
      <Search className="h-3 w-3 text-purple-400" />
      <span className="font-mono text-xs max-w-32 truncate">
        {context.filePath.split('/').pop()}:{context.lineNumber}
      </span>
      {onRemove && (
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0 ml-1 hover:bg-destructive/20"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </Badge>
  )
}
