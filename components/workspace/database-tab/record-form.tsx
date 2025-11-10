"use client"

import { useState } from "react"
import { 
  Edit, 
  Trash2, 
  Plus, 
  Save, 
  X,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TableColumn, TableRecord } from "./types"
import { useToast } from "@/hooks/use-toast"

interface RecordFormProps {
  mode: 'create' | 'edit'
  isOpen: boolean
  onClose: () => void
  columns: TableColumn[]
  record?: TableRecord
  tableName: string
  databaseId: string | number
  onSuccess: () => void
}

export function RecordForm({
  mode,
  isOpen,
  onClose,
  columns,
  record,
  tableName,
  databaseId,
  onSuccess,
}: RecordFormProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState<Record<string, any>>(record || {})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when record changes
  useState(() => {
    if (record) {
      setFormData(record)
    } else {
      // Initialize with default values for create mode
      const initialData: Record<string, any> = {}
      columns.forEach(col => {
        if (col.default_value) {
          initialData[col.name] = col.default_value
        } else if (!col.nullable) {
          initialData[col.name] = getDefaultValueForType(col.type)
        }
      })
      setFormData(initialData)
    }
  })

  const getDefaultValueForType = (type: string): any => {
    if (type.includes('int') || type.includes('numeric') || type.includes('decimal')) {
      return 0
    }
    if (type.includes('bool')) {
      return false
    }
    if (type.includes('timestamp') || type.includes('date')) {
      return new Date().toISOString()
    }
    return ''
  }

  const handleChange = (columnName: string, value: any) => {
    setFormData(prev => ({ ...prev, [columnName]: value }))
    // Clear error for this field
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[columnName]
      return newErrors
    })
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    columns.forEach(col => {
      const value = formData[col.name]
      
      // Check required fields
      if (!col.nullable && !col.default_value && (value === undefined || value === null || value === '')) {
        newErrors[col.name] = `${col.name} is required`
      }

      // Type validation
      if (value !== null && value !== undefined && value !== '') {
        if (col.type.includes('int') && isNaN(Number(value))) {
          newErrors[col.name] = `${col.name} must be a number`
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const url = `/api/database/${databaseId}/tables/${tableName}/records`
      const method = mode === 'create' ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: formData,
          ...(mode === 'edit' && record && { originalRecord: record })
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Operation failed')
      }

      toast({
        title: "Success",
        description: mode === 'create' ? "Record created successfully" : "Record updated successfully",
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('[RecordForm] Error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Operation failed',
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderInput = (column: TableColumn) => {
    const value = formData[column.name]
    const error = errors[column.name]

    // Boolean type
    if (column.type.includes('bool')) {
      return (
        <Select
          value={value?.toString() || 'false'}
          onValueChange={(val) => handleChange(column.name, val === 'true')}
        >
          <SelectTrigger className={error ? 'border-red-500' : ''}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">True</SelectItem>
            <SelectItem value="false">False</SelectItem>
          </SelectContent>
        </Select>
      )
    }

    // Text area for long text
    if (column.type.includes('text') && !column.type.includes('varchar')) {
      return (
        <Textarea
          value={value || ''}
          onChange={(e) => handleChange(column.name, e.target.value)}
          className={error ? 'border-red-500' : ''}
          rows={4}
          disabled={column.is_primary_key && mode === 'edit'}
        />
      )
    }

    // Date/timestamp
    if (column.type.includes('date') || column.type.includes('timestamp')) {
      return (
        <Input
          type="datetime-local"
          value={value ? new Date(value).toISOString().slice(0, 16) : ''}
          onChange={(e) => handleChange(column.name, e.target.value ? new Date(e.target.value).toISOString() : null)}
          className={error ? 'border-red-500' : ''}
          disabled={column.is_primary_key && mode === 'edit'}
        />
      )
    }

    // Number input
    if (column.type.includes('int') || column.type.includes('numeric') || column.type.includes('decimal')) {
      return (
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => handleChange(column.name, e.target.value ? Number(e.target.value) : null)}
          className={error ? 'border-red-500' : ''}
          disabled={column.is_primary_key && mode === 'edit'}
        />
      )
    }

    // Default text input
    return (
      <Input
        type="text"
        value={value ?? ''}
        onChange={(e) => handleChange(column.name, e.target.value)}
        className={error ? 'border-red-500' : ''}
        disabled={column.is_primary_key && mode === 'edit'}
      />
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New Record' : 'Edit Record'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? `Add a new record to ${tableName}`
              : `Modify the selected record in ${tableName}`
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {columns.map((column) => (
            <div key={column.name} className="space-y-2">
              <Label htmlFor={column.name}>
                {column.name}
                {!column.nullable && <span className="text-red-500 ml-1">*</span>}
                {column.is_primary_key && <span className="text-blue-500 text-xs ml-2">(PK)</span>}
                {column.is_foreign_key && <span className="text-purple-500 text-xs ml-2">(FK)</span>}
              </Label>
              <div className="space-y-1">
                {renderInput(column)}
                {errors[column.name] && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors[column.name]}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {column.type}
                  {column.nullable && ' (nullable)'}
                  {column.default_value && ` • default: ${column.default_value}`}
                </p>
              </div>
            </div>
          ))}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
