"use client"

import * as React from "react"
import { useState, useEffect, useRef, useMemo } from "react"
import { cn } from "@/lib/utils"

interface StreamingTextProps {
  content: string
  isStreaming?: boolean
  typewriterSpeed?: number // Characters per second
  showCursor?: boolean
  className?: string
  onComplete?: () => void
}

// Typewriter effect component
export function StreamingText({
  content,
  isStreaming = false,
  typewriterSpeed = 50, // Default 50 chars/sec for natural feel
  showCursor = true,
  className,
  onComplete,
}: StreamingTextProps) {
  const [displayedContent, setDisplayedContent] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const targetContentRef = useRef(content)
  const animationFrameRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  useEffect(() => {
    targetContentRef.current = content

    if (isStreaming) {
      setIsTyping(true)

      const animate = (timestamp: number) => {
        if (!lastTimeRef.current) lastTimeRef.current = timestamp

        const elapsed = timestamp - lastTimeRef.current
        const charsToAdd = Math.floor((elapsed * typewriterSpeed) / 1000)

        if (charsToAdd > 0) {
          lastTimeRef.current = timestamp

          setDisplayedContent((prev) => {
            const target = targetContentRef.current
            if (prev.length >= target.length) {
              setIsTyping(false)
              onComplete?.()
              return target
            }

            const nextLength = Math.min(prev.length + charsToAdd, target.length)
            return target.slice(0, nextLength)
          })
        }

        if (displayedContent.length < targetContentRef.current.length) {
          animationFrameRef.current = requestAnimationFrame(animate)
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    } else {
      // Not streaming - show content immediately
      setDisplayedContent(content)
      setIsTyping(false)
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [content, isStreaming, typewriterSpeed, onComplete])

  // Reset when content changes significantly
  useEffect(() => {
    if (!isStreaming && content !== displayedContent) {
      setDisplayedContent(content)
    }
  }, [content, isStreaming, displayedContent])

  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {displayedContent}
      {showCursor && isTyping && (
        <span className="inline-block w-0.5 h-4 ml-0.5 bg-primary animate-pulse" />
      )}
    </span>
  )
}

// Code block with syntax highlighting as it streams
interface StreamingCodeBlockProps {
  code: string
  language?: string
  isStreaming?: boolean
  className?: string
}

export function StreamingCodeBlock({
  code,
  language = "typescript",
  isStreaming = false,
  className,
}: StreamingCodeBlockProps) {
  const [displayedCode, setDisplayedCode] = useState("")
  const codeRef = useRef(code)
  const indexRef = useRef(0)

  useEffect(() => {
    codeRef.current = code

    if (isStreaming && indexRef.current < code.length) {
      const interval = setInterval(() => {
        setDisplayedCode((prev) => {
          const target = codeRef.current
          if (indexRef.current >= target.length) {
            clearInterval(interval)
            return target
          }

          // Add characters in chunks for performance
          const chunkSize = Math.min(5, target.length - indexRef.current)
          const nextContent = target.slice(0, indexRef.current + chunkSize)
          indexRef.current += chunkSize
          return nextContent
        })
      }, 16) // ~60fps

      return () => clearInterval(interval)
    } else if (!isStreaming) {
      setDisplayedCode(code)
      indexRef.current = code.length
    }
  }, [code, isStreaming])

  // Basic syntax highlighting
  const highlightedCode = useMemo(() => {
    return highlightCode(displayedCode, language)
  }, [displayedCode, language])

  return (
    <div className={cn("relative rounded-md overflow-hidden", className)}>
      {/* Language badge */}
      <div className="absolute top-2 right-2 text-[10px] text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded">
        {language}
      </div>

      {/* Code content */}
      <pre className="p-4 bg-muted/50 overflow-x-auto text-sm">
        <code
          className="font-mono"
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
        {isStreaming && indexRef.current < codeRef.current.length && (
          <span className="inline-block w-0.5 h-4 bg-primary animate-pulse" />
        )}
      </pre>
    </div>
  )
}

// Simple syntax highlighting function
function highlightCode(code: string, language: string): string {
  // Escape HTML
  let escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

  // Keywords
  const keywords = [
    "const", "let", "var", "function", "return", "if", "else", "for", "while",
    "class", "extends", "import", "export", "from", "default", "async", "await",
    "try", "catch", "throw", "new", "this", "super", "static", "public", "private",
    "interface", "type", "enum", "implements", "readonly", "as", "typeof", "instanceof",
  ]

  // Highlight keywords
  keywords.forEach((keyword) => {
    const regex = new RegExp(`\\b(${keyword})\\b`, "g")
    escaped = escaped.replace(regex, '<span class="text-purple-500">$1</span>')
  })

  // Highlight strings
  escaped = escaped.replace(
    /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
    '<span class="text-green-500">$&</span>'
  )

  // Highlight numbers
  escaped = escaped.replace(
    /\b(\d+(?:\.\d+)?)\b/g,
    '<span class="text-orange-500">$1</span>'
  )

  // Highlight comments
  escaped = escaped.replace(
    /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
    '<span class="text-muted-foreground italic">$1</span>'
  )

  // Highlight function calls
  escaped = escaped.replace(
    /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
    '<span class="text-blue-500">$1</span>('
  )

  return escaped
}

// Streaming message wrapper with markdown support
interface StreamingMessageProps {
  content: string
  isStreaming?: boolean
  className?: string
}

export function StreamingMessage({
  content,
  isStreaming = false,
  className,
}: StreamingMessageProps) {
  // Split content into text and code blocks
  const parts = useMemo(() => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    const parts: Array<{ type: "text" | "code"; content: string; language?: string }> = []
    let lastIndex = 0
    let match

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: content.slice(lastIndex, match.index),
        })
      }

      // Add code block
      parts.push({
        type: "code",
        content: match[2],
        language: match[1] || "text",
      })

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        type: "text",
        content: content.slice(lastIndex),
      })
    }

    return parts
  }, [content])

  return (
    <div className={cn("space-y-3", className)}>
      {parts.map((part, index) => {
        if (part.type === "code") {
          return (
            <StreamingCodeBlock
              key={index}
              code={part.content}
              language={part.language}
              isStreaming={isStreaming && index === parts.length - 1}
            />
          )
        }

        return (
          <StreamingText
            key={index}
            content={part.content}
            isStreaming={isStreaming && index === parts.length - 1}
            showCursor={index === parts.length - 1}
          />
        )
      })}
    </div>
  )
}
