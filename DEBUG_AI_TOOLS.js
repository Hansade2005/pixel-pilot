// Quick test for AI tools debugging
// Run this in the browser console when you experience the issue

console.log('=== AI Tools Debug Test ===');

// Test the API endpoint directly
async function testChatAPI() {
  const testMessage = "hello read the package.json";
  
  // Get current project (you need to be in a workspace)
  const currentProject = window.location.href.includes('workspace') ? 
    'Check if project is selected in the workspace' : 'Not in workspace';
  
  console.log('Current context:', {
    url: window.location.href,
    project: currentProject
  });
  
  // Try to make a request to the chat API
  const body = {
    messages: [{ role: 'user', content: testMessage }],
    projectId: 'test-project-id', // Replace with actual project ID
    useTools: true,
    project: { id: 'test-project-id', name: 'Test Project' },
    files: []
  };
  
  console.log('Request body:', body);
  
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.get('content-type'));
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.toolCalls && data.toolCalls.length > 0) {
        console.log('✅ Tools were called:', data.toolCalls);
      } else {
        console.log('❌ No tools were called');
        console.log('AI Response:', data.message);
      }
    } else {
      const error = await response.text();
      console.error('API Error:', error);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Run the test
testChatAPI();

console.log('=== Check browser console for [DEBUG] Chat API logs ===');
console.log('Look for logs starting with "[DEBUG] Chat API - Tools enabled" or "[DEBUG] Chat API - Tools NOT enabled"');