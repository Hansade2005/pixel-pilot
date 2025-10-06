'use client'

import { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, Square, RotateCcw, FileText, Settings } from 'lucide-react'
import { format } from 'sql-formatter'

interface SQLEditorProps {
  value: string
  onChange: (value: string) => void
  onExecute: (query: string) => void
  onFormat?: () => void
  onClear?: () => void
  isExecuting?: boolean
  placeholder?: string
  height?: string
  databaseId?: string
  tables?: Array<{
    name: string
    columns: Array<{
      name: string
      type: string
    }>
  }>
}

export function SQLEditor({
  value,
  onChange,
  onExecute,
  onFormat,
  onClear,
  isExecuting = false,
  placeholder = 'SELECT * FROM your_table;',
  height = '400px',
  databaseId,
  tables = []
}: SQLEditorProps) {
  const editorRef = useRef<any>(null)
  const [isEditorReady, setIsEditorReady] = useState(false)

  // Handle editor mount
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor
    setIsEditorReady(true)

    // Configure Monaco for SQL
    monaco.languages.setMonarchTokensProvider('sql', {
      tokenizer: {
        root: [
          // Keywords
          [/\b(SELECT|FROM|WHERE|JOIN|INNER|LEFT|RIGHT|FULL|ON|GROUP|BY|HAVING|ORDER|LIMIT|OFFSET|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|INDEX|PRIMARY|KEY|FOREIGN|REFERENCES|UNIQUE|NOT|NULL|DEFAULT|AUTO_INCREMENT|ENGINE|InnoDB|MyISAM|CASCADE|RESTRICT|NO|ACTION)\b/i, 'keyword'],

          // Functions
          [/\b(COUNT|SUM|AVG|MIN|MAX|CONCAT|SUBSTRING|REPLACE|TRIM|UPPER|LOWER|NOW|CURDATE|CURTIME|DATE|YEAR|MONTH|DAY|HOUR|MINUTE|SECOND|DATEDIFF|TIMESTAMPDIFF)\b/i, 'predefined'],

          // Data types
          [/\b(INT|VARCHAR|TEXT|BLOB|DATE|DATETIME|TIMESTAMP|TIME|YEAR|FLOAT|DOUBLE|DECIMAL|BOOLEAN|TINYINT|SMALLINT|MEDIUMINT|BIGINT|CHAR|BINARY|VARBINARY|ENUM|SET|JSON)\b/i, 'type'],

          // Operators
          [/[=<>!]+/, 'operator'],

          // Strings
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/'([^'\\]|\\.)*'/, 'string'],

          // Numbers
          [/\d+/, 'number'],

          // Comments
          [/--.*$/, 'comment'],
          [/\/\*.*?\*\//, 'comment'],

          // Identifiers (table/column names)
          [/[a-zA-Z_][a-zA-Z0-9_]*/, 'identifier']
        ]
      }
    })

    // Define theme
    monaco.editor.defineTheme('sqlTheme', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '0000FF', fontStyle: 'bold' },
        { token: 'predefined', foreground: '795E26' },
        { token: 'type', foreground: '267F99' },
        { token: 'string', foreground: '008000' },
        { token: 'number', foreground: '09885A' },
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'operator', foreground: '000000', fontStyle: 'bold' },
        { token: 'identifier', foreground: '001080' }
      ],
      colors: {
        'editor.background': '#FAFAFA',
        'editor.foreground': '#000000',
        'editorLineNumber.foreground': '#237893',
        'editorCursor.foreground': '#000000'
      }
    })

    // Set theme
    monaco.editor.setTheme('sqlTheme')

    // Configure completion provider for table/column names
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model: any, position: any) => {
        const suggestions: any[] = []

        // Add table names
        tables.forEach(table => {
          suggestions.push({
            label: table.name,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: table.name,
            detail: 'Table',
            documentation: `Table: ${table.name}`
          })

          // Add column names with table prefix
          table.columns.forEach(column => {
            suggestions.push({
              label: `${table.name}.${column.name}`,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: `${table.name}.${column.name}`,
              detail: `${column.type}`,
              documentation: `Column: ${table.name}.${column.name} (${column.type})`
            })

            // Add column names without prefix
            suggestions.push({
              label: column.name,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: column.name,
              detail: `${column.type}`,
              documentation: `Column: ${column.name} (${column.type})`
            })
          })
        })

        // Add common SQL keywords
        const keywords = [
          'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL',
          'ON', 'GROUP', 'BY', 'HAVING', 'ORDER', 'LIMIT', 'OFFSET',
          'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
          'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'DISTINCT', 'AS', 'AND', 'OR', 'NOT',
          'LIKE', 'IN', 'BETWEEN', 'IS', 'NULL', 'EXISTS'
        ]

        keywords.forEach(keyword => {
          suggestions.push({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            detail: 'SQL Keyword'
          })
        })

        return { suggestions }
      }
    })

    // Add keyboard shortcut for execution (Ctrl+Enter)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      const currentValue = editor.getValue()
      if (currentValue.trim()) {
        onExecute(currentValue)
      }
    })
  }

  // Handle format
  const handleFormat = () => {
    try {
      const formatted = format(value, {
        language: 'postgresql',
        tabWidth: 2,
        keywordCase: 'upper',
        linesBetweenQueries: 2
      })
      onChange(formatted)
      onFormat?.()
    } catch (error) {
      console.error('SQL formatting error:', error)
    }
  }

  // Handle clear
  const handleClear = () => {
    onChange('')
    onClear?.()
  }

  // Handle execute
  const handleExecute = () => {
    if (value.trim()) {
      onExecute(value)
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-gray-50 border-b">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <FileText className="h-3 w-3 mr-1" />
            SQL
          </Badge>

          {tables.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {tables.length} table{tables.length !== 1 ? 's' : ''} available
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleFormat}
            disabled={!value.trim()}
            title="Format SQL (Alt+Shift+F)"
          >
            <Settings className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleClear}
            disabled={!value.trim()}
            title="Clear editor"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            onClick={handleExecute}
            disabled={!value.trim() || isExecuting}
            className="flex items-center gap-1"
            title="Execute query (Ctrl+Enter)"
          >
            {isExecuting ? (
              <Square className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isExecuting ? 'Running...' : 'Run'}
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div style={{ height }}>
        <Editor
          height="100%"
          language="sql"
          value={value}
          onChange={(val) => onChange(val || '')}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            tabSize: 2,
            insertSpaces: true,
            folding: true,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
            glyphMargin: false,
            contextmenu: true,
            quickSuggestions: {
              other: true,
              comments: false,
              strings: false
            },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            parameterHints: {
              enabled: true
            },
            hover: {
              enabled: true
            },
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            formatOnPaste: true,
            formatOnType: true
          }}
          loading={
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading SQL editor...</div>
            </div>
          }
        />
      </div>

      {/* Footer with shortcuts */}
      <div className="px-3 py-2 bg-gray-50 border-t text-xs text-gray-600 flex justify-between items-center">
        <span>PostgreSQL syntax highlighting enabled</span>
        <span>Shortcuts: Ctrl+Enter (Run) • Alt+Shift+F (Format)</span>
      </div>
    </div>
  )
}