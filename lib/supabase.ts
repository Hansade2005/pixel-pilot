import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client (for browser usage)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client (for API routes with admin privileges)
export const getServerSupabase = () => {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// Type definitions for our database schema
export interface Database {
  id: number;
  user_id: string;
  project_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Table {
  id: number;
  database_id: number;
  name: string;
  schema_json: TableSchema;
  created_at: string;
  updated_at: string;
}

export interface TableSchema {
  columns: Column[];
}

export interface Column {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'datetime' | 'timestamp' | 'uuid' | 'json' | 'email' | 'url';
  primary_key?: boolean;
  required?: boolean;
  unique?: boolean;
  default?: any;
  defaultValue?: string; // Alias for default
  description?: string; // Column description/documentation
  references?: {
    table: string;
    column: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  };
  // Check constraints
  min?: number;          // For numbers/strings (length)
  max?: number;          // For numbers/strings (length)
  minLength?: number;    // For strings
  maxLength?: number;    // For strings
  pattern?: string;      // Regex pattern
  enum?: string[];       // Allowed values
  // Computed field
  computed?: string;     // Expression for computed fields
  // Indexing
  indexed?: boolean;     // Create index on this column
}

export interface Record {
  id: number;
  table_id: number;
  data_json: any;
  created_at: string;
  updated_at: string;
}
