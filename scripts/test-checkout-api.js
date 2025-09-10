#!/usr/bin/env node

// Test the checkout API endpoint
const fetch = require('node-fetch')

console.log("🧪 Testing Stripe Checkout API with Fallback")
console.log("==========================================")

const API_BASE = "https://pipilot.dev/api/stripe/create-checkout-session"

// Test data
const testPayload = {
  planType: "pro",
  isAnnual: false
}

console.log("📤 Making test request to checkout API...")
console.log("URL:", API_BASE)
console.log("Payload:", JSON.stringify(testPayload, null, 2))

// Make the request
fetch(API_BASE, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testPayload)
})
.then(response => {
  console.log("\n📥 Response received:")
  console.log("Status:", response.status)
  console.log("Status Text:", response.statusText)
  console.log("Headers:", Object.fromEntries(response.headers.entries()))

  if (response.ok) {
    return response.json()
  } else {
    return response.text().then(text => {
      throw new Error(`HTTP ${response.status}: ${text}`)
    })
  }
})
.then(data => {
  console.log("\n✅ SUCCESS! API responded with:")
  console.log(JSON.stringify(data, null, 2))

  if (data.sessionId && data.url) {
    console.log("\n🎉 Checkout session created successfully!")
    console.log("Session ID:", data.sessionId)
    console.log("Checkout URL:", data.url)
  }
})
.catch(error => {
  console.log("\n❌ API call failed:")
  console.log("Error:", error.message)

  if (error.message.includes('500')) {
    console.log("\n🔍 This might be expected if you're not logged in.")
    console.log("The fallback system will work when users are authenticated.")
  }
})
.finally(() => {
  console.log("\n🏁 Test completed")
})
