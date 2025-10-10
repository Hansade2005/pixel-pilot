import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Zod schema for column definition
const ColumnSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['text', 'number', 'boolean', 'date', 'datetime', 'timestamp', 'uuid', 'json', 'email', 'url']),
  required: z.boolean().default(false),
  defaultValue: z.string().nullable().optional(),
  unique: z.boolean().default(false),
  description: z.string().optional(),
  references: z.object({
    table: z.string(),
    column: z.string()
  }).optional()
})

// Zod schema for table definition
const TableSchema = z.object({
  tableName: z.string().min(1),
  columns: z.array(ColumnSchema).min(1),
  indexes: z.array(z.string()).default([])
})

// Zod schema for bulk table creation request
const BulkCreateTablesSchema = z.object({
  tables: z.array(TableSchema).min(1).max(8),
  databaseId: z.string().min(1)
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const databaseId = params.id
    const body = await req.json()

    // Validate request body
    const validationResult = BulkCreateTablesSchema.safeParse({ ...body, databaseId })
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { tables } = validationResult.data

    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify database ownership
    const { data: database, error: dbError } = await supabase
      .from('databases')
      .select('id, name')
      .eq('id', databaseId)
      .eq('user_id', user.id)
      .single()

    if (dbError || !database) {
      return NextResponse.json(
        { error: 'Database not found or access denied' },
        { status: 404 }
      )
    }

    // Get existing table names to check for conflicts
    const { data: existingTables, error: tablesError } = await supabase
      .from('tables')
      .select('name')
      .eq('database_id', databaseId)

    if (tablesError) {
      console.error('[Bulk Create] Error fetching existing tables:', tablesError)
      return NextResponse.json(
        { error: 'Failed to check existing tables' },
        { status: 500 }
      )
    }

    const existingTableNames = existingTables?.map(t => t.name) || []

    // Check for table name conflicts
    const conflicts = tables.filter(table => existingTableNames.includes(table.tableName))
    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error: 'Table name conflicts',
          conflicts: conflicts.map(t => t.tableName),
          message: 'Some table names already exist. Please choose different names.'
        },
        { status: 409 }
      )
    }

    // Sort tables by dependency order (tables with foreign keys should be created after referenced tables)
    const sortedTables = sortTablesByDependencies(tables)

    console.log('[Bulk Create] Creating tables in order:', sortedTables.map(t => t.tableName))

    const createdTables = []
    const errors = []

    // Create tables in dependency order
    for (const table of sortedTables) {
      try {
        console.log(`[Bulk Create] Creating table: ${table.tableName}`)

        // Generate SQL for table creation
        const createTableSQL = generateCreateTableSQL(table)

        // Execute table creation
        const { error: createError } = await supabase.rpc('execute_sql', {
          sql: createTableSQL,
          database_id: databaseId
        })

        if (createError) {
          console.error(`[Bulk Create] Error creating table ${table.tableName}:`, createError)
          errors.push({
            table: table.tableName,
            error: createError.message || 'Failed to create table'
          })
          continue
        }

        // Create indexes if specified
        if (table.indexes && table.indexes.length > 0) {
          for (const indexColumn of table.indexes) {
            const indexSQL = generateCreateIndexSQL(table.tableName, indexColumn)
            const { error: indexError } = await supabase.rpc('execute_sql', {
              sql: indexSQL,
              database_id: databaseId
            })

            if (indexError) {
              console.warn(`[Bulk Create] Warning: Failed to create index on ${table.tableName}.${indexColumn}:`, indexError)
              // Don't fail the whole operation for index errors
            }
          }
        }

        // Record table creation in our metadata
        const { error: insertError } = await supabase
          .from('tables')
          .insert({
            database_id: databaseId,
            name: table.tableName,
            schema: table.columns,
            created_by: user.id
          })

        if (insertError) {
          console.error(`[Bulk Create] Error recording table ${table.tableName}:`, insertError)
          // Continue anyway - table was created successfully
        }

        createdTables.push({
          name: table.tableName,
          columns: table.columns.length,
          indexes: table.indexes?.length || 0
        })

      } catch (tableError) {
        console.error(`[Bulk Create] Unexpected error creating table ${table.tableName}:`, tableError)
        errors.push({
          table: table.tableName,
          error: tableError instanceof Error ? tableError.message : 'Unexpected error'
        })
      }
    }

    // Return results
    return NextResponse.json({
      success: true,
      created: createdTables,
      errors: errors,
      summary: {
        totalRequested: tables.length,
        successfullyCreated: createdTables.length,
        failed: errors.length
      }
    })

  } catch (error) {
    console.error('[Bulk Create] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to create tables',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper function to sort tables by dependency order
function sortTablesByDependencies(tables: z.infer<typeof TableSchema>[]): z.infer<typeof TableSchema>[] {
  const tableMap = new Map(tables.map(table => [table.tableName, table]))
  const visited = new Set<string>()
  const visiting = new Set<string>()
  const result: z.infer<typeof TableSchema>[] = []

  function visit(tableName: string): void {
    if (visited.has(tableName)) return
    if (visiting.has(tableName)) {
      throw new Error(`Circular dependency detected involving table: ${tableName}`)
    }

    visiting.add(tableName)
    const table = tableMap.get(tableName)
    if (!table) return

    // Visit all referenced tables first
    for (const column of table.columns) {
      if (column.references) {
        visit(column.references.table)
      }
    }

    visiting.delete(tableName)
    visited.add(tableName)
    result.push(table)
  }

  // Visit all tables
  for (const table of tables) {
    if (!visited.has(table.tableName)) {
      visit(table.tableName)
    }
  }

  return result
}

// Helper function to generate CREATE TABLE SQL
function generateCreateTableSQL(table: z.infer<typeof TableSchema>): string {
  const columnsSQL = table.columns.map(column => {
    let columnSQL = `"${column.name}" ${mapPiPilotTypeToSQL(column.type)}`

    if (column.required) {
      columnSQL += ' NOT NULL'
    }

    if (column.defaultValue) {
      columnSQL += ` DEFAULT ${column.defaultValue}`
    }

    if (column.unique) {
      columnSQL += ' UNIQUE'
    }

    if (column.references) {
      columnSQL += ` REFERENCES "${column.references.table}"("${column.references.column}")`
    }

    return columnSQL
  }).join(',\n  ')

  return `CREATE TABLE "${table.tableName}" (
  ${columnsSQL}
);`
}

// Helper function to generate CREATE INDEX SQL
function generateCreateIndexSQL(tableName: string, columnName: string): string {
  const indexName = `idx_${tableName}_${columnName}`
  return `CREATE INDEX "${indexName}" ON "${tableName}"("${columnName}");`
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