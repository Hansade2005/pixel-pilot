"use client"

import { useState, useRef, useEffect, useCallback, forwardRef } from "react"
import { cn } from "@/lib/utils"
import {
  Send,
  Loader2,
  Image as ImageIcon,
  Github,
  GitBranch,
  ChevronDown,
  MoreHorizontal,
  ArrowUp,
  Paperclip,
  AtSign,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface PremiumChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  disabled?: boolean
  isLoading?: boolean
  autoFocus?: boolean
  variant?: "main" | "sidebar"
  repo?: {
    name: string
    full_name: string
  } | null
  branch?: string
  model?: string
  onRepoClick?: () => void
  onBranchClick?: () => void
  onModelClick?: () => void
  className?: string
}

export const PremiumChatInput = forwardRef<HTMLTextAreaElement, PremiumChatInputProps>(
  function PremiumChatInput(
    {
      value,
      onChange,
      onSubmit,
      placeholder = "Ask Claude to write code...",
      disabled = false,
      isLoading = false,
      autoFocus = false,
      variant = "main",
      repo,
      branch,
      model,
      onRepoClick,
      onBranchClick,
      onModelClick,
      className,
    },
    forwardedRef
  ) {
    const internalRef = useRef<HTMLTextAreaElement>(null)
    const textareaRef = (forwardedRef as React.RefObject<HTMLTextAreaElement>) || internalRef
    const [isFocused, setIsFocused] = useState(false)
    const [rows, setRows] = useState(1)

    // Auto-resize textarea
    const adjustHeight = useCallback(() => {
      const textarea = textareaRef.current
      if (!textarea) return

      textarea.style.height = "auto"
      const scrollHeight = textarea.scrollHeight
      const lineHeight = 24 // Approximate line height
      const maxRows = 8
      const minRows = variant === "sidebar" ? 3 : 1

      const calculatedRows = Math.min(
        maxRows,
        Math.max(minRows, Math.ceil(scrollHeight / lineHeight))
      )
      setRows(calculatedRows)
      textarea.style.height = `${calculatedRows * lineHeight}px`
    }, [variant, textareaRef])

    useEffect(() => {
      adjustHeight()
    }, [value, adjustHeight])

    useEffect(() => {
      if (autoFocus && textareaRef.current) {
        textareaRef.current.focus()
      }
    }, [autoFocus, textareaRef])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        if (value.trim() && !disabled && !isLoading) {
          onSubmit()
        }
      }
    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value)
    }

    const isMainVariant = variant === "main"

    return (
      <div
        className={cn(
          "relative group",
          className
        )}
      >
        {/* Main input container */}
        <div
          className={cn(
            "relative rounded-2xl transition-all duration-200",
            "bg-zinc-900/80 backdrop-blur-sm",
            "border border-zinc-800/80",
            isFocused && "border-zinc-700 ring-1 ring-zinc-700/50 bg-zinc-900",
            disabled && "opacity-60 cursor-not-allowed"
          )}
        >
          {/* Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              disabled={disabled || isLoading}
              rows={rows}
              className={cn(
                "w-full bg-transparent resize-none outline-none",
                "text-sm text-zinc-100 placeholder:text-zinc-500",
                "font-sans leading-6",
                "scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent",
                isMainVariant
                  ? "px-4 pt-3.5 pb-12"
                  : "px-4 pt-3 pb-14",
                disabled && "cursor-not-allowed"
              )}
              style={{
                minHeight: isMainVariant ? "52px" : "80px",
                maxHeight: "192px",
              }}
            />
          </div>

          {/* Bottom toolbar */}
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 flex items-center justify-between",
              "px-3 pb-2.5 pt-1"
            )}
          >
            {/* Left side - Action buttons */}
            <div className="flex items-center gap-1">
              {/* Attachment button */}
              <button
                type="button"
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60",
                  "focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-600"
                )}
                onClick={() => {}}
                disabled={disabled}
              >
                <ImageIcon className="h-4 w-4" />
              </button>

              {/* More options */}
              <button
                type="button"
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60",
                  "focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-600"
                )}
                onClick={() => {}}
                disabled={disabled}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>

            {/* Center - Repo/Branch/Model selectors (sidebar variant) */}
            {!isMainVariant && (repo || branch || model) && (
              <div className="flex items-center gap-2 text-xs">
                {repo && (
                  <button
                    type="button"
                    onClick={onRepoClick}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
                      "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60",
                      "max-w-[120px]"
                    )}
                  >
                    <Github className="h-3 w-3 shrink-0" />
                    <span className="truncate font-mono">{repo.name}</span>
                  </button>
                )}
                {branch && (
                  <button
                    type="button"
                    onClick={onBranchClick}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md transition-colors",
                      "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
                    )}
                  >
                    <GitBranch className="h-3 w-3" />
                    <span className="font-mono">{branch}</span>
                  </button>
                )}
                {model && (
                  <button
                    type="button"
                    onClick={onModelClick}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md transition-colors",
                      "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
                    )}
                  >
                    <Sparkles className="h-3 w-3" />
                    <span className="font-mono">{model}</span>
                  </button>
                )}
              </div>
            )}

            {/* Right side - Submit button */}
            <div className="flex items-center gap-2">
              {/* Main variant repo indicator */}
              {isMainVariant && repo && (
                <button
                  type="button"
                  onClick={onRepoClick}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
                    "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60",
                    "text-xs"
                  )}
                >
                  <Github className="h-3 w-3" />
                  <span className="font-mono max-w-[100px] truncate">{repo.name}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
              )}

              {/* Submit button */}
              <Button
                type="button"
                onClick={onSubmit}
                disabled={!value.trim() || disabled || isLoading}
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-lg transition-all duration-200",
                  "bg-orange-500/90 hover:bg-orange-500",
                  "text-white shadow-lg shadow-orange-500/20",
                  "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none",
                  "disabled:bg-zinc-700 disabled:text-zinc-500",
                  value.trim() && !disabled && !isLoading && "scale-100",
                  (!value.trim() || disabled || isLoading) && "scale-95"
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Helper text for main variant */}
        {isMainVariant && (
          <div className="flex items-center justify-center mt-2 text-[10px] text-zinc-600">
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
        )}
      </div>
    )
  }
)

export default PremiumChatInput
