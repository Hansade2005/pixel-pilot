"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { CheckCircle, Play, Code, MessageSquare, FileText, Eye, FolderOpen, Plus } from "lucide-react"

export function AnimatedCodeDemo() {
  const [step, setStep] = useState(0)
  const [displayedCode, setDisplayedCode] = useState("")
  const [showResult, setShowResult] = useState(false)
  const [cursorBlink, setCursorBlink] = useState(true)
  const [messages, setMessages] = useState<string[]>([])
  const [fileExplorer, setFileExplorer] = useState<string[]>([])
  const [preview, setPreview] = useState<string>("")

  const codeSteps = [
    {
      code: `// Create a new React component
import React from 'react';

export function Button({ children, onClick }) {
  return (
    <button onClick={onClick} className="px-4 py-2 bg-blue-500 text-white rounded">
      {children}
    </button>
  );
}`,
      title: "Create Component",
      result: "✓ Component created successfully",
      file: "components/Button.tsx",
      preview: `<button style="padding: 1rem; background-color: rgb(59 130 246); color: white; border-radius: 0.25rem;">Click me</button>`,
      message: "AI: Generated a new Button component with click handler."
    },
    {
      code: `// Add props and styling
export function Button({ children, variant = 'primary', onClick }) {
  const styles = {
    primary: 'bg-blue-500 hover:bg-blue-600',
    secondary: 'bg-gray-500 hover:bg-gray-600'
  };

  return (
    <button onClick={onClick} className={\`px-4 py-2 text-white rounded \${styles[variant]}\`}>
      {children}
    </button>
  );
}`,
      title: "Enhance Component",
      result: "✓ Component enhanced with variants",
      file: "components/Button.tsx",
      preview: `<button style="padding: 1rem; background-color: rgb(59 130 246); color: white; border-radius: 0.25rem; margin-right: 0.5rem;">Primary</button>
<button style="padding: 1rem; background-color: rgb(107 114 128); color: white; border-radius: 0.25rem;">Secondary</button>`,
      message: "AI: Added variant props and hover effects."
    },
    {
      code: `// Create a form component
export function Form({ onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="text" placeholder="Name" className="w-full px-3 py-2 border rounded" />
      <input type="email" placeholder="Email" className="w-full px-3 py-2 border rounded" />
      <Button type="submit">Submit</Button>
    </form>
  );
}`,
      title: "Build Form",
      result: "✓ Form component created",
      file: "components/Form.tsx",
      preview: `<form style="display: flex; flex-direction: column; gap: 1rem;">
  <input type="text" placeholder="Name" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.25rem;" />
  <input type="email" placeholder="Email" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.25rem;" />
  <button style="padding: 1rem; background-color: rgb(59 130 246); color: white; border-radius: 0.25rem;">Submit</button>
</form>`,
      message: "AI: Created a Form component with inputs and submit button."
    },
    {
      code: `// Integrate components
export default function App() {
  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">My App</h1>
      <Form onSubmit={(e) => console.log('Submitted')} />
    </div>
  );
}`,
      title: "Integrate UI",
      result: "✓ UI integrated successfully",
      file: "App.tsx",
      preview: `<div style="padding: 2rem;">
  <h1 style="font-size: 1.5rem; margin-bottom: 1rem;">My App</h1>
  <form style="display: flex; flex-direction: column; gap: 1rem;">
    <input type="text" placeholder="Name" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.25rem;" />
    <input type="email" placeholder="Email" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.25rem;" />
    <button style="padding: 1rem; background-color: rgb(59 130 246); color: white; border-radius: 0.25rem;">Submit</button>
  </form>
</div>`,
      message: "AI: Integrated all components into the main App."
    }
  ]

  // Typing effect
  useEffect(() => {
    const currentStep = codeSteps[step % codeSteps.length]
    let charIndex = 0
    setDisplayedCode("")
    setShowResult(false)

    const typingInterval = setInterval(() => {
      if (charIndex < currentStep.code.length) {
        setDisplayedCode(currentStep.code.slice(0, charIndex + 1))
        charIndex++
      } else {
        clearInterval(typingInterval)
        setTimeout(() => {
          setShowResult(true)
          // Simulate file creation
          setFileExplorer(prev => [...new Set([...prev, currentStep.file])])
          // Add message
          setMessages(prev => [...prev, currentStep.message])
          // Update preview
          setPreview(currentStep.preview)
          setTimeout(() => {
            setStep((prev) => prev + 1)
          }, 2500)
        }, 500)
      }
    }, 30)

    return () => clearInterval(typingInterval)
  }, [step])

  // Cursor blink effect
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setCursorBlink((prev) => !prev)
    }, 530)
    return () => clearInterval(blinkInterval)
  }, [])

  const highlightLine = (line: string) => {
    if (line.trim().startsWith('//')) {
      return <span className="text-slate-500 italic">{line}</span>
    }
    if (line.startsWith('import')) {
      return (
        <>
          <span className="text-purple-400">import </span>
          <span className="text-blue-300">{line.replace('import ', '')}</span>
        </>
      )
    }
    if (line.startsWith('export')) {
      return (
        <>
          <span className="text-purple-400">export </span>
          <span className="text-blue-300">{line.replace('export ', '')}</span>
        </>
      )
    }
    if (line.includes('function')) {
      const parts = line.split(' ')
      return (
        <>
          <span className="text-purple-400">function </span>
          <span className="text-yellow-300">{parts[1]}</span>
          <span className="text-slate-300">{line.replace(`function ${parts[1]}`, '')}</span>
        </>
      )
    }
    if (line.includes('const')) {
      const parts = line.split(' ')
      return (
        <>
          <span className="text-purple-400">const </span>
          <span className="text-yellow-300">{parts[1]}</span>
          <span className="text-slate-300"> = </span>
          <span className="text-blue-300">{line.split('= ')[1]}</span>
        </>
      )
    }
    if (line.includes('return')) {
      return (
        <>
          <span className="text-purple-400">return </span>
          <span className="text-slate-300">{line.replace('return ', '')}</span>
        </>
      )
    }
    if (line.includes('<')) {
      return <span className="text-green-400">{line}</span>
    }
    if (line.includes("'")) {
      const parts = line.split("'")
      return (
        <>
          {parts.map((part, i) => (
            i % 2 === 0 ? <span key={i} className="text-slate-300">{part}</span> : <span key={i} className="text-green-400">'{part}'</span>
          ))}
        </>
      )
    }
    return <span className="text-slate-300">{line}</span>
  }

  const currentStep = codeSteps[step % codeSteps.length]

  return (
    <div className="w-full max-w-7xl mx-auto px-4">
      <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700 gap-2 sm:gap-0">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Code className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-300 font-mono">Vibe Coding Demo</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30 text-purple-300 text-xs">
              <Code className="h-3 w-3 mr-1" />
              {currentStep.title}
            </Badge>
            <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-300 text-xs">
              <Play className="h-3 w-3 mr-1" />
              Running
            </Badge>
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 min-h-[500px]">
          {/* File Explorer Sidebar */}
          <div className="col-span-12 md:col-span-3 bg-slate-950/50 border border-slate-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-300 font-mono">Files</span>
            </div>
            <div className="space-y-1">
              {fileExplorer.map((file, index) => (
                <div key={index} className="flex items-center gap-2 px-2 py-1 bg-slate-800/50 rounded text-xs text-slate-300">
                  <FileText className="h-3 w-3" />
                  <span>{file}</span>
                </div>
              ))}
              {fileExplorer.length === 0 && (
                <div className="text-xs text-slate-500">No files yet...</div>
              )}
            </div>
          </div>

          {/* Code Editor */}
          <div className="col-span-12 md:col-span-5 bg-slate-950/50 border border-slate-700 rounded-lg p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs text-slate-500 font-mono">TypeScript</span>
              <span className="text-xs text-slate-600">•</span>
              <span className="text-xs text-slate-500">Line {displayedCode.split('\n').length}</span>
            </div>
            <pre className="font-mono text-sm leading-relaxed overflow-x-auto">
              <code>
                {displayedCode.split('\n').map((line, i) => (
                  <div key={i} className="flex">
                    <span className="text-slate-600 mr-4 select-none w-4 text-right">{i + 1}</span>
          <span className="text-slate-200">
            {highlightLine(line)}
          </span>
                  </div>
                ))}
                {displayedCode.length > 0 && !showResult && (
                  <span className={`inline-block w-2 h-4 bg-purple-400 ml-1 ${cursorBlink ? 'opacity-100' : 'opacity-0'} transition-opacity`} />
                )}
              </code>
            </pre>
          </div>

          {/* Preview and Messaging */}
          <div className="col-span-12 md:col-span-4 space-y-4">
            {/* Preview */}
            <div className="bg-slate-950/50 border border-slate-700 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="h-4 w-4 text-slate-400" />
                <span className="text-xs text-slate-300 font-mono">Preview</span>
              </div>
              <div className="bg-white p-4 rounded border text-xs overflow-auto overflow-x-auto max-h-40">
                {preview ? (
                  <div dangerouslySetInnerHTML={{ __html: preview }} />
                ) : (
                  <div className="text-slate-500">No preview yet...</div>
                )}
              </div>
            </div>

            {/* Messaging Sidebar */}
            <div className="bg-slate-950/50 border border-slate-700 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-slate-400" />
                <span className="text-xs text-slate-300 font-mono">Messages</span>
              </div>
              <div className="space-y-2 max-h-40 overflow-auto">
                {messages.map((msg, index) => (
                  <div key={index} className="text-xs text-slate-300 p-2 bg-slate-800/50 rounded">
                    {msg}
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-xs text-slate-500">No messages yet...</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-800/30 border-t border-slate-700">
          {codeSteps.map((_, index) => (
            <button
              key={index}
              onClick={() => setStep(index)}
              className={`h-2 rounded-full transition-all ${
                (step % codeSteps.length) === index
                  ? 'w-8 bg-purple-500'
                  : 'w-2 bg-slate-600 hover:bg-slate-500'
              }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>

        {/* Gradient Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none" />
      </Card>

      {/* Features Strip */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <span className="text-xs text-slate-300">Live Preview</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <span className="text-xs text-slate-300">File Sync</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <span className="text-xs text-slate-300">AI Chat</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <span className="text-xs text-slate-300">Real-time</span>
        </div>
      </div>
    </div>
  )
}

// Badge component inline
function Badge({ children, className = "", variant = "default" }: { children: React.ReactNode, className?: string, variant?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${className}`}>
      {children}
    </span>
  )
}
