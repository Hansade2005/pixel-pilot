#!/usr/bin/env node

// Quick test for Stripe API key
const Stripe = require('stripe')

const fallbackKey = "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"

console.log("🧪 Quick Stripe API Key Test")
console.log("Key starts with:", fallbackKey.substring(0, 20) + "...")

try {
  const stripe = new Stripe(fallbackKey, {
    apiVersion: "2025-08-27.basil"
  })

  console.log("✅ Stripe instance created successfully")

  // Test basic API call
  stripe.balance.retrieve()
    .then(result => {
      console.log("✅ API call successful!")
      console.log("Balance available:", result.available.length, "entries")
      process.exit(0)
    })
    .catch(error => {
      console.log("❌ API call failed:", error.message)
      process.exit(1)
    })

} catch (error) {
  console.log("❌ Stripe initialization failed:", error.message)
  process.exit(1)
}
