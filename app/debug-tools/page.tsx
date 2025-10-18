"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, XCircle, Zap, Play } from "lucide-react"

export default function DebugToolsPage() {
  const [testResult, setTestResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [testMessage, setTestMessage] = useState("use tools to list files")

  const runToolTest = async () => {
    setIsLoading(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/debug-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testMessage })
      })

      const data = await response.json()
      setTestResult(data)
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    )
  }

  const getStatusBadge = (success: boolean) => {
    return (
      <Badge variant={success ? "default" : "destructive"}>
        {success ? "PASS" : "FAIL"}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <Zap className="h-8 w-8 text-blue-600" />
            AI Tools Debug Center
          </h1>
          <p className="text-gray-600">
            Test and diagnose AI tool usage to understand why the AI might not be using tools correctly
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="testMessage">Test Message</Label>
              <Input
                id="testMessage"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Enter a message to test tool usage..."
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Try messages like: "use tools", "list files", "read package.json", "create a file"
              </p>
            </div>

            <Button 
              onClick={runToolTest} 
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                "Testing..."
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Tool Usage Test
                </>
              )}
            </Button>
          </div>
        </Card>

        {testResult && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              {getStatusIcon(testResult.success)}
              Test Results
            </h3>

            <div className="space-y-4">
              {/* Overall Status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Overall Test</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(testResult.success)}
                </div>
              </div>

              {/* Tools Usage Status */}
              {testResult.success && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Tools Used</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(testResult.toolsUsed)}
                    <span className="text-xs text-gray-600">
                      Calls: {testResult.toolCallsCount || 0}
                    </span>
                  </div>
                </div>
              )}

              {/* AI Response */}
              {testResult.aiResponse && (
                <div className="space-y-2">
                  <Label>AI Response:</Label>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm">{testResult.aiResponse}</p>
                  </div>
                </div>
              )}

              {/* Tool Calls */}
              {testResult.toolCalls && testResult.toolCalls.length > 0 && (
                <div className="space-y-2">
                  <Label>Tool Calls Made:</Label>
                  <div className="space-y-2">
                    {testResult.toolCalls.map((call: any, index: number) => (
                      <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-800">{call.name}</span>
                        </div>
                        {call.arguments && typeof call.arguments === 'object' && Object.keys(call.arguments).length > 0 && (
                          <pre className="text-xs text-gray-600 mt-1">
                            {JSON.stringify(call.arguments, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diagnosis */}
              {testResult.diagnosis && (
                <div className="space-y-2">
                  <Label>Diagnosis:</Label>
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="text-sm space-y-1">
                      <p><strong>Expected:</strong> {testResult.diagnosis.expectedBehavior}</p>
                      <p><strong>Actual:</strong> {testResult.diagnosis.actualBehavior}</p>
                      {!testResult.toolsUsed && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                          <p className="text-red-800 font-medium">⚠️ Issue Detected:</p>
                          <p className="text-red-700 text-sm">
                            The AI is not using tools when it should. This indicates a problem with:
                          </p>
                          <ul className="text-red-700 text-sm mt-1 ml-4 list-disc">
                            <li>AI model configuration (toolChoice setting)</li>
                            <li>System prompt effectiveness</li>
                            <li>Model understanding of tool availability</li>
                            <li>Possible API compatibility issues</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Raw Data */}
              <details>
                <summary className="cursor-pointer text-sm font-medium text-gray-700">
                  Show Raw Test Data
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-60">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </details>

              {/* Recommendations */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="text-sm font-medium text-blue-800 mb-2">🔧 Troubleshooting Steps:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• If tools aren't being used, the issue is likely with the AI model itself</li>
                  <li>• Check that MISTRAL_API_KEY is correctly set in environment variables</li>
                  <li>• Try different test messages to see if the pattern is consistent</li>
                  <li>• Consider switching to a different AI model if the issue persists</li>
                  <li>• Review the system prompt and toolChoice configuration</li>
                </ul>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 bg-gray-50">
          <h3 className="text-lg font-semibold mb-3">About This Debug Tool</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              This tool tests the AI's ability to use tools in a controlled environment. 
              It helps identify whether the issue is with:
            </p>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>System Configuration:</strong> API keys, model setup, tool definitions</li>
              <li><strong>AI Behavior:</strong> Whether the model understands and follows tool usage instructions</li>
              <li><strong>Prompt Engineering:</strong> If the system prompts are effective</li>
              <li><strong>Technical Issues:</strong> API compatibility, network problems, etc.</li>
            </ul>
            <p className="mt-3">
              If tools work here but not in the main chat, the issue is likely with the main chat's 
              implementation. If tools don't work here either, the issue is with the AI model configuration.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}