// Script to list all tables in Supabase database
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lzuknbfbvpuscpammwzg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6dWtuYmZidnB1c2NwYW1td3pnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTcwMzc2MiwiZXhwIjoyMDcxMjc5NzYyfQ.w-TNgYK-7xM5rnT3ki3F_al2-kgl3gIc9sIUcTnHnSQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  console.log('🔍 Fetching tables from Supabase...\n');

  try {
    // Check known tables directly
    console.log('🔍 Checking known tables:\n');

    const knownTables = [
      'profiles',
      'user_settings',
      'user_backups',
      'system_settings',
      'databases',
      'tables',
      'records',
      'api_keys',
      'storage_objects',
      'organizations',
      'team_members',
      'team_workspaces',
      'workspace_members',
      'team_invitations',
      'team_activity'
    ];

    for (const tableName of knownTables) {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        console.log(`✅ ${tableName} (${count || 0} rows)`);
      } else {
        console.log(`❌ ${tableName} - ${error.message}`);
      }
    }

  } catch (err) {
    console.error('❌ Fatal error:', err.message);
  }
}

listTables().then(() => {
  console.log('\n✅ Done!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
