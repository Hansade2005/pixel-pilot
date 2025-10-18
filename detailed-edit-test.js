// Detailed test for edit_file client tool execution
import { handleClientFileOperation } from './lib/client-file-tools.ts';

console.log('🧪 Testing edit_file client tool execution...');

// First, let's create a test file with known content
const testFileContent = `// Test file for edit operations
console.log("Hello World");
console.log("This is a test file");
console.log("For testing edit operations");
console.log("End of file");`;

console.log('📝 Test file content:');
console.log(testFileContent);
console.log('');

// Mock tool call for edit_file - let's try a simple replacement
const mockToolCall = {
  toolName: 'edit_file',
  toolCallId: 'test-edit-call-123',
  args: {
    filePath: 'test-edit-file.js',
    searchReplaceBlock: `<<<<<<< SEARCH
console.log("Hello World");
console.log("This is a test file");
=======
console.log("Hello Modified World!");
console.log("This file has been edited successfully");
>>>>>>> REPLACE`
  },
  dynamic: false
};

console.log('🔧 Tool call args:');
console.log('filePath:', mockToolCall.args.filePath);
console.log('searchReplaceBlock:');
console.log(mockToolCall.args.searchReplaceBlock);
console.log('');

// Mock addToolResult function to capture results
let capturedResult = null;
const mockAddToolResult = (result) => {
  capturedResult = result;
  console.log('📤 Tool result captured:');
  console.log(JSON.stringify(result, null, 2));
};

// Test the edit_file functionality
async function testEditFile() {
  try {
    console.log('🚀 Running edit_file test...');

    // First, let's manually check what the parseSearchReplaceBlock function returns
    const { parseSearchReplaceBlock } = await import('./lib/client-file-tools.ts');
    const parsedBlock = parseSearchReplaceBlock(mockToolCall.args.searchReplaceBlock);

    console.log('🔍 Parsed search/replace block:');
    console.log('Search:', JSON.stringify(parsedBlock?.search));
    console.log('Replace:', JSON.stringify(parsedBlock?.replace));
    console.log('');

    // Check if the search text exists in our test content
    if (parsedBlock && testFileContent.includes(parsedBlock.search)) {
      console.log('✅ Search text found in test content');
      const newContent = testFileContent.replace(parsedBlock.search, parsedBlock.replace);
      console.log('🔄 Replacement result:');
      console.log(newContent);
    } else {
      console.log('❌ Search text NOT found in test content');
      console.log('Expected to find:', JSON.stringify(parsedBlock?.search));
    }

    console.log('');
    console.log('⚡ Executing actual tool...');
    await handleClientFileOperation(mockToolCall, 'test-project', mockAddToolResult);

    console.log('');
    console.log('📊 Test completed. Result:');
    if (capturedResult) {
      console.log('✅ Tool executed successfully');
      if (capturedResult.output) {
        console.log('Output success:', capturedResult.output.success);
        console.log('Output message:', capturedResult.output.message);
      } else if (capturedResult.errorText) {
        console.log('❌ Tool failed with error:', capturedResult.errorText);
      }
    } else {
      console.log('❌ No result captured - tool may not have executed');
    }

  } catch (error) {
    console.error('💥 Test failed with exception:', error);
  }
}

testEditFile();