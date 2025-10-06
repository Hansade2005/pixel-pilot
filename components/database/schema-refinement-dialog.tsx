'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Edit3, Save, X } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export interface ColumnDefinition {
  name: string
  type: string
  required: boolean
  unique: boolean
  description?: string
  references?: {
    table: string
    column: string
  }
}

export interface SchemaDefinition {
  tableName: string
  explanation: string
  columns: ColumnDefinition[]
  indexes: string[]
}

interface SchemaRefinementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  schema: SchemaDefinition | null
  onSave: (refinedSchema: SchemaDefinition) => void
}

const COLUMN_TYPES = [
  'text', 'number', 'boolean', 'date', 'datetime', 'timestamp',
  'uuid', 'json', 'email', 'url', 'integer', 'decimal', 'varchar'
]

export function SchemaRefinementDialog({
  open,
  onOpenChange,
  schema,
  onSave
}: SchemaRefinementDialogProps) {
  const [refinedSchema, setRefinedSchema] = useState<SchemaDefinition | null>(null)
  const [editingColumn, setEditingColumn] = useState<number | null>(null)

  useEffect(() => {
    if (schema) {
      setRefinedSchema(JSON.parse(JSON.stringify(schema)))
    }
  }, [schema])

  if (!refinedSchema) return null

  const handleSave = () => {
    if (!refinedSchema.tableName.trim()) {
      toast({
        title: 'Table name required',
        description: 'Please enter a table name.',
        variant: 'destructive'
      })
      return
    }

    if (refinedSchema.columns.length === 0) {
      toast({
        title: 'Columns required',
        description: 'Please add at least one column.',
        variant: 'destructive'
      })
      return
    }

    onSave(refinedSchema)
    onOpenChange(false)
  }

  const addColumn = () => {
    const newColumn: ColumnDefinition = {
      name: `column_${refinedSchema.columns.length + 1}`,
      type: 'text',
      required: false,
      unique: false
    }

    setRefinedSchema({
      ...refinedSchema,
      columns: [...refinedSchema.columns, newColumn]
    })
  }

  const removeColumn = (index: number) => {
    setRefinedSchema({
      ...refinedSchema,
      columns: refinedSchema.columns.filter((_, i) => i !== index)
    })
  }

  const updateColumn = (index: number, updates: Partial<ColumnDefinition>) => {
    const updatedColumns = [...refinedSchema.columns]
    updatedColumns[index] = { ...updatedColumns[index], ...updates }
    setRefinedSchema({
      ...refinedSchema,
      columns: updatedColumns
    })
  }

  const getTypeColor = (type: string) => {
    const colors = {
      text: 'bg-blue-100 text-blue-800',
      number: 'bg-green-100 text-green-800',
      integer: 'bg-green-100 text-green-800',
      decimal: 'bg-green-100 text-green-800',
      boolean: 'bg-purple-100 text-purple-800',
      date: 'bg-orange-100 text-orange-800',
      datetime: 'bg-orange-100 text-orange-800',
      timestamp: 'bg-orange-100 text-orange-800',
      uuid: 'bg-gray-100 text-gray-800',
      json: 'bg-indigo-100 text-indigo-800',
      email: 'bg-pink-100 text-pink-800',
      url: 'bg-cyan-100 text-cyan-800',
      varchar: 'bg-blue-100 text-blue-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getTypeIcon = (type: string) => {
    const icons = {
      text: '📝',
      number: '🔢',
      integer: '🔢',
      decimal: '🔢',
      boolean: '✓',
      date: '📅',
      datetime: '🕐',
      timestamp: '⏰',
      uuid: '🔑',
      json: '📋',
      email: '📧',
      url: '🔗',
      varchar: '📝'
    }
    return icons[type as keyof typeof icons] || '📄'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Refine Schema: {refinedSchema.tableName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Table Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Table Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tableName">Table Name</Label>
                  <Input
                    id="tableName"
                    value={refinedSchema.tableName}
                    onChange={(e) => setRefinedSchema({
                      ...refinedSchema,
                      tableName: e.target.value
                    })}
                    placeholder="Enter table name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="explanation">Description</Label>
                <Textarea
                  id="explanation"
                  value={refinedSchema.explanation}
                  onChange={(e) => setRefinedSchema({
                    ...refinedSchema,
                    explanation: e.target.value
                  })}
                  placeholder="Describe what this table represents"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Columns */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Columns ({refinedSchema.columns.length})</CardTitle>
              <Button onClick={addColumn} size="sm" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Column
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {refinedSchema.columns.map((column, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{getTypeIcon(column.type)}</span>
                      <div>
                        <div className="font-medium">{column.name}</div>
                        {column.description && (
                          <div className="text-sm text-gray-600">{column.description}</div>
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
                        <Badge variant="secondary" className="text-xs">
                          Unique
                        </Badge>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingColumn(editingColumn === index ? null : index)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeColumn(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {editingColumn === index && (
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div className="space-y-2">
                        <Label>Column Name</Label>
                        <Input
                          value={column.name}
                          onChange={(e) => updateColumn(index, { name: e.target.value })}
                          placeholder="column_name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={column.type}
                          onValueChange={(value) => updateColumn(index, { type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COLUMN_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Description (Optional)</Label>
                        <Input
                          value={column.description || ''}
                          onChange={(e) => updateColumn(index, { description: e.target.value })}
                          placeholder="Describe this column"
                        />
                      </div>

                      <div className="flex items-center space-x-4 pt-8">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`required-${index}`}
                            checked={column.required}
                            onCheckedChange={(checked) =>
                              updateColumn(index, { required: checked as boolean })
                            }
                          />
                          <Label htmlFor={`required-${index}`}>Required</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`unique-${index}`}
                            checked={column.unique}
                            onCheckedChange={(checked) =>
                              updateColumn(index, { unique: checked as boolean })
                            }
                          />
                          <Label htmlFor={`unique-${index}`}>Unique</Label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {refinedSchema.columns.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No columns added yet. Click "Add Column" to get started.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Indexes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Suggested Indexes</CardTitle>
            </CardHeader>
            <CardContent>
              {refinedSchema.indexes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {refinedSchema.indexes.map((index, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {index}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No indexes suggested. AI will recommend indexes based on your schema.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Save Schema
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}