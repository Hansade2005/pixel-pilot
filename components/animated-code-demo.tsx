"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { CheckCircle, Play, Database, Terminal } from "lucide-react"

export function AnimatedCodeDemo() {
  const [step, setStep] = useState(0)
  const [displayedCode, setDisplayedCode] = useState("")
  const [showResult, setShowResult] = useState(false)
  const [cursorBlink, setCursorBlink] = useState(true)

  const codeSteps = [
    {
      code: `// Create a new table
await db.createTable('tasks', {
  id: 'uuid primary key',
  title: 'text not null',
  status: 'text default pending'
})`,
      title: "Create Table",
      result: "✓ Table 'tasks' created successfully"
    },
    {
      code: `// Insert a new task
const task = await db
  .from('tasks')
  .insert({
    title: 'Build landing page',
    status: 'in-progress'
  })
  .single()`,
      title: "Insert Data",
      result: `{ id: "a1b2c3d4", title: "Build landing page", status: "in-progress" }`
    },
    {
      code: `// Query all tasks
const tasks = await db
  .from('tasks')
  .select('*')
  .eq('status', 'in-progress')`,
      title: "Query Data",
      result: `[{ id: "a1b2c3d4", title: "Build landing page", status: "in-progress" }]`
    },
    {
      code: `// Update task status
await db
  .from('tasks')
  .update({ status: 'completed' })
  .eq('id', 'a1b2c3d4')`,
      title: "Update Data",
      result: "✓ Task marked as completed"
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

  const currentStep = codeSteps[step % codeSteps.length]

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 shadow-2xl">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Terminal className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-300 font-mono">app.ts</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30 text-purple-300 text-xs">
              <Database className="h-3 w-3 mr-1" />
              {currentStep.title}
            </Badge>
            <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-300 text-xs">
              <Play className="h-3 w-3 mr-1" />
              Running
            </Badge>
          </div>
        </div>

        {/* Code Editor */}
        <div className="grid md:grid-cols-2 divide-x divide-slate-700">
          {/* Left: Code */}
          <div className="p-6 min-h-[280px] relative">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs text-slate-500 font-mono">TypeScript</span>
              <span className="text-xs text-slate-600">•</span>
              <span className="text-xs text-slate-500">Line {displayedCode.split('\n').length}</span>
            </div>
            <pre className="font-mono text-sm leading-relaxed">
              <code>
                {displayedCode.split('\n').map((line, i) => (
                  <div key={i} className="flex">
                    <span className="text-slate-600 mr-4 select-none w-4 text-right">{i + 1}</span>
                    <span className="text-slate-200">
                      {line.includes('//') ? (
                        <>
                          <span className="text-emerald-400">{line.split('//')[0]}</span>
                          <span className="text-slate-500 italic">//{line.split('//')[1]}</span>
                        </>
                      ) : line.includes('await') ? (
                        <>
                          <span className="text-purple-400">await </span>
                          <span className="text-blue-300">{line.replace('await ', '')}</span>
                        </>
                      ) : line.includes('const') ? (
                        <>
                          <span className="text-purple-400">const </span>
                          <span className="text-yellow-300">{line.split(' ')[1]}</span>
                          <span className="text-slate-300"> = </span>
                          <span className="text-blue-300">{line.split('= ')[1]}</span>
                        </>
                      ) : line.trim().startsWith('.') ? (
                        <span className="text-cyan-300">{line}</span>
                      ) : line.includes("'") ? (
                        <>
                          <span className="text-slate-300">{line.split("'")[0]}</span>
                          <span className="text-green-400">'{line.split("'")[1]}'</span>
                          <span className="text-slate-300">{line.split("'")[2]}</span>
                        </>
                      ) : (
                        <span className="text-slate-300">{line}</span>
                      )}
                    </span>
                  </div>
                ))}
                {displayedCode.length > 0 && !showResult && (
                  <span className={`inline-block w-2 h-4 bg-purple-400 ml-1 ${cursorBlink ? 'opacity-100' : 'opacity-0'} transition-opacity`} />
                )}
              </code>
            </pre>
          </div>

          {/* Right: Output */}
          <div className="p-6 bg-slate-950/50 min-h-[280px] relative">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs text-slate-500 font-mono">Console Output</span>
              {showResult && (
                <CheckCircle className="h-3 w-3 text-green-400 animate-in fade-in zoom-in duration-300" />
              )}
            </div>
            <div className="font-mono text-sm">
              {showResult ? (
                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="text-slate-500 text-xs">
                    <span className="text-green-400">✓</span> Execution completed
                  </div>
                  <div className="mt-3 p-3 bg-slate-900/50 border border-slate-800 rounded">
                    {currentStep.result.startsWith('{') || currentStep.result.startsWith('[') ? (
                      <pre className="text-emerald-300 text-xs leading-relaxed whitespace-pre-wrap">
                        {currentStep.result}
                      </pre>
                    ) : (
                      <div className="text-emerald-300 text-xs">
                        {currentStep.result}
                      </div>
                    )}
                  </div>
                  <div className="text-slate-600 text-xs mt-2">
                    Executed in {Math.floor(Math.random() * 50 + 20)}ms
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-600">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-slate-600 animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-slate-600 animate-pulse delay-75" />
                    <div className="w-2 h-2 rounded-full bg-slate-600 animate-pulse delay-150" />
                  </div>
                  <span className="text-xs">Running...</span>
                </div>
              )}
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
          <span className="text-xs text-slate-300">Real-time</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <span className="text-xs text-slate-300">Type-safe</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <span className="text-xs text-slate-300">Auto-sync</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <span className="text-xs text-slate-300">Zero config</span>
        </div>
      </div>
    </div>
  )
}

// Badge component inline (if not already in your components)
function Badge({ children, className = "", variant = "default" }: { children: React.ReactNode, className?: string, variant?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${className}`}>
      {children}
    </span>
  )
}
