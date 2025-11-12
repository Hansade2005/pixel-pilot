import { AIToolDefinition } from '@/lib/supabase/tools-types'
import { getToolByName } from '@/lib/supabase/tools-definitions'

/**
 * Execute a Supabase tool by calling the appropriate API endpoint
 */
export async function executeSupabaseTool(
  toolName: string,
  parameters: Record<string, any>,
  userToken: string
): Promise<any> {
  const tool = getToolByName(toolName)
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`)
  }

  // Validate required parameters
  for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
    if (paramDef.required && !(paramName in parameters)) {
      throw new Error(`Missing required parameter: ${paramName}`)
    }
  }

  // Build API request
  const requestBody = {
    ...parameters,
    authorization: `Bearer ${userToken}`
  }

  // Map tool names to API endpoints
  const endpointMap: Record<string, { path: string, method: 'GET' | 'POST' }> = {
    // Table tools
    'supabase_list_tables': { path: '/api/supabase/tables/list', method: 'GET' },
    'supabase_read_table': { path: '/api/supabase/tables/read', method: 'POST' },
    'supabase_create_table': { path: '/api/supabase/tables/create', method: 'POST' },
    'supabase_delete_table': { path: '/api/supabase/tables/delete', method: 'POST' },

    // Record tools
    'supabase_insert_record': { path: '/api/supabase/records/insert', method: 'POST' },
    'supabase_update_record': { path: '/api/supabase/records/update', method: 'POST' },
    'supabase_delete_record': { path: '/api/supabase/records/delete', method: 'POST' },

    // Function tools
    'supabase_list_functions': { path: '/api/supabase/functions/list', method: 'GET' },
    'supabase_create_function': { path: '/api/supabase/functions/create', method: 'POST' },
    'supabase_update_function': { path: '/api/supabase/functions/update', method: 'POST' },
    'supabase_delete_function': { path: '/api/supabase/functions/delete', method: 'POST' },

    // Extension tools
    'supabase_list_extensions': { path: '/api/supabase/extensions/list', method: 'GET' },
    'supabase_install_extension': { path: '/api/supabase/extensions/install', method: 'POST' },
    'supabase_uninstall_extension': { path: '/api/supabase/extensions/uninstall', method: 'POST' },

    // Migration tools
    'supabase_apply_migration': { path: '/api/supabase/migrations/apply', method: 'POST' },
    'supabase_list_migrations': { path: '/api/supabase/migrations/history', method: 'GET' },
    'supabase_rollback_migration': { path: '/api/supabase/migrations/rollback', method: 'POST' }
  }

  const endpoint = endpointMap[toolName]
  if (!endpoint) {
    throw new Error(`No endpoint mapping found for tool: ${toolName}`)
  }

  try {
    // Make the API call
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const url = `${baseUrl}${endpoint.path}`

    const requestOptions: RequestInit = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      }
    }

    // For POST requests, include the body
    if (endpoint.method === 'POST') {
      // Remove authorization from body since it's in headers
      const { authorization, ...bodyParams } = requestBody
      requestOptions.body = JSON.stringify(bodyParams)
    }

    const response = await fetch(url, requestOptions)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorData.error || 'Unknown error'}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(`API operation failed: ${result.error || 'Unknown error'}`)
    }

    return result.data || result

  } catch (error: any) {
    console.error(`Error executing tool ${toolName}:`, error)
    throw new Error(`Tool execution failed: ${error.message}`)
  }
}

/**
 * Get all available Supabase tools for AI integration
 */
export function getAvailableSupabaseTools(): AIToolDefinition[] {
  // Import all tools
  const { allSupabaseTools } = require('@/lib/supabase/tools-definitions')
  return allSupabaseTools
}

/**
 * Validate tool parameters against the tool definition
 */
export function validateToolParameters(
  toolName: string,
  parameters: Record<string, any>
): { valid: boolean, errors: string[] } {
  const tool = getToolByName(toolName)
  if (!tool) {
    return { valid: false, errors: [`Unknown tool: ${toolName}`] }
  }

  const errors: string[] = []

  for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
    // Check required parameters
    if (paramDef.required && !(paramName in parameters)) {
      errors.push(`Missing required parameter: ${paramName}`)
      continue
    }

    // Skip validation if parameter is not provided and not required
    if (!(paramName in parameters)) continue

    const value = parameters[paramName]

    // Type validation
    switch (paramDef.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`Parameter ${paramName} must be a string`)
        }
        break
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`Parameter ${paramName} must be a number`)
        }
        break
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`Parameter ${paramName} must be a boolean`)
        }
        break
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push(`Parameter ${paramName} must be an object`)
        }
        break
      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`Parameter ${paramName} must be an array`)
        }
        break
    }

    // Enum validation
    if (paramDef.enum && !paramDef.enum.includes(value)) {
      errors.push(`Parameter ${paramName} must be one of: ${paramDef.enum.join(', ')}`)
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Tool execution wrapper with validation
 */
export async function executeSupabaseToolWithValidation(
  toolName: string,
  parameters: Record<string, any>,
  userToken: string
): Promise<any> {
  // Validate parameters first
  const validation = validateToolParameters(toolName, parameters)
  if (!validation.valid) {
    throw new Error(`Parameter validation failed: ${validation.errors.join(', ')}`)
  }

  // Execute the tool
  return executeSupabaseTool(toolName, parameters, userToken)
}