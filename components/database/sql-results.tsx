'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Download,
  FileText,
  Database,
  Clock,
  AlertTriangle,
  CheckCircle,
  Copy,
  ExternalLink
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SQLResultsProps {
  results?: any[]
  error?: string
  executionTime?: number
  rowCount?: number
  columnCount?: number
  sql?: string
  onRetry?: () => void
}

export function SQLResults({
  results,
  error,
  executionTime,
  rowCount,
  columnCount,
  sql,
  onRetry
}: SQLResultsProps) {
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  const exportToCSV = async () => {
    if (!results || results.length === 0) return

    setIsExporting(true)
    try {
      const headers = Object.keys(results[0])
      const csvContent = [
        headers.join(','),
        ...results.map(row =>
          headers.map(header => {
            const value = row[header]
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value || ''
          }).join(',')
        )
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `query-results-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: 'Export successful',
        description: 'CSV file downloaded successfully.',
      })
    } catch (err) {
      toast({
        title: 'Export failed',
        description: 'Failed to export CSV file.',
        variant: 'destructive'
      })
    } finally {
      setIsExporting(false)
    }
  }

  const exportToJSON = async () => {
    if (!results) return

    setIsExporting(true)
    try {
      const jsonContent = JSON.stringify(results, null, 2)
      const blob = new Blob([jsonContent], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `query-results-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: 'Export successful',
        description: 'JSON file downloaded successfully.',
      })
    } catch (err) {
      toast({
        title: 'Export failed',
        description: 'Failed to export JSON file.',
        variant: 'destructive'
      })
    } finally {
      setIsExporting(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: 'Copied!',
        description: 'Results copied to clipboard.',
      })
    } catch (err) {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy to clipboard.',
        variant: 'destructive'
      })
    }
  }

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'NULL'
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
    if (value instanceof Date) return value.toISOString()
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  const getValueType = (value: any): string => {
    if (value === null || value === undefined) return 'null'
    if (typeof value === 'boolean') return 'boolean'
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'decimal'
    if (value instanceof Date) return 'date'
    if (typeof value === 'object') return 'json'
    return 'text'
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Query Error
          </CardTitle>
          <CardDescription>
            The SQL query failed to execute.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-mono text-sm whitespace-pre-wrap">
              {error}
            </AlertDescription>
          </Alert>

          {onRetry && (
            <div className="mt-4">
              <Button onClick={onRetry} variant="outline">
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (!results || results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-gray-600" />
            Query Results
          </CardTitle>
          <CardDescription>
            No results to display.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Execute a query to see results here.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const columns = Object.keys(results[0])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Query Results
            </CardTitle>
            <CardDescription>
              {rowCount} rows returned in {executionTime}ms
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {columnCount} columns
            </Badge>

            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={exportToCSV}
                disabled={isExporting}
                title="Export as CSV"
              >
                <Download className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={exportToJSON}
                disabled={isExporting}
                title="Export as JSON"
              >
                <FileText className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(JSON.stringify(results, null, 2))}
                title="Copy results"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column, idx) => (
                    <TableHead key={idx} className="font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <span>{column}</span>
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          {getValueType(results[0][column])}
                        </Badge>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((row, rowIdx) => (
                  <TableRow key={rowIdx}>
                    {columns.map((column, colIdx) => (
                      <TableCell key={colIdx} className="font-mono text-sm max-w-xs">
                        <div className="truncate" title={formatValue(row[column])}>
                          {formatValue(row[column])}
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {results.length > 100 && (
          <div className="mt-4 text-sm text-gray-600 flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Showing first 100 rows. Export to see all results.
          </div>
        )}

        {executionTime && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            Executed in {executionTime}ms
          </div>
        )}
      </CardContent>
    </Card>
  )
}