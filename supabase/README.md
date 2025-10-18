# Supabase Setup for Cloud Sync Feature

This document explains how to set up the necessary Supabase tables for the cloud synchronization feature.

## Prerequisites

1. A Supabase project
2. Supabase CLI installed (optional but recommended)

## Setup Instructions

### 1. Run the Setup Script

Execute the `setup.sql` script in your Supabase SQL editor:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `setup.sql`
4. Paste and run the script

This will create two tables:
- `user_settings` - Stores user preferences including cloud sync settings
- `user_backups` - Stores user data backups as JSON

### 2. Verify Table Creation

After running the script, you should see:
- `user_settings` table with columns: id, user_id, cloud_sync_enabled, last_backup, created_at, updated_at
- `user_backups` table with columns: id, user_id, backup_data, created_at

### 3. Row Level Security (RLS)

The setup script automatically enables RLS and creates policies that ensure:
- Users can only view their own settings and backups
- Users can only modify their own settings and backups
- Users can only delete their own backups

### 4. Indexes

The script creates indexes on `user_id` for both tables to improve query performance.

## Testing the Setup

1. Create a new user account in your application
2. Visit the Account Settings page
3. Enable Cloud Sync
4. Make some changes to your projects
5. Check that backups are being created in the `user_backups` table

## Troubleshooting

If you encounter any issues:

1. Ensure your Supabase project has the latest version
2. Check that you're running the script as a user with sufficient privileges
3. Verify that the auth schema exists and is properly configured