'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Sparkles, Code, AlertTriangle, CheckCircle, Copy, Play } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AIQueryAssistantProps {
  databaseId: string
  onSQLGenerated?: (sql: string, explanation: string) => void
  onExecuteSQL?: (sql: string) => void
}

interface GeneratedSQL {
  sql: string
  explanation: string
  confidence: number
  tablesUsed: string[]
  safetyCheck: {
    isSafe: boolean
    warnings: string[]
  }
}

export function AIQueryAssistant({
  databaseId,
  onSQLGenerated,
  onExecuteSQL
}: AIQueryAssistantProps) {
  const [description, setDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedSQL, setGeneratedSQL] = useState<GeneratedSQL | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const generateSQL = async () => {
    if (!description.trim()) {
      toast({
        title: 'Description required',
        description: 'Please describe what you want to query.',
        variant: 'destructive'
      })
      return
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedSQL(null)

    try {
      const response = await fetch(`/api/database/${databaseId}/sql/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: description.trim()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate SQL')
      }

      const data = await response.json()
      const result = data as GeneratedSQL

      setGeneratedSQL(result)
      onSQLGenerated?.(result.sql, result.explanation)

      toast({
        title: 'SQL generated!',
        description: `Generated query with ${result.confidence * 100}% confidence.`,
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate SQL'
      setError(errorMessage)
      toast({
        title: 'Generation failed',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: 'Copied!',
        description: 'SQL query copied to clipboard.',
      })
    } catch (err) {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy to clipboard.',
        variant: 'destructive'
      })
    }
  }

  const handleExecuteSQL = () => {
    if (generatedSQL) {
      onExecuteSQL?.(generatedSQL.sql)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High'
    if (confidence >= 0.6) return 'Medium'
    return 'Low'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          AI Query Assistant
        </CardTitle>
        <CardDescription>
          Describe your data needs in plain English and get SQL queries instantly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Section */}
        <div className="space-y-3">
          <Textarea
            placeholder="Example: Show me all users who signed up in the last 30 days, ordered by signup date..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="resize-none"
            disabled={isGenerating}
          />

          <div className="flex gap-2">
            <Button
              onClick={generateSQL}
              disabled={isGenerating || !description.trim()}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate SQL
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => setDescription('')}
              disabled={isGenerating}
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Generated SQL Display */}
        {generatedSQL && (
          <div className="space-y-4">
            {/* SQL Query */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Generated SQL</span>
                  <Badge
                    variant="outline"
                    className={getConfidenceColor(generatedSQL.confidence)}
                  >
                    {getConfidenceLabel(generatedSQL.confidence)} Confidence
                  </Badge>
                </div>

                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(generatedSQL.sql)}
                    title="Copy SQL"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border font-mono text-sm overflow-x-auto">
                <pre className="whitespace-pre-wrap">{generatedSQL.sql}</pre>
              </div>
            </div>

            {/* Explanation */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">Explanation</span>
              </div>
              <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg border">
                {generatedSQL.explanation}
              </p>
            </div>

            {/* Tables Used */}
            {generatedSQL.tablesUsed.length > 0 && (
              <div className="space-y-2">
                <span className="font-medium text-sm">Tables Used</span>
                <div className="flex flex-wrap gap-1">
                  {generatedSQL.tablesUsed.map((table, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {table}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Safety Warnings */}
            {!generatedSQL.safetyCheck.isSafe && generatedSQL.safetyCheck.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">Safety Warnings:</div>
                    <ul className="list-disc list-inside text-sm">
                      {generatedSQL.safetyCheck.warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleExecuteSQL}
                className="flex items-center gap-2"
                disabled={!generatedSQL.safetyCheck.isSafe}
              >
                <Play className="h-4 w-4" />
                Execute Query
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setGeneratedSQL(null)
                  setDescription('')
                }}
              >
                Generate Another
              </Button>
            </div>
          </div>
        )}

        {/* Quick Examples */}
        {!generatedSQL && !isGenerating && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700">Quick Examples:</div>
            <div className="grid grid-cols-1 gap-2">
              {[
                "Show me all users who signed up this month",
                "Find products with price greater than $100",
                "Count orders by status",
                "List recent blog posts with author names",
                "Find customers who haven't ordered in 6 months"
              ].map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => setDescription(example)}
                  className="text-left p-2 text-sm text-gray-600 hover:bg-gray-50 rounded border hover:border-gray-300 transition-colors"
                  disabled={isGenerating}
                >
                  "{example}"
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}