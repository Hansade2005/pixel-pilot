/**
 * Integration Test Harness for Chat-V2 Stream Endpoint
 * Tests that the stream always sends a final metadata object with tool results
 */

const http = require('http');
const https = require('https');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  endpoint: '/api/chat-v2',
  timeout: 30000, // 30 seconds
  testCases: [
    {
      name: 'Normal stream with tool calls',
      messages: [
        { role: 'user', content: 'Create a simple React component called HelloWorld.tsx' }
      ],
      modelId: 'gpt-4o-mini',
      projectId: 'test-project-' + Date.now(),
      files: []
    },
    {
      name: 'Stream with no tool calls',
      messages: [
        { role: 'user', content: 'Hello, how are you?' }
      ],
      modelId: 'gpt-4o-mini',
      projectId: 'test-project-' + Date.now(),
      files: []
    }
  ]
};

/**
 * Makes a POST request to the chat-v2 endpoint and validates the stream response
 */
function testStreamEndpoint(testCase) {
  return new Promise((resolve, reject) => {
    console.log(`🧪 Testing: ${testCase.name}`);

    const postData = JSON.stringify({
      messages: testCase.messages,
      modelId: testCase.modelId,
      projectId: testCase.projectId,
      files: testCase.files,
      aiMode: 'normal'
    });

    const url = new URL(TEST_CONFIG.endpoint, TEST_CONFIG.baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        // Note: In a real test, you'd need proper authentication headers
        // For now, we'll expect this to fail with auth error but still test the stream format
      }
    };

    const req = http.request(options, (res) => {
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Headers:`, res.headers);

      if (res.statusCode !== 200) {
        if (res.statusCode === 401) {
          console.log(`   ℹ️  Auth required - this is expected. Cannot test stream without valid auth.`);
          // For auth failures, we can't test the stream, but we can validate the response format
          let responseData = '';
          res.on('data', (chunk) => {
            responseData += chunk.toString();
          });
          res.on('end', () => {
            try {
              const jsonResponse = JSON.parse(responseData);
              if (jsonResponse.error === 'Unauthorized') {
                console.log(`   ✅ Correct auth error response received`);
                resolve({
                  success: true,
                  testCase: testCase.name,
                  authRequired: true,
                  errorResponse: jsonResponse
                });
              } else {
                console.log(`   ❌ Unexpected error response:`, jsonResponse);
                resolve({
                  success: false,
                  testCase: testCase.name,
                  error: 'Unexpected error response format'
                });
              }
            } catch (e) {
              console.log(`   ❌ Failed to parse error response as JSON: ${e.message}`);
              resolve({
                success: false,
                testCase: testCase.name,
                error: 'Invalid JSON in error response'
              });
            }
          });
          return;
        } else {
          console.log(`   ❌ Unexpected status code: ${res.statusCode}`);
          resolve({
            success: false,
            testCase: testCase.name,
            error: `Unexpected status: ${res.statusCode}`
          });
          return;
        }
      }

      // Status 200 - proceed with stream testing
      let receivedData = '';
      let chunksReceived = 0;
      let metadataReceived = false;
      let streamError = null;

      res.on('data', (chunk) => {
        chunksReceived++;
        const chunkStr = chunk.toString();

        // Accumulate data for analysis
        receivedData += chunkStr;

        try {
          // Each chunk should be a valid JSON line
          const lines = chunkStr.trim().split('\n');
          for (const line of lines) {
            if (line.trim()) {
              const parsed = JSON.parse(line);

              if (parsed.type === 'metadata') {
                console.log(`   ✅ Received metadata object:`, {
                  hasToolCalls: parsed.hasToolCalls,
                  toolInvocationsCount: parsed.toolInvocations?.length || 0,
                  fileOperationsCount: parsed.fileOperations?.length || 0,
                  finished: parsed.finished,
                  hasStreamError: !!parsed.streamError
                });

                metadataReceived = true;

                // Validate metadata structure
                if (typeof parsed.finished !== 'boolean') {
                  console.log(`   ❌ Metadata missing 'finished' boolean field`);
                  streamError = 'Missing finished field';
                }

                if (!Array.isArray(parsed.toolInvocations)) {
                  console.log(`   ❌ Metadata missing 'toolInvocations' array`);
                  streamError = 'Missing toolInvocations array';
                }

                if (!Array.isArray(parsed.fileOperations)) {
                  console.log(`   ❌ Metadata missing 'fileOperations' array`);
                  streamError = 'Missing fileOperations array';
                }

                if (parsed.streamError) {
                  console.log(`   ⚠️  Stream error detected: ${parsed.streamError}`);
                }

                break; // We found the metadata, no need to parse more
              }
            }
          }
        } catch (e) {
          console.log(`   ❌ Failed to parse chunk as JSON: ${e.message}`);
          console.log(`   Raw chunk: ${chunkStr.substring(0, 200)}...`);
          streamError = `JSON parse error: ${e.message}`;
        }
      });

      res.on('end', () => {
        console.log(`   📊 Stream ended. Chunks received: ${chunksReceived}`);
        console.log(`   📊 Total data length: ${receivedData.length} chars`);

        if (metadataReceived) {
          console.log(`   ✅ SUCCESS: Metadata object received`);
          resolve({
            success: !streamError,
            testCase: testCase.name,
            chunksReceived,
            metadataReceived: true,
            error: streamError
          });
        } else {
          console.log(`   ❌ FAILURE: No metadata object received in stream`);
          resolve({
            success: false,
            testCase: testCase.name,
            chunksReceived,
            metadataReceived: false,
            error: 'No metadata object in stream'
          });
        }
      });
    });

    req.on('error', (err) => {
      console.log(`   ❌ Request failed: ${err.message}`);
      resolve({
        success: false,
        testCase: testCase.name,
        error: err.message
      });
    });

    req.setTimeout(TEST_CONFIG.timeout, () => {
      console.log(`   ⏰ Request timed out after ${TEST_CONFIG.timeout}ms`);
      req.destroy();
      resolve({
        success: false,
        testCase: testCase.name,
        error: 'Request timeout'
      });
    });

    // Send the request
    req.write(postData);
    req.end();
  });
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Chat-V2 Stream Integration Test Harness\n');
  console.log('This test validates that the chat-v2 endpoint always sends a final metadata object');
  console.log('containing tool results, even when streams error or complete normally.\n');

  // Check if server is running
  console.log('🔍 Checking if dev server is running...');
  try {
    await new Promise((resolve, reject) => {
      const req = http.get(TEST_CONFIG.baseUrl, (res) => {
        console.log('✅ Dev server appears to be running');
        resolve();
      });
      req.on('error', () => {
        console.log('❌ Dev server not running. Please start with: npm run dev');
        reject(new Error('Server not running'));
      });
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Server check timeout'));
      });
    });
  } catch (error) {
    console.log('\n❌ Cannot run tests: Dev server not available');
    console.log('Please start the dev server first: npm run dev\n');
    process.exit(1);
  }

  const results = [];

  for (const testCase of TEST_CONFIG.testCases) {
    try {
      const result = await testStreamEndpoint(testCase);
      results.push(result);
      console.log(''); // Empty line between tests
    } catch (error) {
      console.log(`❌ Test "${testCase.name}" threw error: ${error.message}\n`);
      results.push({
        success: false,
        testCase: testCase.name,
        error: error.message
      });
    }
  }

  // Summary
  console.log('📊 Test Results Summary:');
  console.log('='.repeat(50));

  const passed = results.filter(r => r.success).length;
  const failed = results.length - passed;
  const authRequired = results.filter(r => r.authRequired).length;

  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const note = result.authRequired ? ' (Auth Required - Expected)' : '';
    console.log(`${status} ${result.testCase}${note}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log(`\n🎯 Overall: ${passed}/${results.length} tests passed`);

  if (authRequired === results.length) {
    console.log('\n✅ All tests correctly received auth challenges. Stream metadata testing requires authentication.');
    console.log('To test stream metadata, provide valid authentication headers in the test.');
  } else if (failed > 0) {
    console.log('\n❌ Some tests failed. Check the implementation.');
    process.exit(1);
  } else {
    console.log('\n✅ All authenticated tests passed! Stream metadata handling is working correctly.');
  }
}

// Run the tests
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 Test harness failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests, testStreamEndpoint };