import { AIToolDefinition } from '@/lib/supabase/tools-types'

// ========== TABLE MANAGEMENT TOOLS ==========

export const listTablesTool: AIToolDefinition = {
  name: 'supabase_list_tables',
  description: 'List all tables in the user\'s Supabase database with metadata like row counts and sizes',
  parameters: {
    authorization: {
      type: 'string',
      description: 'Bearer token for authentication',
      required: true
    }
  },
  returns: {
    type: 'object',
    description: 'List of tables with metadata'
  }
}

export const readTableTool: AIToolDefinition = {
  name: 'supabase_read_table',
  description: 'Read table schema and get a sample row from a specific table',
  parameters: {
    authorization: {
      type: 'string',
      description: 'Bearer token for authentication',
      required: true
    },
    tableName: {
      type: 'string',
      description: 'Name of the table to read',
      required: true
    }
  },
  returns: {
    type: 'object',
    description: 'Table schema and sample data'
  }
}

export const createTableTool: AIToolDefinition = {
  name: 'supabase_create_table',
  description: 'Create a new table in the database using SQL DDL',
  parameters: {
    authorization: {
      type: 'string',
      description: 'Bearer token for authentication',
      required: true
    },
    tableName: {
      type: 'string',
      description: 'Name of the table to create',
      required: true
    },
    schema: {
      type: 'string',
      description: 'SQL DDL statement defining the table structure',
      required: true
    },
    ifNotExists: {
      type: 'boolean',
      description: 'Whether to skip creation if table already exists',
      required: false
    }
  },
  returns: {
    type: 'object',
    description: 'Confirmation of table creation'
  }
}

export const deleteTableTool: AIToolDefinition = {
  name: 'supabase_delete_table',
  description: 'Delete a table from the database',
  parameters: {
    authorization: {
      type: 'string',
      description: 'Bearer token for authentication',
      required: true
    },
    tableName: {
      type: 'string',
      description: 'Name of the table to delete',
      required: true
    },
    cascade: {
      type: 'boolean',
      description: 'Whether to cascade delete dependent objects',
      required: false
    }
  },
  returns: {
    type: 'object',
    description: 'Confirmation of table deletion'
  }
}

// ========== RECORD MANAGEMENT TOOLS ==========

export const insertRecordTool: AIToolDefinition = {
  name: 'supabase_insert_record',
  description: 'Insert a new record into a table',
  parameters: {
    authorization: {
      type: 'string',
      description: 'Bearer token for authentication',
      required: true
    },
    tableName: {
      type: 'string',
      description: 'Name of the table to insert into',
      required: true
    },
    data: {
      type: 'object',
      description: 'Data to insert as key-value pairs',
      required: true
    },
    onConflict: {
      type: 'string',
      description: 'Column name for conflict resolution',
      required: false
    },
    returning: {
      type: 'array',
      description: 'Columns to return after insertion',
      required: false
    }
  },
  returns: {
    type: 'object',
    description: 'Inserted record data'
  }
}

export const updateRecordTool: AIToolDefinition = {
  name: 'supabase_update_record',
  description: 'Update existing records in a table',
  parameters: {
    authorization: {
      type: 'string',
      description: 'Bearer token for authentication',
      required: true
    },
    tableName: {
      type: 'string',
      description: 'Name of the table to update',
      required: true
    },
    data: {
      type: 'object',
      description: 'Data to update as key-value pairs',
      required: true
    },
    where: {
      type: 'object',
      description: 'Conditions to match records for update',
      required: true
    },
    returning: {
      type: 'array',
      description: 'Columns to return after update',
      required: false
    }
  },
  returns: {
    type: 'object',
    description: 'Updated records data'
  }
}

export const deleteRecordTool: AIToolDefinition = {
  name: 'supabase_delete_record',
  description: 'Delete records from a table',
  parameters: {
    authorization: {
      type: 'string',
      description: 'Bearer token for authentication',
      required: true
    },
    tableName: {
      type: 'string',
      description: 'Name of the table to delete from',
      required: true
    },
    where: {
      type: 'object',
      description: 'Conditions to match records for deletion',
      required: true
    },
    returning: {
      type: 'array',
      description: 'Columns to return after deletion',
      required: false
    }
  },
  returns: {
    type: 'object',
    description: 'Deleted records data'
  }
}

// ========== FUNCTION MANAGEMENT TOOLS ==========

export const listFunctionsTool: AIToolDefinition = {
  name: 'supabase_list_functions',
  description: 'List all database functions',
  parameters: {
    authorization: {
      type: 'string',
      description: 'Bearer token for authentication',
      required: true
    }
  },
  returns: {
    type: 'object',
    description: 'List of database functions'
  }
}

export const createFunctionTool: AIToolDefinition = {
  name: 'supabase_create_function',
  description: 'Create a new database function',
  parameters: {
    authorization: {
      type: 'string',
      description: 'Bearer token for authentication',
      required: true
    },
    functionName: {
      type: 'string',
      description: 'Name of the function to create',
      required: true
    },
    schema: {
      type: 'string',
      description: 'Schema where the function will be created',
      required: true
    },
    definition: {
      type: 'string',
      description: 'Function definition SQL',
      required: true
    },
    arguments: {
      type: 'array',
      description: 'Function arguments',
      required: false
    },
    returnType: {
      type: 'string',
      description: 'Function return type',
      required: true
    },
    language: {
      type: 'string',
      description: 'Function language (default: plpgsql)',
      required: false
    },
    volatility: {
      type: 'string',
      description: 'Function volatility',
      required: false,
      enum: ['VOLATILE', 'STABLE', 'IMMUTABLE']
    }
  },
  returns: {
    type: 'object',
    description: 'Function creation confirmation'
  }
}

export const updateFunctionTool: AIToolDefinition = {
  name: 'supabase_update_function',
  description: 'Update an existing database function',
  parameters: {
    authorization: {
      type: 'string',
      description: 'Bearer token for authentication',
      required: true
    },
    functionName: {
      type: 'string',
      description: 'Name of the function to update',
      required: true
    },
    schema: {
      type: 'string',
      description: 'Schema of the function',
      required: true
    },
    newDefinition: {
      type: 'string',
      description: 'New function definition SQL',
      required: true
    },
    newArguments: {
      type: 'array',
      description: 'New function arguments',
      required: false
    },
    newReturnType: {
      type: 'string',
      description: 'New function return type',
      required: false
    },
    newVolatility: {
      type: 'string',
      description: 'New function volatility',
      required: false,
      enum: ['VOLATILE', 'STABLE', 'IMMUTABLE']
    }
  },
  returns: {
    type: 'object',
    description: 'Function update confirmation'
  }
}

export const deleteFunctionTool: AIToolDefinition = {
  name: 'supabase_delete_function',
  description: 'Delete a database function',
  parameters: {
    authorization: {
      type: 'string',
      description: 'Bearer token for authentication',
      required: true
    },
    functionName: {
      type: 'string',
      description: 'Name of the function to delete',
      required: true
    },
    schema: {
      type: 'string',
      description: 'Schema of the function',
      required: true
    }
  },
  returns: {
    type: 'object',
    description: 'Function deletion confirmation'
  }
}

// ========== EXTENSION MANAGEMENT TOOLS ==========

export const listExtensionsTool: AIToolDefinition = {
  name: 'supabase_list_extensions',
  description: 'List available and installed extensions',
  parameters: {
    authorization: {
      type: 'string',
      description: 'Bearer token for authentication',
      required: true
    }
  },
  returns: {
    type: 'object',
    description: 'List of extensions'
  }
}

export const installExtensionTool: AIToolDefinition = {
  name: 'supabase_install_extension',
  description: 'Install a database extension',
  parameters: {
    authorization: {
      type: 'string',
      description: 'Bearer token for authentication',
      required: true
    },
    extensionName: {
      type: 'string',
      description: 'Name of the extension to install',
      required: true
    },
    schema: {
      type: 'string',
      description: 'Schema to install the extension in',
      required: false
    },
    version: {
      type: 'string',
      description: 'Specific version to install',
      required: false
    }
  },
  returns: {
    type: 'object',
    description: 'Extension installation confirmation'
  }
}

export const uninstallExtensionTool: AIToolDefinition = {
  name: 'supabase_uninstall_extension',
  description: 'Uninstall a database extension',
  parameters: {
    authorization: {
      type: 'string',
      description: 'Bearer token for authentication',
      required: true
    },
    extensionName: {
      type: 'string',
      description: 'Name of the extension to uninstall',
      required: true
    },
    cascade: {
      type: 'boolean',
      description: 'Whether to cascade uninstall dependent objects',
      required: false
    }
  },
  returns: {
    type: 'object',
    description: 'Extension uninstallation confirmation'
  }
}

// ========== MIGRATION TOOLS ==========

export const applyMigrationTool: AIToolDefinition = {
  name: 'supabase_apply_migration',
  description: 'Apply a SQL migration to the database',
  parameters: {
    authorization: {
      type: 'string',
      description: 'Bearer token for authentication',
      required: true
    },
    migrationName: {
      type: 'string',
      description: 'Name/identifier for the migration',
      required: true
    },
    sql: {
      type: 'string',
      description: 'SQL migration script to execute',
      required: true
    },
    description: {
      type: 'string',
      description: 'Description of what the migration does',
      required: false
    }
  },
  returns: {
    type: 'object',
    description: 'Migration application confirmation'
  }
}

export const listMigrationsTool: AIToolDefinition = {
  name: 'supabase_list_migrations',
  description: 'List migration history',
  parameters: {
    authorization: {
      type: 'string',
      description: 'Bearer token for authentication',
      required: true
    }
  },
  returns: {
    type: 'object',
    description: 'List of applied migrations'
  }
}

export const rollbackMigrationTool: AIToolDefinition = {
  name: 'supabase_rollback_migration',
  description: 'Rollback a migration',
  parameters: {
    authorization: {
      type: 'string',
      description: 'Bearer token for authentication',
      required: true
    },
    migrationId: {
      type: 'string',
      description: 'ID of the migration to rollback',
      required: true
    },
    targetVersion: {
      type: 'string',
      description: 'Target version to rollback to',
      required: false
    }
  },
  returns: {
    type: 'object',
    description: 'Migration rollback confirmation'
  }
}

// ========== TOOL COLLECTIONS ==========

export const supabaseTableTools = [
  listTablesTool,
  readTableTool,
  createTableTool,
  deleteTableTool
]

export const supabaseRecordTools = [
  insertRecordTool,
  updateRecordTool,
  deleteRecordTool
]

export const supabaseFunctionTools = [
  listFunctionsTool,
  createFunctionTool,
  updateFunctionTool,
  deleteFunctionTool
]

export const supabaseExtensionTools = [
  listExtensionsTool,
  installExtensionTool,
  uninstallExtensionTool
]

export const supabaseMigrationTools = [
  applyMigrationTool,
  listMigrationsTool,
  rollbackMigrationTool
]

// All Supabase tools combined
export const allSupabaseTools = [
  ...supabaseTableTools,
  ...supabaseRecordTools,
  ...supabaseFunctionTools,
  ...supabaseExtensionTools,
  ...supabaseMigrationTools
]

// Tool execution helpers
export const getToolByName = (name: string): AIToolDefinition | undefined => {
  return allSupabaseTools.find(tool => tool.name === name)
}

export const getToolsByCategory = (category: 'tables' | 'records' | 'functions' | 'extensions' | 'migrations') => {
  switch (category) {
    case 'tables': return supabaseTableTools
    case 'records': return supabaseRecordTools
    case 'functions': return supabaseFunctionTools
    case 'extensions': return supabaseExtensionTools
    case 'migrations': return supabaseMigrationTools
    default: return []
  }
}