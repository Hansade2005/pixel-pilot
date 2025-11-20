`# Pipilot Authentication Setup Guide

## Overview
This guide provides a step-by-step walkthrough for implementing authentication in your Next.js or Vite/React projects using Pipilot's database and auth endpoints. Follow these exact steps to replicate the working auth setup.

 auth implementation works correctly:

\`\`\`javascript
// Test script for Pipilot authentication system  Esnure when implementing pipilot auth ssytem in every framework , use this simple method for implementing auth login and signup in any app simple and straight  forward no complexe setup. 
async function testPipilotAuth() {
  const API_KEY = 'your_api_key_here'; // From .env.local
  const DATABASE_ID = '15'; // Your database ID

  // Test credentials
  let testEmail = '';
  const testPassword = 'TestPass123';

  try {
    console.log('Testing Pipilot Authentication System...\n');

    console.log('1. Testing user signup...');
    // Test 1: User signup
    testEmail = \`test\${Date.now()}@example.com\`;
    const signupResponse = await fetch(\`https://pipilot.dev/api/v1/databases/\${DATABASE_ID}/auth/signup\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        full_name: 'Test User'
      })
    });

    let signupData = null;
    if (signupResponse.ok) {
      signupData = await signupResponse.json();
      console.log('✅ Signup successful:', JSON.stringify(signupData, null, 2));
    } else {
      const errorData = await signupResponse.json();
      console.log(\`❌ Signup failed: \${signupResponse.status} \${signupResponse.statusText}\`, JSON.stringify(errorData, null, 2));
      return; // Exit if signup fails
    }

    console.log('\n2. Testing user login...');
    // Test 2: User login
    const loginResponse = await fetch(\`https://pipilot.dev/api/v1/databases/\${DATABASE_ID}/auth/login\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful:', JSON.stringify(loginData, null, 2));
    } else {
      const errorData = await loginResponse.json();
      console.log(\`❌ Login failed: \${loginResponse.status} \${loginResponse.statusText}\`, JSON.stringify(errorData, null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testPipilotAuth();
\`\`\`

## Troubleshooting
- **"Invalid API key format"**: Ensure your API key starts with \`sk_live_\` and is correctly set in \`.env.local\`
- **Environment variables not loading**: Restart your dev server after adding \`.env.local\`
- **Database connection issues**: Verify your \`DATABASE_ID\` matches your Pipilot database
- **Route errors**: Ensure all route files are created with the exact paths and code provided

## Next Steps
- Implement protected routes using the \`useAuth\` hook
- Add token refresh logic for long-running sessions
- Create user profile management features
- Add logout functionality to your UI

This setup provides a complete, production-ready authentication system for your Next.js or Vite/React projects using Pipilot's backend services.
**Built with ❤️ by the pipilot.dev team**`