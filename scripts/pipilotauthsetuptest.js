// Test script for Pipilot authentication system
async function testPipilotAuth() {
  const API_KEY = 'api key'; // Replace with your actual API key
  const DATABASE_ID = '22';

  // Test credentials
  let testEmail = '';
  const testPassword = 'TestPass123';

  try {
    console.log('Testing Pipilot Authentication System...\n');

    console.log('1. Testing user signup...');
    // Test 1: User signup
    testEmail = `test${Date.now()}@example.com`;
    const signupResponse = await fetch(`https://pipilot.dev/api/v1/databases/${DATABASE_ID}/auth/signup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
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
      console.log(`❌ Signup failed: ${signupResponse.status} ${signupResponse.statusText}`, JSON.stringify(errorData, null, 2));
      return; // Exit if signup fails
    }

    console.log('\n2. Testing user login...');
    // Test 2: User login
    const loginResponse = await fetch(`https://pipilot.dev/api/v1/databases/${DATABASE_ID}/auth/login`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    let loginData = null;
    if (loginResponse.ok) {
      loginData = await loginResponse.json();
      console.log('✅ Login successful:', JSON.stringify(loginData, null, 2));
    } else {
      const errorData = await loginResponse.json();
      console.log(`❌ Login failed: ${loginResponse.status} ${loginResponse.statusText}`, JSON.stringify(errorData, null, 2));
      return; // Exit if login fails
    }

    if (loginData && loginData.tokens) {
      console.log('\n3. Testing token verification...');
      // Test 3: Verify token
      const verifyResponse = await fetch(`https://pipilot.dev/api/v1/databases/${DATABASE_ID}/auth/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: loginData.tokens.access_token
        })
      });

      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        console.log('✅ Token verification successful:', JSON.stringify(verifyData, null, 2));
      } else {
        const errorData = await verifyResponse.json();
        console.log(`❌ Token verification failed: ${verifyResponse.status} ${verifyResponse.statusText}`, JSON.stringify(errorData, null, 2));
      }

      console.log('\n4. Testing token refresh...');
      // Test 4: Refresh token
      const refreshResponse = await fetch(`https://pipilot.dev/api/v1/databases/${DATABASE_ID}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refresh_token: loginData.tokens.refresh_token
        })
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        console.log('✅ Token refresh successful:', JSON.stringify(refreshData, null, 2));
      } else {
        const errorData = await refreshResponse.json();
        console.log(`❌ Token refresh failed: ${refreshResponse.status} ${refreshResponse.statusText}`, JSON.stringify(errorData, null, 2));
      }

      console.log('\n5. Testing invalid token verification...');
      // Test 5: Invalid token
      const invalidTokenResponse = await fetch(`https://pipilot.dev/api/v1/databases/${DATABASE_ID}/auth/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: 'invalid.jwt.token'
        })
      });

      if (!invalidTokenResponse.ok) {
        const errorData = await invalidTokenResponse.json();
        console.log('✅ Invalid token correctly rejected:', JSON.stringify(errorData, null, 2));
      } else {
        console.log('❌ Invalid token was accepted (should have failed)');
      }
    }

    console.log('\n🎉 Pipilot Authentication System Test Complete!');

  } catch (error) {
    console.error('❌ Error testing Pipilot Auth:', error);
  }
}

// Run the auth test
testPipilotAuth();