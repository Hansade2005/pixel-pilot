const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://dlunpilhklsgvkegnnlp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdW5waWxoa2xzZ3ZrZWdubmxwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA1MDQxOSwiZXhwIjoyMDcwNjI2NDE5fQ.k-2OJ4p3hr9feR4ks54OQM2HhOhaVJ3pUK-20tGJwpo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

function getContentType(fileName) {
  if (fileName.endsWith('.html')) return 'text/html';
  if (fileName.endsWith('.css')) return 'text/css';
  if (fileName.endsWith('.js')) return 'application/javascript';
  return 'text/plain';
}

async function main() {
  const bucket = 'documents'; // Assuming a public bucket exists

  const files = [
    { path: './testsite/index.html', name: 'index.html' },
    { path: './testsite/styles.css', name: 'styles.css' },
    { path: './testsite/script.js', name: 'script.js' }
  ];

  for (const file of files) {
    await uploadFile(bucket, file.path, file.name);
  }

  console.log('All files uploaded successfully.');
}

main();