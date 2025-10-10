import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Download, Copy, FileJson, FileText, Database } from 'lucide-react'
import { toast } from 'sonner'
import type { Table } from '@/lib/supabase'

interface TableExportProps {
  tables: Table[]
  databaseName: string
}

export function TableExport({ tables, databaseName }: TableExportProps) {
  const [isExporting, setIsExporting] = useState(false)

  const exportToJSON = () => {
    try {
      const exportData = {
        database: databaseName,
        exportedAt: new Date().toISOString(),
        tables: tables.map(table => ({
          name: table.name,
          schema: table.schema_json,
          createdAt: table.created_at
        }))
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${databaseName}_schema.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Schema exported as JSON')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export schema')
    }
  }

  const exportToCSV = () => {
    try {
      const csvRows = []

      // Header row
      csvRows.push(['Table Name', 'Column Name', 'Type', 'Required', 'Unique', 'Default Value', 'Description', 'References'].join(','))

      // Data rows
      tables.forEach(table => {
        if (table.schema_json?.columns) {
          table.schema_json.columns.forEach((column: any) => {
            const row = [
              table.name,
              column.name,
              column.type,
              column.required || false,
              column.unique || false,
              column.defaultValue || '',
              column.description || '',
              column.references ? `${column.references.table}.${column.references.column}` : ''
            ].map(field => `"${String(field).replace(/"/g, '""')}"`) // Escape quotes

            csvRows.push(row.join(','))
          })
        }
      })

      const csvContent = csvRows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${databaseName}_schema.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Schema exported as CSV')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export schema')
    }
  }

  const exportToSQL = () => {
    try {
      const sqlStatements = []

      // Add header comment
      sqlStatements.push(`-- Database Schema Export for ${databaseName}`)
      sqlStatements.push(`-- Exported on ${new Date().toISOString()}`)
      sqlStatements.push('')

      tables.forEach(table => {
        if (table.schema_json?.columns) {
          const tableName = table.name
          const columns = table.schema_json.columns

          // CREATE TABLE statement
          const columnDefs = columns.map((column: any) => {
            let def = `"${column.name}" ${mapPiPilotTypeToSQL(column.type)}`

            if (column.required) def += ' NOT NULL'
            if (column.unique) def += ' UNIQUE'
            if (column.defaultValue) def += ` DEFAULT ${column.defaultValue}`
            if (column.references) {
              def += ` REFERENCES "${column.references.table}"("${column.references.column}")`
            }

            return def
          }).join(',\n  ')

          sqlStatements.push(`CREATE TABLE "${tableName}" (`)
          sqlStatements.push(`  ${columnDefs}`)
          sqlStatements.push(');')
          sqlStatements.push('')

          // CREATE INDEX statements
          if (table.schema_json.indexes && table.schema_json.indexes.length > 0) {
            table.schema_json.indexes.forEach((indexColumn: string) => {
              const indexName = `idx_${tableName}_${indexColumn}`
              sqlStatements.push(`CREATE INDEX "${indexName}" ON "${tableName}"("${indexColumn}");`)
            })
            sqlStatements.push('')
          }
        }
      })

      const sqlContent = sqlStatements.join('\n')
      const blob = new Blob([sqlContent], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${databaseName}_schema.sql`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Schema exported as SQL')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export schema')
    }
  }

  const copyToClipboard = async () => {
    try {
      setIsExporting(true)

      const exportData = {
        database: databaseName,
        exportedAt: new Date().toISOString(),
        tables: tables.map(table => ({
          name: table.name,
          columns: table.schema_json?.columns || [],
          indexes: table.schema_json?.indexes || []
        }))
      }

      const textContent = JSON.stringify(exportData, null, 2)
      await navigator.clipboard.writeText(textContent)

      toast.success('Schema copied to clipboard')
    } catch (error) {
      console.error('Copy error:', error)
      toast.error('Failed to copy to clipboard')
    } finally {
      setIsExporting(false)
    }
  }

  if (tables.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 border-gray-700 text-white hover:bg-gray-800"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
        <DropdownMenuItem
          onClick={exportToJSON}
          className="text-white hover:bg-gray-700 cursor-pointer"
        >
          <FileJson className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={exportToCSV}
          className="text-white hover:bg-gray-700 cursor-pointer"
        >
          <FileText className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={exportToSQL}
          className="text-white hover:bg-gray-700 cursor-pointer"
        >
          <Database className="h-4 w-4 mr-2" />
          Export as SQL
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={copyToClipboard}
          disabled={isExporting}
          className="text-white hover:bg-gray-700 cursor-pointer"
        >
          <Copy className="h-4 w-4 mr-2" />
          {isExporting ? 'Copying...' : 'Copy to Clipboard'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Helper function to map PiPilot types to SQL types
function mapPiPilotTypeToSQL(piPilotType: string): string {
  const typeMap: Record<string, string> = {
    'text': 'TEXT',
    'number': 'NUMERIC',
    'boolean': 'BOOLEAN',
    'date': 'DATE',
    'datetime': 'TIMESTAMP WITH TIME ZONE',
    'timestamp': 'TIMESTAMP WITH TIME ZONE',
    'uuid': 'UUID',
    'json': 'JSONB',
    'email': 'TEXT',
    'url': 'TEXT'
  }

  return typeMap[piPilotType] || 'TEXT'
}