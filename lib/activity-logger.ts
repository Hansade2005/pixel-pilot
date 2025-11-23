import { createAdminClient } from '@/lib/supabase/admin';

export type ActivityType =
    | 'table_created'
    | 'table_updated'
    | 'table_deleted'
    | 'file_uploaded'
    | 'file_deleted'
    | 'api_key_created'
    | 'api_key_deleted';

export type EntityType = 'table' | 'file' | 'api_key';

interface LogActivityParams {
    databaseId: number;
    userId: string;
    activityType: ActivityType;
    entityType: EntityType;
    entityName: string;
    metadata?: Record<string, any>;
}

/**
 * Log an activity to the database_activity table
 */
export async function logActivity({
    databaseId,
    userId,
    activityType,
    entityType,
    entityName,
    metadata = {},
}: LogActivityParams): Promise<void> {
    try {
        const supabase = createAdminClient();

        const { error } = await supabase.from('database_activity').insert({
            database_id: databaseId,
            user_id: userId,
            activity_type: activityType,
            entity_type: entityType,
            entity_name: entityName,
            metadata,
        });

        if (error) {
            console.error('Failed to log activity:', error);
            // Don't throw - activity logging should not break the main operation
        }
    } catch (error) {
        console.error('Error logging activity:', error);
        // Silently fail - activity logging is not critical
    }
}

/**
 * Helper function to log table creation
 */
export async function logTableCreated(
    databaseId: number,
    userId: string,
    tableName: string,
    columnsCount: number
) {
    return logActivity({
        databaseId,
        userId,
        activityType: 'table_created',
        entityType: 'table',
        entityName: tableName,
        metadata: { columns_count: columnsCount },
    });
}

/**
 * Helper function to log table update
 */
export async function logTableUpdated(
    databaseId: number,
    userId: string,
    tableName: string
) {
    return logActivity({
        databaseId,
        userId,
        activityType: 'table_updated',
        entityType: 'table',
        entityName: tableName,
    });
}

/**
 * Helper function to log table deletion
 */
export async function logTableDeleted(
    databaseId: number,
    userId: string,
    tableName: string
) {
    return logActivity({
        databaseId,
        userId,
        activityType: 'table_deleted',
        entityType: 'table',
        entityName: tableName,
    });
}

/**
 * Helper function to log file upload
 */
export async function logFileUploaded(
    databaseId: number,
    userId: string,
    fileName: string,
    fileSize: number,
    mimeType: string,
    isPublic: boolean
) {
    return logActivity({
        databaseId,
        userId,
        activityType: 'file_uploaded',
        entityType: 'file',
        entityName: fileName,
        metadata: {
            file_size: fileSize,
            mime_type: mimeType,
            is_public: isPublic,
        },
    });
}

/**
 * Helper function to log file deletion
 */
export async function logFileDeleted(
    databaseId: number,
    userId: string,
    fileName: string
) {
    return logActivity({
        databaseId,
        userId,
        activityType: 'file_deleted',
        entityType: 'file',
        entityName: fileName,
    });
}

/**
 * Helper function to log API key creation
 */
export async function logApiKeyCreated(
    databaseId: number,
    userId: string,
    keyName: string
) {
    return logActivity({
        databaseId,
        userId,
        activityType: 'api_key_created',
        entityType: 'api_key',
        entityName: keyName,
    });
}

/**
 * Helper function to log API key deletion
 */
export async function logApiKeyDeleted(
    databaseId: number,
    userId: string,
    keyName: string
) {
    return logActivity({
        databaseId,
        userId,
        activityType: 'api_key_deleted',
        entityType: 'api_key',
        entityName: keyName,
    });
}
