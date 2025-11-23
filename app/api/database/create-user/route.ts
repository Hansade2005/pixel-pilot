import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createDatabaseBucket } from '@/lib/storage';

/**
 * POST /api/database/create-user
 * Creates a new database for an authenticated user with auto-generated users table and storage bucket
 * This endpoint uses the authenticated user's ID instead of 'system'
 */
export async function POST(request: Request) {
    try {
        const { projectId, name } = await request.json();

        if (!projectId) {
            return NextResponse.json(
                { error: 'Project ID is required' },
                { status: 400 }
            );
        }

        // Get authenticated user
        const supabase = await createClient();
        const { data: { user }, error: sessionError } = await supabase.auth.getUser();

        if (sessionError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized - Please log in' },
                { status: 401 }
            );
        }

        // Use admin client for database operations
        const supabaseAdmin = createAdminClient();

        // Use the authenticated user's ID
        const userId = user.id;

        // Check if database already exists for this project
        const { data: existingDatabase, error: checkError } = await supabaseAdmin
            .from('databases')
            .select('*')
            .eq('project_id', projectId)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking existing database:', checkError);
            return NextResponse.json(
                { error: 'Failed to check existing database' },
                { status: 500 }
            );
        }

        if (existingDatabase) {
            return NextResponse.json(
                {
                    error: 'Database already exists for this project',
                    database: existingDatabase
                },
                { status: 400 }
            );
        }

        // Create the database with authenticated user's ID
        const { data: database, error: dbError } = await supabaseAdmin
            .from('databases')
            .insert({
                user_id: userId,
                project_id: projectId,
                name: name || 'main'
            })
            .select()
            .single();

        if (dbError) {
            console.error('Error creating database:', dbError);
            return NextResponse.json(
                { error: `Failed to create database: ${dbError.message}` },
                { status: 500 }
            );
        }

        // Auto-create users table for authentication
        const usersTableSchema = {
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    primary_key: true,
                    required: true,
                    default: 'gen_random_uuid()'
                },
                {
                    name: 'email',
                    type: 'text',
                    unique: true,
                    required: true
                },
                {
                    name: 'password_hash',
                    type: 'text',
                    required: true
                },
                {
                    name: 'full_name',
                    type: 'text',
                    required: false
                },
                {
                    name: 'avatar_url',
                    type: 'text',
                    required: false
                },
                {
                    name: 'created_at',
                    type: 'timestamp',
                    required: true,
                    default: 'NOW()'
                },
                {
                    name: 'updated_at',
                    type: 'timestamp',
                    required: true,
                    default: 'NOW()'
                }
            ]
        };

        const { data: usersTable, error: tableError } = await supabaseAdmin
            .from('tables')
            .insert({
                database_id: database.id,
                name: 'users',
                schema_json: usersTableSchema
            })
            .select()
            .single();

        if (tableError) {
            console.error('Error creating users table:', tableError);
            // Rollback: delete the database if table creation fails
            await supabaseAdmin.from('databases').delete().eq('id', database.id);
            return NextResponse.json(
                { error: `Failed to create users table: ${tableError.message}` },
                { status: 500 }
            );
        }

        // Create storage bucket for the database
        try {
            const storageBucket = await createDatabaseBucket(database.id, database.name);
            console.log('Storage bucket created:', storageBucket);
        } catch (storageError: any) {
            console.error('Error creating storage bucket:', storageError);
            // Don't rollback the entire database, just log the error
            // The storage bucket can be created later if needed
            console.warn('Database created without storage bucket. It can be initialized later.');
        }

        return NextResponse.json({
            success: true,
            database,
            usersTable,
            message: 'Database created successfully with users table and storage bucket'
        });

    } catch (error: any) {
        console.error('Unexpected error in create database:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
