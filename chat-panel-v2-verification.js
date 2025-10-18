// Chat Panel V2 - Verification Test Script
// Run this in browser console after chat panel loads

console.log('🔍 Chat Panel V2 Verification');
console.log('================================');

// 1. Check if component is loaded
const checkComponent = () => {
  const chatInput = document.querySelector('textarea[placeholder*="Type"]');
  console.log('✓ Chat input found:', !!chatInput);
  return !!chatInput;
};

// 2. Check local storage for project
const checkProject = () => {
  const projectData = localStorage.getItem('current-project');
  if (projectData) {
    try {
      const project = JSON.parse(projectData);
      console.log('✓ Current project:', {
        id: project.id,
        name: project.name,
        userId: project.userId
      });
      return project;
    } catch (e) {
      console.error('✗ Failed to parse project data:', e);
      return null;
    }
  } else {
    console.warn('⚠ No project selected');
    return null;
  }
};

// 3. Simulate message send (manual test)
const testMessageSend = () => {
  console.log('\n📝 Manual Test Instructions:');
  console.log('1. Type a message in the chat input');
  console.log('2. Press Enter to send');
  console.log('3. Check browser Network tab for POST /api/chat-v2');
  console.log('4. Verify request payload includes:');
  console.log('   - messages: [{ role: "user", content: "..." }]');
  console.log('   - projectId: "your-project-id"');
  console.log('   - modelId: "grok-code-fast-1"');
  console.log('   - aiMode: "agent"');
  console.log('   - fileTree: [...]');
  console.log('   - files: [...]');
};

// Run all checks
console.log('\n🚀 Running Checks...\n');
checkComponent();
checkProject();
testMessageSend();

console.log('\n✅ Verification complete!');
console.log('================================');
