'use client'

import { useState, ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SchemaRefinementDialog, type SchemaDefinition } from './schema-refinement-dialog'
import { Sparkles, Loader2, AlertTriangle, Database, Plus, Edit3 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Column {
  name: string
  type: 'text' | 'number' | 'boolean' | 'date' | 'datetime' | 'timestamp' | 'uuid' | 'json' | 'email' | 'url'
  required: boolean
  unique: boolean
  defaultValue?: string | null
  description?: string
  references?: {
    table: string
    column: string
  }
}

interface GeneratedSchema {
  tableName: string
  columns: Column[]
  indexes: string[]
  explanation: string
}

interface AISchemaGeneratorProps {
  workspaceId?: string
  databaseId: string
  onSchemaGenerated?: (schema: GeneratedSchema) => void
  onCreateTable?: (schema: GeneratedSchema) => void
  onSuccess?: () => void
  children?: ReactNode
}

export function AISchemaGenerator({
  workspaceId,
  databaseId,
  onSchemaGenerated,
  onCreateTable,
  onSuccess,
  children
}: AISchemaGeneratorProps) {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedSchema, setGeneratedSchema] = useState<GeneratedSchema | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showRefinementDialog, setShowRefinementDialog] = useState(false)
  const { toast } = useToast()

  const generateSchema = async () => {
    if (!description.trim()) {
      toast({
        title: 'Description required',
        description: 'Please enter a description for your table.',
        variant: 'destructive'
      })
      return
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedSchema(null)

    try {
      console.log('[AI Schema] Generating schema for database:', databaseId)
      const response = await fetch(`/api/database/${databaseId}/ai-schema`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: description.trim()
        })
      })

      console.log('[AI Schema] Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[AI Schema] Error response:', errorData)
        throw new Error(errorData.error || errorData.details || 'Failed to generate schema')
      }

      const data = await response.json()
      console.log('[AI Schema] Success:', data)
      const schema = data.schema

      setGeneratedSchema(schema)
      onSchemaGenerated?.(schema)

      toast({
        title: 'Schema generated!',
        description: `Created ${schema.tableName} with ${schema.columns.length} columns.`,
      })

    } catch (err) {
      console.error('Schema generation error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate schema'
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

  const handleCreateTable = () => {
    if (!generatedSchema) return

    onCreateTable?.(generatedSchema)
    onSuccess?.()
    // Reset and close
    setGeneratedSchema(null)
    setDescription('')
    setOpen(false)
  }

  const handleRefineSchema = (refinedSchema: SchemaDefinition) => {
    setGeneratedSchema(refinedSchema as GeneratedSchema)
    toast({
      title: 'Schema refined!',
      description: 'Your changes have been saved.',
    })
  }

  const getTypeColor = (type: string) => {
    const colors = {
      text: 'bg-blue-100 text-blue-800',
      number: 'bg-green-100 text-green-800',
      boolean: 'bg-purple-100 text-purple-800',
      date: 'bg-orange-100 text-orange-800',
      datetime: 'bg-orange-100 text-orange-800',
      timestamp: 'bg-orange-100 text-orange-800',
      uuid: 'bg-gray-100 text-gray-800',
      json: 'bg-indigo-100 text-indigo-800',
      email: 'bg-pink-100 text-pink-800',
      url: 'bg-cyan-100 text-cyan-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getTypeIcon = (type: string) => {
    const icons = {
      text: '📝',
      number: '🔢',
      boolean: '✓',
      date: '📅',
      datetime: '🕐',
      timestamp: '⏰',
      uuid: '🔑',
      json: '📋',
      email: '📧',
      url: '🔗'
    }
    return icons[type as keyof typeof icons] || '📄'
  }

  // If children provided, wrap in dialog
  if (children) {
    return (
      <>
        <div onClick={() => setOpen(true)}>
          {children}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-950 border-white/10">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5 text-purple-400" />
                AI Schema Generator
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {renderContent()}
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // Original inline rendering
  return renderContent()

  function renderContent() {
    return (
      <div className="space-y-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Generate Table Schema with AI
            </CardTitle>
            <CardDescription>
              Describe your table in plain English and let AI create the perfect schema for you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Example: Create a blog with posts, authors, and comments. Posts should have title, content, and publish date..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
              disabled={isGenerating}
            />

            <div className="flex gap-2">
              <Button
                onClick={generateSchema}
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
                    Generate Schema
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
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Generated Schema Display */}
        {generatedSchema && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Database className="h-5 w-5 text-green-400" />
                Generated Schema: {generatedSchema.tableName}
              </CardTitle>
              <CardDescription className="text-gray-400">
                {generatedSchema.explanation}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Columns List */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-white">Columns ({generatedSchema.columns.length})</h4>
                <div className="space-y-2">
                  {generatedSchema.columns.map((column, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{getTypeIcon(column.type)}</span>
                        <div>
                          <div className="font-medium text-white">{column.name}</div>
                          {column.description && (
                            <div className="text-sm text-gray-400">{column.description}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={getTypeColor(column.type)}>
                          {column.type}
                        </Badge>

                        {column.required && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}

                        {column.unique && (
                          <Badge variant="secondary" className="text-xs bg-gray-700 text-white border-gray-600">
                            Unique
                          </Badge>
                        )}

                        {column.references && (
                          <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                            FK → {column.references.table}.{column.references.column}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Indexes */}
              {generatedSchema.indexes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-white">Suggested Indexes</h4>
                  <div className="flex flex-wrap gap-2">
                    {generatedSchema.indexes.map((index, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs border-gray-600 text-gray-300">
                        {index}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t border-gray-700">
                <Button
                  onClick={handleCreateTable}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Table
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setShowRefinementDialog(true)}
                  className="flex items-center gap-2"
                >
                  <Edit3 className="h-4 w-4" />
                  Refine Schema
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setGeneratedSchema(null)
                    setDescription('')
                  }}
                >
                  Start Over
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!generatedSchema && !isGenerating && !error && (
          <Card className="border-dashed border-gray-700 bg-gray-800/50">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                Ready to generate your first schema
              </h3>
              <p className="text-gray-400 max-w-md">
                Describe your table in plain English above, and AI will create a complete database schema with columns, types, and relationships.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Schema Refinement Dialog */}
        <SchemaRefinementDialog
          open={showRefinementDialog}
          onOpenChange={setShowRefinementDialog}
          schema={generatedSchema}
          onSave={handleRefineSchema}
        />
      </div>
    )
  }
}