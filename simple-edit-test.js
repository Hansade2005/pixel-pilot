// Simplified test for edit_file logic without TypeScript imports
console.log('🧪 Testing edit_file logic manually...');

// Helper to parse search/replace blocks (copied from client-file-tools.ts)
function parseSearchReplaceBlock(blockText) {
  const SEARCH_START = "<<<<<<< SEARCH";
  const DIVIDER = "=======";
  const REPLACE_END = ">>>>>>> REPLACE";

  const lines = blockText.split('\n');
  let searchLines = [];
  let replaceLines = [];
  let mode = 'none'; // 'search' | 'replace'

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === SEARCH_START) {
      mode = 'search';
    } else if (line.trim() === DIVIDER && mode === 'search') {
      mode = 'replace';
    } else if (line.trim() === REPLACE_END && mode === 'replace') {
      break; // End of block
    } else if (mode === 'search') {
      searchLines.push(line);
    } else if (mode === 'replace') {
      replaceLines.push(line);
    }
  }

  // Remove empty lines from start and end
  while (searchLines.length > 0 && searchLines[0].trim() === '') searchLines.shift();
  while (searchLines.length > 0 && searchLines[searchLines.length - 1].trim() === '') searchLines.pop();
  while (replaceLines.length > 0 && replaceLines[0].trim() === '') replaceLines.shift();
  while (replaceLines.length > 0 && replaceLines[replaceLines.length - 1].trim() === '') replaceLines.pop();

  if (searchLines.length === 0) {
    return null; // Invalid block
  }

  return {
    search: searchLines.join('\n'),
    replace: replaceLines.join('\n')
  };
}

// Test file content
const testFileContent = `// Test file for edit operations
console.log("Hello World");
console.log("This is a test file");
console.log("For testing edit operations");
console.log("End of file");`;

console.log('📝 Original test file content:');
console.log(testFileContent);
console.log('');

// Test search/replace block
const searchReplaceBlock = `<<<<<<< SEARCH
console.log("Hello World");
console.log("This is a test file");
=======
console.log("Hello Modified World!");
console.log("This file has been edited successfully");
>>>>>>> REPLACE`;

console.log('🔧 Search/replace block:');
console.log(searchReplaceBlock);
console.log('');

// Parse the block
const editBlock = parseSearchReplaceBlock(searchReplaceBlock);
console.log('🔍 Parsed block:');
console.log('Search:', JSON.stringify(editBlock?.search));
console.log('Replace:', JSON.stringify(editBlock?.replace));
console.log('');

// Check if search text exists in file
if (editBlock && testFileContent.includes(editBlock.search)) {
  console.log('✅ Search text found in file content');

  // Apply the replacement
  const modifiedContent = testFileContent.replace(editBlock.search, editBlock.replace);

  console.log('🔄 Modified content:');
  console.log(modifiedContent);
  console.log('');

  console.log('✅ Edit operation would succeed!');
} else {
  console.log('❌ Search text NOT found in file content');
  console.log('Expected to find:', JSON.stringify(editBlock?.search));
  console.log('In content:', JSON.stringify(testFileContent));
}