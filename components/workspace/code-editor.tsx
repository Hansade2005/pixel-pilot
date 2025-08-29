"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Editor } from "@monaco-editor/react"
import { Button } from "@/components/ui/button"
import { Save, FileText, Settings, Maximize2 } from "lucide-react"
import { useTheme } from "next-themes"
import type { File } from "@/lib/storage-manager"

interface CodeEditorProps {
  file: File | null
  onSave?: (file: File, content: string) => void
}

export function CodeEditor({ file, onSave }: CodeEditorProps) {
  const { theme } = useTheme()
  const editorRef = useRef<any>(null)
  const [content, setContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showMinimap, setShowMinimap] = useState(true)
  const [fontSize, setFontSize] = useState(14)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (file) {
      setContent(file.content || "")
      setHasChanges(false)
    }
  }, [file])

  // Auto-save functionality
  useEffect(() => {
    if (hasChanges && content && file) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      
      // Set new timeout for auto-save (2 seconds after last change)
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleSave()
      }, 2000)
    }

    // Cleanup timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [content, hasChanges, file])

  const handleContentChange = (newContent: string | undefined) => {
    if (newContent !== undefined) {
      setContent(newContent)
      setHasChanges(newContent !== (file?.content || ""))
    }
  }

  const getLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'css': 'css',
      'scss': 'scss',
      'html': 'html',
      'json': 'json',
      'md': 'markdown',
      'py': 'python',
      'yml': 'yaml',
      'yaml': 'yaml',
    }
    return languageMap[ext || ''] || 'plaintext'
  }

  const handleSave = async () => {
    if (!file || !hasChanges) return

    setIsSaving(true)
    try {
      // Import and initialize storage manager
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      
      // Update file directly in IndexedDB
      await storageManager.updateFile(file.workspaceId, file.path, {
        content: content,
        size: content.length,
        updatedAt: new Date().toISOString()
      })
      
      console.log('File saved successfully to IndexedDB:', file.path)
      setHasChanges(false)
      
      if (onSave) {
        onSave(file, content)
      }
      
      // Show success feedback
      console.log('File content persisted to IndexedDB storage')
    } catch (error) {
      console.error("Error saving file to IndexedDB:", error)
      // Could add toast notification here for user feedback
    } finally {
      setIsSaving(false)
    }
  }

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No File Selected</h3>
          <p className="text-muted-foreground">Select a file from the explorer to start editing</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Editor Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center space-x-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{file.name}</span>
          {hasChanges && <div className="w-2 h-2 bg-accent rounded-full" />}
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowMinimap(!showMinimap)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setFontSize(fontSize === 14 ? 16 : 14)}
          >
            {fontSize}px
          </Button>
        <Button size="sm" onClick={handleSave} disabled={!hasChanges || isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
        </div>
      </div>

      {/* Monaco Editor Container with Fixed Height */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Editor
          height="100%"
          language={getLanguage(file.name)}
          value={content}
          onChange={handleContentChange}
          theme="vs-dark"
          onMount={(editor, monaco) => {
            editorRef.current = editor
            
            // Enable syntax validation but disable semantic validation and module checking
            monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
              noSemanticValidation: true,
              noSyntaxValidation: false, // Allow syntax errors to show
              noSuggestionDiagnostics: true,
            })
            
            monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
              noSemanticValidation: true,
              noSyntaxValidation: false, // Allow syntax errors to show
              noSuggestionDiagnostics: true,
            })
            
            // Disable compiler type checking but allow syntax parsing
            monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
              noSemanticValidation: true,
              noLib: true,
              allowNonTsExtensions: true,
              skipLibCheck: true,
              skipDefaultLibCheck: true,
              moduleResolution: 1, // Classic - minimal resolution
              noResolve: true,
              allowJs: true,
              checkJs: false,
              strict: false,
              noImplicitAny: false,
              noImplicitReturns: false,
              noImplicitThis: false,
              noUnusedLocals: false,
              noUnusedParameters: false,
            })
            
            monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
              noSemanticValidation: true,
              noLib: true,
              allowNonTsExtensions: true,
              skipLibCheck: true,
              skipDefaultLibCheck: true,
              moduleResolution: 1, // Classic - minimal resolution
              noResolve: true,
              allowJs: true,
              checkJs: false,
            })
            
            // Function to clear semantic/type errors but preserve syntax errors
            const clearSemanticMarkers = () => {
              const model = editor.getModel()
              if (model) {
                // Get current markers
                const markers = monaco.editor.getModelMarkers({ resource: model.uri })
                
                // Filter out only semantic errors, keep syntax errors
                const syntaxOnlyMarkers = markers.filter(marker => {
                  // Keep syntax errors (like missing brackets, semicolons, etc.)
                  // Remove semantic errors (like type mismatches, unknown modules)
                  const message = marker.message.toLowerCase()
                  
                  // Common syntax error patterns to keep
                  const syntaxErrorPatterns = [
                    'unexpected token',
                    'expected',
                    'missing',
                    'unterminated',
                    'unexpected end of input',
                    'invalid character',
                    'malformed',
                  ]
                  
                  // Common semantic/type error patterns to remove
                  const semanticErrorPatterns = [
                    'cannot find name',
                    'cannot find module',
                    'property does not exist',
                    'type',
                    'argument of type',
                    'not assignable to',
                    'import',
                    'export',
                    'declare',
                  ]
                  
                  // If it's a syntax error, keep it
                  if (syntaxErrorPatterns.some(pattern => message.includes(pattern))) {
                    return true
                  }
                  
                  // If it's a semantic error, remove it
                  if (semanticErrorPatterns.some(pattern => message.includes(pattern))) {
                    return false
                  }
                  
                  // For other errors, default to keeping syntax-related ones
                  return marker.severity === monaco.MarkerSeverity.Error && 
                         !message.includes('module') && 
                         !message.includes('import')
                })
                
                // Set only syntax markers
                monaco.editor.setModelMarkers(model, 'typescript', syntaxOnlyMarkers.filter(m => m.source === 'ts'))
                monaco.editor.setModelMarkers(model, 'javascript', syntaxOnlyMarkers.filter(m => m.source === 'js'))
              }
            }
            
            // Clear semantic markers immediately and on every content change
            clearSemanticMarkers()
            
            // Clear semantic markers on content change
            editor.onDidChangeModelContent(() => {
              setTimeout(clearSemanticMarkers, 100) // Slightly longer delay for syntax parsing
            })
            
            // Clear semantic markers periodically to ensure they stay gone
            const markerClearInterval = setInterval(clearSemanticMarkers, 1000) // Less frequent clearing
            
            // Cleanup interval on disposal
            editor.onDidDispose(() => {
              clearInterval(markerClearInterval)
            })
            
            // Add save keybinding
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
              handleSave()
            })
          }}
          options={{
            minimap: { enabled: showMinimap },
            fontSize,
            fontFamily: 'JetBrains Mono, Fira Code, monospace',
            lineNumbers: 'on',
            rulers: [80, 120],
            wordWrap: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              alwaysConsumeMouseWheel: false,
            },
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            renderWhitespace: 'selection',
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
            },
            // Ensure proper layout within container
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            // Disable all validation and error reporting
            'semanticHighlighting.enabled': false,
            quickSuggestions: false,
            parameterHints: { enabled: false },
            suggestOnTriggerCharacters: false,
            acceptSuggestionOnEnter: 'off',
            tabCompletion: 'off',
            wordBasedSuggestions: 'off',
            // Disable hover information
            hover: { enabled: false },
            // Disable code lens
            codeLens: false,
            // Additional validation disabling
            renderValidationDecorations: 'off',
            showUnused: false,
            showDeprecated: false,
            occurrencesHighlight: 'off',
            selectionHighlight: false,
            links: false,
            colorDecorators: false,
            quickSuggestionsDelay: 0,
            suggest: {
              showMethods: false,
              showFunctions: false,
              showConstructors: false,
              showFields: false,
              showVariables: false,
              showClasses: false,
              showStructs: false,
              showInterfaces: false,
              showModules: false,
              showProperties: false,
              showEvents: false,
              showOperators: false,
              showUnits: false,
              showValues: false,
              showConstants: false,
              showEnums: false,
              showEnumMembers: false,
              showKeywords: false,
              showWords: false,
              showColors: false,
              showFiles: false,
              showReferences: false,
              showFolders: false,
              showTypeParameters: false,
              showSnippets: false,
            },
          }}
        />
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 border-t border-border bg-muted/50 text-xs text-muted-foreground flex-shrink-0">
        <div className="flex items-center justify-between">
          <span>{file.path}</span>
          <span>
            {content.split("\n").length} lines • {content.length} characters
          </span>
        </div>
      </div>
    </div>
  )
}
