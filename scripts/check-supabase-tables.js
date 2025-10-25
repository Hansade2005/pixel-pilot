// Direct PostgreSQL connection to list all tables in Supabase
const { Client } = require('pg');

// Use direct connection (non-pooling)
const connectionString = process.env.POSTGRES_URL_NON_POOLING ||
  'postgres://postgres.lzuknbfbvpuscpammwzg:1dJEall1AxiHSC0e@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require';

async function checkTables() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false // Accept self-signed certificates
    }
  });

  try {
    console.log('🔗 Connecting to Supabase PostgreSQL...\n');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Query all tables in public schema
    console.log('📊 Tables in public schema:\n');
    const tablesResult = await client.query(`
      SELECT
        tablename as name,
        schemaname as schema
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    if (tablesResult.rows.length === 0) {
      console.log('⚠️  No tables found in public schema\n');
    } else {
      tablesResult.rows.forEach((table, index) => {
        console.log(`${index + 1}. ${table.name}`);
      });
      console.log(`\nTotal: ${tablesResult.rows.length} tables\n`);
    }

    // Check if Team Workspaces tables exist
    console.log('🔍 Checking for Team Workspaces tables:\n');
    const teamTables = [
      'organizations',
      'team_members',
      'team_workspaces',
      'workspace_members',
      'team_invitations',
      'team_activity'
    ];

    for (const tableName of teamTables) {
      const exists = tablesResult.rows.some(row => row.name === tableName);
      console.log(`${exists ? '✅' : '❌'} ${tableName}`);
    }

    // Get row counts for existing tables
    console.log('\n📈 Row counts for all tables:\n');
    for (const table of tablesResult.rows) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) FROM "${table.name}"`);
        const count = countResult.rows[0].count;
        console.log(`${table.name}: ${count} rows`);
      } catch (err) {
        console.log(`${table.name}: Error reading (${err.message})`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await client.end();
    console.log('\n✅ Connection closed');
  }
}

checkTables();
