"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { CheckCircle, Play, Code, FileText, Eye, FolderOpen, Plus } from "lucide-react"

export function AnimatedCodeDemo() {
  const [step, setStep] = useState(0)
  const [displayedCode, setDisplayedCode] = useState("")
  const [showResult, setShowResult] = useState(false)
  const [cursorBlink, setCursorBlink] = useState(true)
  const [fileExplorer, setFileExplorer] = useState<string[]>([])
  const [preview, setPreview] = useState<string>("")

  const codeSteps = [
    {
      code: `// Initialize Vite project
npm create vite@latest landing-page -- --template react
cd landing-page
npm install`,
      title: "Setup Project",
      result: "✓ Vite project created successfully",
      file: "package.json",
      preview: `<div style="padding: 2rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 0.5rem;">
  <h1 style="font-size: 2rem; margin-bottom: 1rem;">🚀 Project Initialized</h1>
  <p>Landing page project created with Vite + React</p>
</div>`,
      message: "AI: Created new Vite React project for stunning landing page."
    },
    {
      code: `// Create Hero component
export function Hero() {
  return (
    <section className="py-20 px-6 text-center bg-gradient-to-br from-purple-600 to-blue-600">
      <h1 className="text-5xl font-bold mb-6">Build Amazing Apps</h1>
      <p className="text-xl mb-8">Create stunning user experiences with modern tools</p>
      <button className="px-8 py-4 bg-white text-purple-600 rounded-full font-semibold">
        Get Started
      </button>
    </section>
  );
}`,
      title: "Create Hero",
      result: "✓ Hero component created",
      file: "components/Hero.tsx",
      preview: `<section style="padding: 5rem 1.5rem; text-align: center; background: linear-gradient(135deg, rgb(147 51 234) 0%, rgb(37 99 235) 100%); color: white; border-radius: 0.5rem;">
  <h1 style="font-size: 3rem; font-weight: bold; margin-bottom: 1.5rem;">Build Amazing Apps</h1>
  <p style="font-size: 1.25rem; margin-bottom: 2rem;">Create stunning user experiences with modern tools</p>
  <button style="padding: 1rem 2rem; background-color: white; color: rgb(147 51 234); border-radius: 9999px; font-weight: 600;">Get Started</button>
</section>`,
      message: "AI: Created stunning Hero section with gradient background."
    },
    {
      code: `// Create Navigation component
export function Navigation() {
  return (
    <nav className="flex justify-between items-center p-6 bg-white shadow-lg">
      <div className="text-2xl font-bold text-purple-600">AppName</div>
      <div className="space-x-6">
        <a href="#" className="text-gray-600 hover:text-purple-600">Home</a>
        <a href="#" className="text-gray-600 hover:text-purple-600">Features</a>
        <a href="#" className="text-gray-600 hover:text-purple-600">Contact</a>
      </div>
    </nav>
  );
}`,
      title: "Create Navigation",
      result: "✓ Navigation component created",
      file: "components/Navigation.tsx",
      preview: `<nav style="display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; background-color: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-radius: 0.5rem;">
  <div style="font-size: 1.5rem; font-weight: bold; color: rgb(147 51 234);">AppName</div>
  <div style="display: flex; gap: 1.5rem;">
    <a href="#" style="color: rgb(75 85 99); text-decoration: none;">Home</a>
    <a href="#" style="color: rgb(75 85 99); text-decoration: none;">Features</a>
    <a href="#" style="color: rgb(75 85 99); text-decoration: none;">Contact</a>
  </div>
</nav>`,
      message: "AI: Created responsive navigation with hover effects."
    },
    {
      code: `// Create Features component
export function Features() {
  const features = [
    { title: 'Fast Performance', desc: 'Lightning fast loading times' },
    { title: 'Modern Design', desc: 'Beautiful and responsive UI' },
    { title: 'Easy Integration', desc: 'Simple setup and deployment' }
  ];

  return (
    <section className="py-16 px-6">
      <div className="grid md:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <div key={index} className="text-center p-6 bg-gray-50 rounded-lg">
            <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
            <p className="text-gray-600">{feature.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}`,
      title: "Create Features",
      result: "✓ Features component created",
      file: "components/Features.tsx",
      preview: `<section style="padding: 4rem 1.5rem;">
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem;">
    <div style="text-align: center; padding: 1.5rem; background-color: rgb(249 250 251); border-radius: 0.5rem;">
      <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">Fast Performance</h3>
      <p style="color: rgb(75 85 99);">Lightning fast loading times</p>
    </div>
    <div style="text-align: center; padding: 1.5rem; background-color: rgb(249 250 251); border-radius: 0.5rem;">
      <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">Modern Design</h3>
      <p style="color: rgb(75 85 99);">Beautiful and responsive UI</p>
    </div>
    <div style="text-align: center; padding: 1.5rem; background-color: rgb(249 250 251); border-radius: 0.5rem;">
      <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">Easy Integration</h3>
      <p style="color: rgb(75 85 99);">Simple setup and deployment</p>
    </div>
  </div>
</section>`,
      message: "AI: Created Features section with responsive grid layout."
    },
    {
      code: `// Create Footer component
export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12 px-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-4">Stay Connected</h3>
        <div className="flex justify-center space-x-6 mb-6">
          <a href="#" className="text-gray-300 hover:text-white">Twitter</a>
          <a href="#" className="text-gray-300 hover:text-white">GitHub</a>
          <a href="#" className="text-gray-300 hover:text-white">LinkedIn</a>
        </div>
        <p className="text-gray-400">&copy; 2024 AppName. All rights reserved.</p>
      </div>
    </footer>
  );
}`,
      title: "Create Footer",
      result: "✓ Footer component created",
      file: "components/Footer.tsx",
      preview: `<footer style="background-color: rgb(17 24 39); color: white; padding: 3rem 1.5rem;">
  <div style="text-align: center;">
    <h3 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">Stay Connected</h3>
    <div style="display: flex; justify-content: center; gap: 1.5rem; margin-bottom: 1.5rem;">
      <a href="#" style="color: rgb(209 213 219); text-decoration: none;">Twitter</a>
      <a href="#" style="color: rgb(209 213 219); text-decoration: none;">GitHub</a>
      <a href="#" style="color: rgb(209 213 219); text-decoration: none;">LinkedIn</a>
    </div>
    <p style="color: rgb(156 163 175);">&copy; 2024 AppName. All rights reserved.</p>
  </div>
</footer>`,
      message: "AI: Created Footer with social links and branding."
    },
    {
      code: `// Create main App component
import { Navigation } from './components/Navigation';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { Footer } from './components/Footer';

export default function App() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <Hero />
      <Features />
      <Footer />
    </div>
  );
}`,
      title: "Integrate Landing Page",
      result: "✓ Complete landing page created",
      file: "App.tsx",
      preview: `<div style="min-height: 100vh;">
  <nav style="display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; background-color: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-radius: 0.5rem; margin-bottom: 1rem;">
    <div style="font-size: 1.5rem; font-weight: bold; color: rgb(147 51 234);">AppName</div>
    <div style="display: flex; gap: 1.5rem;">
      <a href="#" style="color: rgb(75 85 99); text-decoration: none;">Home</a>
      <a href="#" style="color: rgb(75 85 99); text-decoration: none;">Features</a>
      <a href="#" style="color: rgb(75 85 99); text-decoration: none;">Contact</a>
    </div>
  </nav>
  <section style="padding: 5rem 1.5rem; text-align: center; background: linear-gradient(135deg, rgb(147 51 234) 0%, rgb(37 99 235) 100%); color: white; border-radius: 0.5rem; margin-bottom: 1rem;">
    <h1 style="font-size: 3rem; font-weight: bold; margin-bottom: 1.5rem;">Build Amazing Apps</h1>
    <p style="font-size: 1.25rem; margin-bottom: 2rem;">Create stunning user experiences with modern tools</p>
    <button style="padding: 1rem 2rem; background-color: white; color: rgb(147 51 234); border-radius: 9999px; font-weight: 600;">Get Started</button>
  </section>
  <section style="padding: 4rem 1.5rem; margin-bottom: 1rem;">
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem;">
      <div style="text-align: center; padding: 1.5rem; background-color: rgb(249 250 251); border-radius: 0.5rem;">
        <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">Fast Performance</h3>
        <p style="color: rgb(75 85 99);">Lightning fast loading times</p>
      </div>
      <div style="text-align: center; padding: 1.5rem; background-color: rgb(249 250 251); border-radius: 0.5rem;">
        <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">Modern Design</h3>
        <p style="color: rgb(75 85 99);">Beautiful and responsive UI</p>
      </div>
      <div style="text-align: center; padding: 1.5rem; background-color: rgb(249 250 251); border-radius: 0.5rem;">
        <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">Easy Integration</h3>
        <p style="color: rgb(75 85 99);">Simple setup and deployment</p>
      </div>
    </div>
  </section>
  <footer style="background-color: rgb(17 24 39); color: white; padding: 3rem 1.5rem; border-radius: 0.5rem;">
    <div style="text-align: center;">
      <h3 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">Stay Connected</h3>
      <div style="display: flex; justify-content: center; gap: 1.5rem; margin-bottom: 1.5rem;">
        <a href="#" style="color: rgb(209 213 219); text-decoration: none;">Twitter</a>
        <a href="#" style="color: rgb(209 213 219); text-decoration: none;">GitHub</a>
        <a href="#" style="color: rgb(209 213 219); text-decoration: none;">LinkedIn</a>
      </div>
      <p style="color: rgb(156 163 175);">&copy; 2024 AppName. All rights reserved.</p>
    </div>
  </footer>
</div>`,
      message: "AI: Integrated all components into stunning landing page."
    },
    {
      code: `// Add global styles
import './index.css';

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
}`,
      title: "Add Styling",
      result: "✓ Global styles added",
      file: "src/index.css",
      preview: `<div style="padding: 2rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 0.5rem;">
  <h1 style="font-size: 2rem; margin-bottom: 1rem;">✨ Styling Complete</h1>
  <p>Added global CSS for consistent typography and layout</p>
</div>`,
      message: "AI: Added global styles and CSS reset for professional look."
    },
    {
      code: `// Start development server
npm run dev`,
      title: "Launch App",
      result: "✓ Development server started",
      file: "terminal",
      preview: `<div style="padding: 2rem; background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; border-radius: 0.5rem;">
  <h1 style="font-size: 2rem; margin-bottom: 1rem;">🚀 Server Running</h1>
  <p>Landing page is live at http://localhost:5173</p>
  <p style="font-size: 0.9rem; margin-top: 1rem;">Hot reload enabled for instant updates</p>
</div>`,
      message: "AI: Started Vite dev server with hot reload enabled."
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
          // Update preview
          setPreview(currentStep.preview)
          setTimeout(() => {
            setStep((prev) => prev + 1)
          }, 2500)
        }, 500)
      }
    }, 15)

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
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4">
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

          {/* Preview */}
          <div className="col-span-12 md:col-span-4 bg-slate-950/50 border border-slate-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-300 font-mono">Preview</span>
            </div>
            <div className="bg-white p-4 rounded border text-xs overflow-auto overflow-x-auto min-h-[400px]">
              {preview ? (
                <div dangerouslySetInnerHTML={{ __html: preview }} />
              ) : (
                <div className="text-slate-500">No preview yet...</div>
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
      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
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
