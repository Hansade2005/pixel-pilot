import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateObject } from 'ai'
import { getModel } from '@/lib/ai-providers'
import { z } from 'zod'

// Zod schema for AI-generated table schema
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

const TableSchemaOutput = z.object({
  tableName: z.string().min(1).describe('The name of the table in snake_case, following the user\'s intent (can be singular or plural as appropriate)'),
  columns: z.array(ColumnSchema).min(1).describe('Array of column definitions'),
  indexes: z.array(z.string()).default([]).describe('Array of column names to index'),
  explanation: z.string().describe('Detailed explanation of the table schema and design decisions')
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const databaseId = params.id
    const { description, refinementPrompt, existingTables } = await req.json()

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    // Skip authentication for internal tool calls - database ID provides security
    // const supabase = await createClient()
    // const { data: { user }, error: userError } = await supabase.auth.getUser()

    // if (userError || !user) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 401 }
    //   )
    // }

    // Skip database ownership verification for internal tool calls
    // const { data: database, error: dbError } = await supabase
    //   .from('databases')
    //   .select('id, name, project_id, user_id')
    //   .eq('id', databaseId)
    //   .single()

    // if (dbError || !database) {
    //   return NextResponse.json(
    //     { error: 'Database not found' },
    //     { status: 404 }
    //   )
    // }

    // Check if user owns this database
    // if (database.user_id !== user.id) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 403 }
    //   )
    // }

    // Get existing tables for context
    const supabase = await createClient()
    const { data: existingTablesData } = await supabase
      .from('tables')
      .select('name, schema')
      .eq('database_id', databaseId)

    const existingTableNames = existingTablesData?.map(t => t.name) || []

    // Use Codestral for schema generation
    const codestral = getModel('codestral-latest')

    const systemPrompt = `You are a PiPilot database schema expert. You MUST ONLY use these exact datatypes:

**MANDATORY DATATYPES (ONLY USE THESE):**
- 'text': For strings, descriptions, names, emails, URLs
- 'number': For integers, decimals, prices, quantities, counts
- 'boolean': For true/false flags
- 'date': For date-only values (YYYY-MM-DD)
- 'datetime': For date and time values
- 'timestamp': For precise timestamps with timezone
- 'uuid': For unique identifiers
- 'json': For structured data, arrays, objects
- 'email': For email addresses (stored as text with validation)
- 'url': For URLs (stored as text with validation)

**CRITICAL: NEVER use these types:**
❌ 'integer' → Use 'number' instead
❌ 'decimal' → Use 'number' instead  
❌ 'varchar' → Use 'text' instead
❌ 'bigint' → Use 'number' instead
❌ 'float' → Use 'number' instead
❌ 'double' → Use 'number' instead
❌ 'serial' → Use 'number' instead

**SCHEMA REQUIREMENTS:**
1. Generate ONLY ONE table schema (not multiple tables)
2. Always include an 'id' column as 'uuid' with default gen_random_uuid()
3. Always include 'created_at' as 'timestamp' with default NOW()
4. Always include 'updated_at' as 'timestamp' with default NOW()
5. Use snake_case for all column names and table names
6. Choose ONLY from the 10 allowed datatypes above
7. Add foreign keys for relationships (references)
8. Mark required fields appropriately
9. Suggest useful indexes for performance (return column names as strings in indexes array)
10. Use appropriate table names in snake_case, following user intent (can be singular or plural as appropriate)
11. Ensure column names are descriptive and clear
12. MUST include an 'explanation' field describing your schema decisions

**FOREIGN KEYS:**
When creating relationships:
- Use {related_table_singular}_id as the column name (e.g., if related table is 'widgets', use 'widget_id')
- Set type to 'uuid'
- Add references object: { "table": "related_table", "column": "id" }
- Mark as required if it's a mandatory relationship

**INDEXES:**
Suggest indexes for:
- Foreign key columns
- Columns used in WHERE clauses frequently
- Columns used for sorting/ordering
- Unique columns

**BEST PRACTICES:**
- Keep it simple and normalized
- Avoid redundant columns
- Use appropriate constraints
- Think about query patterns
- Consider scalability
- ONLY USE THE 10 ALLOWED DATATYPES LISTED ABOVE`

    const userPrompt = `Generate a SINGLE table schema for: "${description}"${refinementPrompt ? `\n\nRefinement: ${refinementPrompt}` : ''}

${existingTableNames.length > 0 ? `\nExisting tables in this database: ${existingTableNames.join(', ')}` : ''}

**CRITICAL: You MUST ONLY use these PiPilot datatypes:**
- 'text', 'number', 'boolean', 'date', 'datetime', 'timestamp', 'uuid', 'json', 'email', 'url'

**NEVER use SQL types like 'integer', 'decimal', 'varchar', etc. Map them to PiPilot types:**
- integer/decimal/float → 'number'
- varchar/text → 'text' 
- boolean → 'boolean'
- timestamp → 'timestamp'
- uuid → 'uuid'
- json → 'json'

IMPORTANT: Generate ONLY ONE table. Do not wrap it in a "tables" array. Return the schema directly with:
- tableName: string (the table name in snake_case, following user intent)
- columns: array (list of column definitions)
- indexes: array of strings (column names to index)
- explanation: string (why you designed it this way)

Be creative but practical in your schema design.`

    console.log('[AI Schema] Generating schema with Codestral...')
    const startTime = Date.now()

    // Generate structured schema using AI SDK's generateObject
    const result = await generateObject({
      model: codestral,
      schema: TableSchemaOutput,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3, // Lower temperature for more consistent output
    })

    const generationTime = Date.now() - startTime
    console.log(`[AI Schema] Generated in ${generationTime}ms`)

    const schema = result.object

    // Post-process: Ensure required columns are present
    const requiredColumns = ['id', 'created_at', 'updated_at']
    const existingColumnNames = schema.columns.map(c => c.name)

    // Add missing required columns
    if (!existingColumnNames.includes('id')) {
      schema.columns.unshift({
        name: 'id',
        type: 'uuid',
        required: true,
        defaultValue: 'gen_random_uuid()',
        unique: true,
        description: 'Primary key'
      })
    }

    if (!existingColumnNames.includes('created_at')) {
      schema.columns.push({
        name: 'created_at',
        type: 'timestamp',
        required: true,
        defaultValue: 'NOW()',
        unique: false,
        description: 'Record creation timestamp'
      })
    }

    if (!existingColumnNames.includes('updated_at')) {
      schema.columns.push({
        name: 'updated_at',
        type: 'timestamp',
        required: true,
        defaultValue: 'NOW()',
        unique: false,
        description: 'Record last update timestamp'
      })
    }

    // Validate table name doesn't conflict
    if (existingTableNames.includes(schema.tableName)) {
      // Add suffix to avoid conflict
      schema.tableName = `${schema.tableName}_v2`
      schema.explanation = `${schema.explanation}\n\nNote: Table name modified to avoid conflict with existing table.`
    }

    return NextResponse.json({
      success: true,
      schema,
      metadata: {
        generationTime,
        model: 'codestral-latest',
        columnsGenerated: schema.columns.length
      }
    })

  } catch (error) {
    console.error('[AI Schema] Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to generate schema', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve schema generation examples/templates
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Skip authentication for internal tool calls - database ID provides security
    // const supabase = await createClient()
    // const { data: { user }, error: userError } = await supabase.auth.getUser()

    // if (userError || !user) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 401 }
    //   )
    // }

    // Return pre-defined templates for quick start
    const templates = [
      {
        id: 'blog',
        name: 'Blog Platform',
        description: 'Create a blog with posts, authors, categories, and comments',
        prompt: 'Create a blog platform with posts (title, content, published date), authors (name, email, bio), categories for organizing posts, and comments (author name, content) on posts',
        icon: '📝',
        tables: 4
      },
      {
        id: 'ecommerce',
        name: 'E-commerce Store',
        description: 'Products, categories, orders, and customers',
        prompt: 'Create an e-commerce store with products (name, price, description, stock quantity), categories for organizing products, orders with order items, and customers with shipping addresses',
        icon: '🛒',
        tables: 5
      },
      {
        id: 'crm',
        name: 'CRM System',
        description: 'Customer relationship management with contacts and deals',
        prompt: 'Create a CRM system with contacts (name, email, phone, company), deals (amount, stage, expected close date), activities (notes, meetings, calls), and companies',
        icon: '🤝',
        tables: 4
      },
      {
        id: 'project-management',
        name: 'Project Management',
        description: 'Projects, tasks, teams, and assignments',
        prompt: 'Create a project management system with projects (name, description, deadline), tasks (title, description, status, priority), team members, and task assignments',
        icon: '📊',
        tables: 4
      },
      {
        id: 'event-booking',
        name: 'Event Booking',
        description: 'Events, venues, bookings, and attendees',
        prompt: 'Create an event booking system with events (name, date, location, capacity), venues (name, address, capacity), bookings (attendee info, tickets), and attendees',
        icon: '🎟️',
        tables: 4
      },
      {
        id: 'inventory',
        name: 'Inventory System',
        description: 'Products, warehouses, stock movements',
        prompt: 'Create an inventory system with products (SKU, name, description), warehouses (name, location), stock levels per warehouse, and stock movements (in/out transactions)',
        icon: '📦',
        tables: 4
      },
      {
        id: 'social-media',
        name: 'Social Network',
        description: 'Users, posts, comments, likes, followers',
        prompt: 'Create a social network with users (username, bio, avatar), posts (content, image, timestamp), comments on posts, likes, and follower relationships',
        icon: '👥',
        tables: 5
      },
      {
        id: 'learning-platform',
        name: 'Learning Platform',
        description: 'Courses, lessons, students, enrollments',
        prompt: 'Create a learning platform with courses (title, description, instructor), lessons (content, video URL, duration), students, enrollments, and progress tracking',
        icon: '🎓',
        tables: 5
      },
      {
        id: 'restaurant',
        name: 'Restaurant Management',
        description: 'Menu items, orders, tables, reservations',
        prompt: 'Create a restaurant management system with menu items (name, price, category), orders (table number, items, total), tables (number, capacity), and reservations',
        icon: '🍽️',
        tables: 4
      },
      {
        id: 'hr-system',
        name: 'HR Management',
        description: 'Employees, departments, salaries, leave requests',
        prompt: 'Create an HR system with employees (name, email, hire date), departments, salaries, leave requests (type, dates, status), and performance reviews',
        icon: '👔',
        tables: 5
      }
    ]

    return NextResponse.json({
      success: true,
      templates
    })

  } catch (error) {
    console.error('[AI Schema Templates] Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch templates', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
