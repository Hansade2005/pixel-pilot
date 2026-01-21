"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  Github,
  GitBranch,
  ChevronDown,
  Bot,
  FolderGit2,
  Search,
  Circle,
  ArrowUp,
  Sparkles,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAgentCloud, MODELS } from "../layout"

export default function NewSessionPage() {
  const router = useRouter()
  const {
    repos,
    selectedRepo,
    setSelectedRepo,
    branches,
    selectedBranch,
    setSelectedBranch,
    selectedModel,
    setSelectedModel,
    isConnected,
    isLoadingTokens,
    isLoadingRepos,
    isLoadingBranches,
    loadBranches,
    createSession,
    setActiveSessionId,
    isCreating,
  } = useAgentCloud()

  const [prompt, setPrompt] = useState('')
  const [repoSearchQuery, setRepoSearchQuery] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Filter repos by search
  const filteredRepos = repoSearchQuery
    ? repos.filter(repo =>
        repo.name.toLowerCase().includes(repoSearchQuery.toLowerCase()) ||
        repo.full_name.toLowerCase().includes(repoSearchQuery.toLowerCase())
      )
    : repos

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 56), 200)
    textarea.style.height = `${newHeight}px`
  }, [prompt])

  // Handle repo selection
  const selectRepo = (repo: typeof repos[0]) => {
    setSelectedRepo(repo)
    loadBranches(repo.full_name)
    setRepoSearchQuery('')
  }

  // Handle submit
  const handleSubmit = async () => {
    if (!prompt.trim() || !selectedRepo || isCreating) return

    const session = await createSession(prompt.trim())
    if (session) {
      // Navigate to the new session
      router.push(`/agent-cloud/session?id=${session.id}`)
    }
  }

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-600/20 inline-block mb-4">
            <Bot className="h-12 w-12 text-orange-500" />
          </div>
          <h1 className="text-2xl font-semibold mb-2">Start a new session</h1>
          <p className="text-zinc-500 text-sm">
            Select a repository and describe what you want to build
          </p>
        </div>

        {/* Chat input card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          {/* Textarea */}
          <div className="p-4">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Claude to write code..."
              disabled={!selectedRepo || isCreating}
              className="w-full bg-transparent resize-none outline-none text-sm text-zinc-100 placeholder:text-zinc-500 min-h-[56px] max-h-[200px] leading-6"
              rows={2}
            />
          </div>

          {/* Bottom toolbar */}
          <div className="px-4 pb-4 flex items-center justify-between gap-4">
            {/* Left - Repo/Branch/Model selectors */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Repo selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-800">
                    <Github className="h-3.5 w-3.5" />
                    <span className="max-w-[100px] truncate">
                      {selectedRepo ? selectedRepo.name : 'Select repo'}
                    </span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-72 bg-zinc-900 border-zinc-800 max-h-80 overflow-hidden">
                  {isLoadingTokens || isLoadingRepos ? (
                    <div className="p-4 text-center text-zinc-500 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                      <span>Loading...</span>
                    </div>
                  ) : !isConnected ? (
                    <div className="p-4 text-center text-zinc-500 text-sm">
                      <Github className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <p className="mb-2">GitHub not connected</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.href = '/workspace/deployment'}
                        className="text-xs"
                      >
                        Connect GitHub
                      </Button>
                    </div>
                  ) : repos.length === 0 ? (
                    <div className="p-4 text-center text-zinc-500 text-sm">
                      No repositories found
                    </div>
                  ) : (
                    <>
                      {/* Search */}
                      <div className="p-2 border-b border-zinc-800">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                          <input
                            type="text"
                            placeholder="Search..."
                            value={repoSearchQuery}
                            onChange={(e) => setRepoSearchQuery(e.target.value)}
                            className="w-full bg-zinc-800/50 border border-zinc-700 rounded-md pl-8 pr-3 py-1.5 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-60">
                        {filteredRepos.map(repo => (
                          <DropdownMenuItem
                            key={repo.id}
                            onClick={() => selectRepo(repo)}
                            className="flex items-center gap-2 cursor-pointer py-2.5"
                          >
                            <FolderGit2 className="h-4 w-4 text-zinc-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-medium">{repo.name}</span>
                                {repo.private && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                                    private
                                  </Badge>
                                )}
                              </div>
                              {repo.description && (
                                <div className="text-xs text-zinc-500 truncate">{repo.description}</div>
                              )}
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </div>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Branch selector */}
              {selectedRepo && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-800">
                      <GitBranch className="h-3.5 w-3.5" />
                      <span>{selectedBranch}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-zinc-900 border-zinc-800 max-h-60 overflow-y-auto">
                    {isLoadingBranches ? (
                      <div className="p-2 text-center">
                        <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                      </div>
                    ) : branches.length === 0 ? (
                      <div className="p-2 text-center text-zinc-500 text-xs">
                        No branches
                      </div>
                    ) : (
                      branches.map(branch => (
                        <DropdownMenuItem
                          key={branch}
                          onClick={() => setSelectedBranch(branch)}
                          className="cursor-pointer font-mono text-sm"
                        >
                          {branch}
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Model selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-800">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{MODELS.find(m => m.id === selectedModel)?.name}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
                  {MODELS.map(model => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className="cursor-pointer"
                    >
                      <div>
                        <div className="font-medium">{model.name}</div>
                        <div className="text-xs text-zinc-500">{model.description}</div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Right - Submit button */}
            <Button
              onClick={handleSubmit}
              disabled={!prompt.trim() || !selectedRepo || isCreating}
              size="icon"
              className="h-9 w-9 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shrink-0 disabled:opacity-40 disabled:bg-zinc-700"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Helper text */}
        <div className="flex items-center justify-center mt-3 text-[10px] text-zinc-600">
          <span>Press</span>
          <kbd className="mx-1 px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-500 font-mono">
            Enter
          </kbd>
          <span>to send,</span>
          <kbd className="mx-1 px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-500 font-mono">
            Shift + Enter
          </kbd>
          <span>for new line</span>
        </div>
      </div>
    </div>
  )
}
