// Simple script to test backup functionality
const { testBackupExport } = require('../lib/test-backup');

async function runTest() {
  await testBackupExport();
}

runTest().catch(console.error);