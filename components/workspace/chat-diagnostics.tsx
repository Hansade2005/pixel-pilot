"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, XCircle, Zap } from "lucide-react"

interface ChatDiagnosticsProps {
  project: any
}

export function ChatDiagnostics({ project }: ChatDiagnosticsProps) {
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null)
  const [isRunning, setIsRunning] = useState(false)

  const runDiagnostics = async () => {
    if (!project) return

    setIsRunning(true)
    const results: any = {
      projectInfo: {},
      chatApiTest: {},
      toolsTest: {},
      timestamp: new Date().toISOString()
    }

    try {
      // Test 1: Project Info
      results.projectInfo = {
        hasProject: !!project,
        projectId: project?.id || 'missing',
        projectName: project?.name || 'missing',
        status: !!project ? 'pass' : 'fail'
      }

      // Test 2: Chat API without tools
      try {
        const chatResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'Hello, can you respond?' }],
            projectId: project?.id,
            useTools: false,
            project,
            files: []
          })
        })

        results.chatApiTest = {
          status: chatResponse.ok ? 'pass' : 'fail',
          statusCode: chatResponse.status,
          contentType: chatResponse.headers.get('content-type')
        }
      } catch (error) {
        results.chatApiTest = {
          status: 'fail',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }

      // Test 3: Chat API with tools
      try {
        const toolsRequestBody = {
          messages: [{ role: 'user', content: 'List files in the project' }],
          projectId: project?.id,
          useTools: true,
          project,
          files: []
        }
        
        console.log('[DIAGNOSTICS] Tools request body:', toolsRequestBody)
        
        const toolsResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toolsRequestBody)
        })

        const toolsData = await toolsResponse.json()
        
        console.log('[DIAGNOSTICS] Tools response:', toolsData)
        
        results.toolsTest = {
          status: toolsResponse.ok ? 'pass' : 'fail',
          statusCode: toolsResponse.status,
          hasToolCalls: !!toolsData.toolCalls,
          toolCallsCount: toolsData.toolCalls?.length || 0,
          contentType: toolsResponse.headers.get('content-type'),
          response: toolsData,
          requestBody: toolsRequestBody
        }
      } catch (error) {
        results.toolsTest = {
          status: 'fail',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }

      setDiagnosticResults(results)
    } catch (error) {
      setDiagnosticResults({
        error: error instanceof Error ? error.message : 'Diagnostic failed',
        timestamp: new Date().toISOString()
      })
    } finally {
      setIsRunning(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'fail': return <XCircle className="h-4 w-4 text-red-500" />
      default: return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variant = status === 'pass' ? 'default' : status === 'fail' ? 'destructive' : 'secondary'
    return <Badge variant={variant}>{status}</Badge>
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Chat AI Tools Diagnostics
        </h3>
        <Button 
          onClick={runDiagnostics} 
          disabled={isRunning || !project}
          size="sm"
        >
          {isRunning ? 'Running...' : 'Run Diagnostics'}
        </Button>
      </div>

      {!project && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            ⚠️ No project selected. Please select a project to run diagnostics.
          </p>
        </div>
      )}

      {diagnosticResults && (
        <div className="space-y-3">
          <div className="text-sm text-gray-500">
            Last run: {new Date(diagnosticResults.timestamp).toLocaleString()}
          </div>

          {/* Project Info Test */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
            <div className="flex items-center gap-2">
              {getStatusIcon(diagnosticResults.projectInfo?.status)}
              <span className="font-medium">Project Information</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(diagnosticResults.projectInfo?.status)}
              <span className="text-xs text-gray-600">
                ID: {diagnosticResults.projectInfo?.projectId?.slice(0, 8)}...
              </span>
            </div>
          </div>

          {/* Chat API Test */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
            <div className="flex items-center gap-2">
              {getStatusIcon(diagnosticResults.chatApiTest?.status)}
              <span className="font-medium">Chat API (No Tools)</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(diagnosticResults.chatApiTest?.status)}
              <span className="text-xs text-gray-600">
                Status: {diagnosticResults.chatApiTest?.statusCode}
              </span>
            </div>
          </div>

          {/* Tools Test */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
            <div className="flex items-center gap-2">
              {getStatusIcon(diagnosticResults.toolsTest?.status)}
              <span className="font-medium">Chat API (With Tools)</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(diagnosticResults.toolsTest?.status)}
              <span className="text-xs text-gray-600">
                Tools: {diagnosticResults.toolsTest?.toolCallsCount || 0}
              </span>
            </div>
          </div>

          {/* Detailed Results */}
          {diagnosticResults.toolsTest?.response && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700">
                Show Detailed Results
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-60">
                {JSON.stringify(diagnosticResults, null, 2)}
              </pre>
            </details>
          )}

          {/* Recommendations */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Troubleshooting Tips:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• If tools test fails, check browser console for "[DEBUG] Chat API" logs</li>
              <li>• Ensure useTools=true and projectId are being sent to /api/chat</li>
              <li>• Verify the AI model (Codestral) is responding with tool calls</li>
              <li>• Check that MISTRAL_API_KEY environment variable is set</li>
            </ul>
          </div>
        </div>
      )}
    </Card>
  )
}