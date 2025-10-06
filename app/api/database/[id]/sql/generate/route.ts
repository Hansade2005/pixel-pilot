import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateObject } from 'ai'
import { getModel } from '@/lib/ai-providers'
import { z } from 'zod'

// Zod schema for NL to SQL response
const NLToSQLResponse = z.object({
  sql: z.string(),
  explanation: z.string(),
  confidence: z.number().min(0).max(1),
  tablesUsed: z.array(z.string()),
  safetyCheck: z.object({
    isSafe: z.boolean(),
    warnings: z.array(z.string())
  })
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const databaseId = params.id
    const { description } = await req.json()

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify database ownership via workspace
    const { data: database, error: dbError } = await supabase
      .from('databases')
      .select('id, name, workspace_id, workspaces!inner(user_id)')
      .eq('id', databaseId)
      .single()

    if (dbError || !database) {
      return NextResponse.json(
        { error: 'Database not found' },
        { status: 404 }
      )
    }

    // @ts-ignore - Supabase join typing
    if (database.workspaces.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get database schema for context
    const { data: tables } = await supabase
      .from('tables')
      .select('name, schema')
      .eq('database_id', databaseId)

    const schemaContext = tables?.map(table => ({
      tableName: table.name,
      columns: Object.entries(table.schema || {}).map(([name, config]: [string, any]) => ({
        name,
        type: config.type,
        required: config.required,
        description: config.description
      }))
    })) || []

    // Use Codestral for NL to SQL conversion
    const codestral = getModel('codestral-latest')

    const systemPrompt = `You are a PostgreSQL expert that converts natural language queries to safe, efficient SQL.

Your task is to convert user descriptions into PostgreSQL queries that work with the provided database schema.

**CRITICAL RULES:**
1. Always use proper PostgreSQL syntax
2. Include appropriate WHERE clauses for safety
3. Use table aliases for clarity (e.g., 'u' for users, 'p' for posts)
4. Add LIMIT 100 by default for SELECT queries to prevent large result sets
5. Use JOINs appropriately for related tables
6. Never use dangerous operations (DROP, DELETE without WHERE, etc.)
7. Always validate that referenced tables and columns exist in the schema
8. Use proper date functions for date operations
9. Handle NULL values appropriately
10. Use aggregate functions correctly (COUNT, SUM, AVG, etc.)

**SAFETY CHECKS:**
- Flag any query that could delete or modify data without clear intent
- Warn about queries that might return very large result sets
- Ensure all table and column references are valid
- Check for potential SQL injection patterns (though parameterized queries will be used)

**RESPONSE FORMAT:**
Return a JSON object with:
- sql: The PostgreSQL query string
- explanation: Clear explanation of what the query does
- confidence: Number 0-1 indicating confidence in the translation
- tablesUsed: Array of table names used in the query
- safetyCheck: Object with isSafe boolean and warnings array`

    const userPrompt = `Convert this natural language query to PostgreSQL:

Query: "${description}"

Database Schema:
${JSON.stringify(schemaContext, null, 2)}

Database: ${database.name} (PostgreSQL/Supabase)

Generate a safe, efficient SQL query that matches the user's intent.`

    console.log('[NL to SQL] Converting with Codestral...')
    const startTime = Date.now()

    // Generate structured response using AI SDK's generateObject
    const result = await generateObject({
      model: codestral,
      schema: NLToSQLResponse,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1, // Low temperature for more consistent SQL generation
    })

    const generationTime = Date.now() - startTime
    console.log(`[NL to SQL] Generated in ${generationTime}ms`)

    const response = result.object

    // Additional validation: Check if all referenced tables exist
    const availableTableNames = schemaContext.map(t => t.tableName)
    const missingTables = response.tablesUsed.filter(table =>
      !availableTableNames.includes(table)
    )

    if (missingTables.length > 0) {
      response.safetyCheck.warnings.push(
        `Referenced tables not found in schema: ${missingTables.join(', ')}`
      )
      response.safetyCheck.isSafe = false
      response.confidence = Math.max(0.1, response.confidence - 0.3)
    }

    // Check for potentially dangerous patterns in generated SQL
    const dangerousPatterns = [
      /DELETE\s+FROM/i,
      /UPDATE\s+\w+\s+SET/i,
      /DROP\s+/i,
      /TRUNCATE/i,
      /ALTER\s+TABLE/i
    ]

    const hasDangerousOps = dangerousPatterns.some(pattern =>
      pattern.test(response.sql)
    )

    if (hasDangerousOps) {
      response.safetyCheck.warnings.push(
        'Generated query contains data modification operations'
      )
      response.safetyCheck.isSafe = false
    }

    return NextResponse.json({
      success: true,
      ...response,
      metadata: {
        generationTime,
        model: 'codestral-latest',
        schemaTables: availableTableNames.length
      }
    })

  } catch (error) {
    console.error('[NL to SQL] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to generate SQL',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}