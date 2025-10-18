"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, User, Bot, Code, Eye, Rocket } from "lucide-react"

const demoMessages = [
  {
    role: "user" as const,
    content: "I want to build a todo app with a clean design",
    timestamp: "2:34 PM",
  },
  {
    role: "assistant" as const,
    content:
      "I'll help you build a beautiful todo app! Let me create a modern interface with task management features.",
    timestamp: "2:34 PM",
  },
  {
    role: "system" as const,
    content: "Generated: TodoApp.tsx, TaskList.tsx, AddTask.tsx",
    timestamp: "2:35 PM",
  },
  {
    role: "user" as const,
    content: "Can you add dark mode support?",
    timestamp: "2:36 PM",
  },
  {
    role: "assistant" as const,
    content:
      "I've added a theme toggle and dark mode styles. Your app now supports both light and dark themes seamlessly.",
    timestamp: "2:36 PM",
  },
]

export function ChatDemo() {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    if (isPlaying && currentMessageIndex < demoMessages.length - 1) {
      const timer = setTimeout(() => {
        setCurrentMessageIndex((prev) => prev + 1)
      }, 2000)
      return () => clearTimeout(timer)
    } else if (currentMessageIndex >= demoMessages.length - 1) {
      setIsPlaying(false)
    }
  }, [currentMessageIndex, isPlaying])

  const startDemo = () => {
    setCurrentMessageIndex(0)
    setIsPlaying(true)
  }

  const resetDemo = () => {
    setCurrentMessageIndex(0)
    setIsPlaying(false)
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Chat Interface */}
        <Card className="h-96 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-accent" />
              <span className="font-semibold">AI Assistant</span>
            </div>
            <Badge variant="secondary">Live Demo</Badge>
          </div>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {demoMessages.slice(0, currentMessageIndex + 1).map((message, index) => (
                  <div
                    key={index}
                    className={`flex items-start space-x-3 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role !== "user" && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
                        {message.role === "assistant" ? (
                          <Bot className="h-4 w-4 text-accent" />
                        ) : (
                          <Code className="h-4 w-4 text-accent" />
                        )}
                      </div>
                    )}
                    <div
                      className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                        message.role === "user"
                          ? "bg-accent text-accent-foreground"
                          : message.role === "system"
                            ? "bg-muted text-muted-foreground text-sm"
                            : "bg-card border border-border"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
                    </div>
                    {message.role === "user" && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card className="h-96">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="text-accent">
                <Code className="h-4 w-4 mr-2" />
                Code
              </Button>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button variant="ghost" size="sm">
                <Rocket className="h-4 w-4 mr-2" />
                Deploy
              </Button>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="bg-muted rounded-lg p-4 h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-accent/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Code className="h-8 w-8 text-accent" />
                </div>
                <h3 className="font-semibold mb-2">Live Preview</h3>
                <p className="text-sm text-muted-foreground">Your app appears here as you build it</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Demo Controls */}
      <div className="flex justify-center mt-8 space-x-4">
        <Button onClick={startDemo} disabled={isPlaying}>
          {isPlaying ? "Playing..." : "Start Demo"}
        </Button>
        <Button variant="outline" onClick={resetDemo}>
          Reset
        </Button>
      </div>
    </div>
  )
}
