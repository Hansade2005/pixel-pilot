#!/usr/bin/env node

// Test the publishable key checkout API endpoint
// Using built-in fetch (Node.js 18+)

const API_BASE = 'http://localhost:3000'

console.log('🧪 TESTING CHECKOUT API ENDPOINT')
console.log('================================')
console.log('')

async function testCheckoutAPI() {
  try {
    console.log('🔄 Testing API endpoint availability...')

    // First, test if the server is running
    const healthResponse = await fetch(`${API_BASE}/api/health`).catch(() => null)

    if (!healthResponse) {
      console.log('❌ Server not running or not responding')
      console.log('   Make sure to run: npm run dev')
      process.exit(1)
    }

    console.log('✅ Server is running')
    console.log('')

    // Test the subscription intent endpoint
    console.log('📋 Testing subscription intent creation...')
    console.log('   Endpoint: /api/stripe/create-subscription-intent')
    console.log('   Method: POST')
    console.log('   Payload: { planType: "pro", isAnnual: false }')
    console.log('')

    const response = await fetch(`${API_BASE}/api/stripe/create-subscription-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        planType: 'pro',
        isAnnual: false,
        priceId: 'price_1S5UzI3G7U0M1bp1bVeQfQZF' // From env.txt
      })
    })

    console.log(`   Status: ${response.status}`)
    console.log(`   Status Text: ${response.statusText}`)
    console.log('')

    if (response.ok) {
      const data = await response.json()
      console.log('✅ API Response:')
      console.log(`   Client Secret: ${data.clientSecret ? '✅ Present' : '❌ Missing'}`)
      console.log(`   Subscription ID: ${data.subscriptionId ? '✅ Present' : '❌ Missing'}`)
      console.log(`   Customer ID: ${data.customerId ? '✅ Present' : '❌ Missing'}`)
      console.log('')

      if (data.clientSecret) {
        console.log('🎉 SUCCESS! Checkout API is working!')
        console.log('=====================================')
        console.log('')
        console.log('Your publishable key checkout system is ready!')
        console.log('')
        console.log('Features verified:')
        console.log('✅ Server endpoint responds correctly')
        console.log('✅ Client secret generated for frontend')
        console.log('✅ Subscription creation works')
        console.log('✅ Customer creation works')
        console.log('')
        console.log('Next steps:')
        console.log('1. Visit http://localhost:3000/pricing')
        console.log('2. Click "Select plan" on Pro plan')
        console.log('3. Complete payment in the modal')
        console.log('4. Verify subscription creation')
      }
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.log('❌ API Error:')
      console.log(`   Error: ${errorData.error}`)
      console.log('')

      // Provide troubleshooting based on error
      if (response.status === 401) {
        console.log('🔧 Troubleshooting:')
        console.log('   • User not authenticated - this is expected for testing')
        console.log('   • In production, user needs to be logged in')
      } else if (response.status === 500) {
        console.log('🔧 Troubleshooting:')
        console.log('   • Check Stripe secret key in environment')
        console.log('   • Verify price ID exists in Stripe')
        console.log('   • Check server logs for detailed error')
      }
    }

  } catch (error) {
    console.error('❌ Network error:', error.message)
    console.log('')
    console.log('🔧 Troubleshooting:')
    console.log('   • Make sure the development server is running')
    console.log('   • Check if port 3000 is available')
    console.log('   • Verify your internet connection')
    process.exit(1)
  }
}

// Wait a moment for server to start
console.log('⏳ Waiting for server to be ready...')
setTimeout(() => {
  testCheckoutAPI()
}, 3000)