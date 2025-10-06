/**
 * Schema validation helpers for database tables
 */

import { TableSchema, Column } from './supabase';

const VALID_COLUMN_TYPES = ['text', 'number', 'boolean', 'timestamp', 'uuid', 'json'] as const;

/**
 * Validates a table schema structure
 */
export function validateTableSchema(schema: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!schema || typeof schema !== 'object') {
    errors.push('Schema must be an object');
    return { valid: false, errors };
  }

  if (!schema.columns || !Array.isArray(schema.columns)) {
    errors.push('Schema must have a columns array');
    return { valid: false, errors };
  }

  if (schema.columns.length === 0) {
    errors.push('Schema must have at least one column');
    return { valid: false, errors };
  }

  // Validate each column
  schema.columns.forEach((column: any, index: number) => {
    if (!column.name || typeof column.name !== 'string') {
      errors.push(`Column ${index}: name is required and must be a string`);
    }

    if (!column.type || !VALID_COLUMN_TYPES.includes(column.type)) {
      errors.push(`Column ${index} (${column.name}): type must be one of ${VALID_COLUMN_TYPES.join(', ')}`);
    }

    // Validate column name format (alphanumeric and underscore only)
    if (column.name && !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(column.name)) {
      errors.push(`Column ${index} (${column.name}): name must start with a letter and contain only letters, numbers, and underscores`);
    }
  });

  // Check for duplicate column names
  const columnNames = schema.columns.map((col: any) => col.name).filter(Boolean);
  const duplicates = columnNames.filter((name: string, index: number) => 
    columnNames.indexOf(name) !== index
  );
  if (duplicates.length > 0) {
    errors.push(`Duplicate column names found: ${[...new Set(duplicates)].join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates data against a table schema
 */
export function validateDataAgainstSchema(
  data: any,
  schema: TableSchema
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Data must be an object');
    return { valid: false, errors };
  }

  // Check each column in schema
  schema.columns.forEach((column: Column) => {
    const value = data[column.name];

    // Check required fields
    if (column.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field '${column.name}' is required`);
      return;
    }

    // Skip validation if value is not provided and not required
    if (value === undefined || value === null) {
      return;
    }

    // Type validation
    switch (column.type) {
      case 'text':
        if (typeof value !== 'string') {
          errors.push(`Field '${column.name}' must be text (string)`);
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`Field '${column.name}' must be a number`);
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`Field '${column.name}' must be a boolean (true/false)`);
        }
        break;

      case 'timestamp':
        // Check if it's a valid date string or Date object
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errors.push(`Field '${column.name}' must be a valid timestamp`);
        }
        break;

      case 'uuid':
        // Basic UUID format validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(value)) {
          errors.push(`Field '${column.name}' must be a valid UUID`);
        }
        break;

      case 'json':
        // Check if it's a valid JSON structure (object or array)
        if (typeof value !== 'object' && !Array.isArray(value)) {
          errors.push(`Field '${column.name}' must be a JSON object or array`);
        }
        break;
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitizes data by removing fields not in schema
 */
export function sanitizeData(data: any, schema: TableSchema): any {
  const sanitized: any = {};
  const allowedFields = schema.columns.map(col => col.name);

  allowedFields.forEach(field => {
    if (data.hasOwnProperty(field)) {
      sanitized[field] = data[field];
    }
  });

  return sanitized;
}

/**
 * Applies default values from schema to data
 */
export function applyDefaultValues(data: any, schema: TableSchema): any {
  const result = { ...data };

  schema.columns.forEach(column => {
    if (column.default !== undefined && (result[column.name] === undefined || result[column.name] === null)) {
      // Handle special default values
      if (column.default === 'NOW()' || column.default === 'now()') {
        result[column.name] = new Date().toISOString();
      } else if (column.default === 'gen_random_uuid()' || column.default === 'uuid()') {
        result[column.name] = crypto.randomUUID();
      } else {
        result[column.name] = column.default;
      }
    }
  });

  return result;
}

/**
 * Gets column names from schema
 */
export function getColumnNames(schema: TableSchema): string[] {
  return schema.columns.map(col => col.name);
}

/**
 * Gets required columns from schema
 */
export function getRequiredColumns(schema: TableSchema): string[] {
  return schema.columns
    .filter(col => col.required)
    .map(col => col.name);
}

/**
 * Checks if a column exists in schema
 */
export function columnExists(schema: TableSchema, columnName: string): boolean {
  return schema.columns.some(col => col.name === columnName);
}

/**
 * Gets column definition from schema
 */
export function getColumn(schema: TableSchema, columnName: string): Column | undefined {
  return schema.columns.find(col => col.name === columnName);
}

/**
 * Validates table name
 */
export function validateTableName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Table name is required' };
  }

  if (name.length < 1 || name.length > 63) {
    return { valid: false, error: 'Table name must be between 1 and 63 characters' };
  }

  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
    return { valid: false, error: 'Table name must start with a letter and contain only letters, numbers, and underscores' };
  }

  // Reserved table names
  const reserved = ['user', 'users', 'system', 'admin', 'root', 'database', 'table', 'column'];
  if (reserved.includes(name.toLowerCase()) && name !== 'users') {
    return { valid: false, error: `'${name}' is a reserved table name` };
  }

  return { valid: true };
}
