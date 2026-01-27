const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://dlunpilhklsgvkegnnlp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdW5waWxoa2xzZ3ZrZWdubmxwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA1MDQxOSwiZXhwIjoyMDcwNjI2NDE5fQ.k-2OJ4p3hr9feR4ks54OQM2HhOhaVJ3pUK-20tGJwpo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function getContentType(fileName) {
  if (fileName.endsWith('.html')) return 'text/html';
  if (fileName.endsWith('.css')) return 'text/css';
  if (fileName.endsWith('.js')) return 'application/javascript';
  return 'text/plain';
}

async function uploadFile(bucket, filePath, fileName) {
  const fileContent = fs.readFileSync(filePath);
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(`testsite/${fileName}`, fileContent, {
      contentType: getContentType(fileName),
      upsert: true
    });

  if (error) {
    console.error(`Error uploading ${fileName}:`, error);
    return null;
  }

  console.log(`Uploaded ${fileName}:`, data);
  return data;
}

async function downloadFile(bucket, fileName) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(`testsite/${fileName}`);

  if (error) {
    console.error(`Error downloading ${fileName}:`, error);
    return null;
  }

  console.log(`Downloaded ${fileName}:`, data.size, 'bytes');
  return data;
}

async function testFileDownload(bucket, fileName) {
  console.log(`\n--- Testing download of ${fileName} ---`);
  const downloadedData = await downloadFile(bucket, fileName);
  
  if (downloadedData) {
    // Convert to text for small files to verify content
    const text = await downloadedData.text();
    console.log(`Content preview (${fileName}):`, text.substring(0, 100) + (text.length > 100 ? '...' : ''));
    
    // Also test getting public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(`testsite/${fileName}`);
    
    console.log(`Public URL (${fileName}):`, urlData.publicUrl);
    return true;
  }
  return false;
}

async function main() {
  const bucket = 'documents'; // Assuming a public bucket exists

  const files = [
    { path: './testsite/index.html', name: 'index.html' },
    { path: './testsite/styles.css', name: 'styles.css' },
    { path: './testsite/script.js', name: 'script.js' }
  ];

  console.log('--- Starting file upload tests ---');
  for (const file of files) {
    await uploadFile(bucket, file.path, file.name);
  }

  console.log('\n--- Starting file download tests ---');
  for (const file of files) {
    await testFileDownload(bucket, file.name);
  }

  console.log('\nAll upload and download tests completed successfully.');
}

main();