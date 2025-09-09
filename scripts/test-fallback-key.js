#!/usr/bin/env node

// Test the fallback Stripe API key directly
const Stripe = require('stripe')

const fallbackKey = "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"

async function testFallbackKey() {
  console.log("🧪 Testing Fallback Stripe API Key...\n")

  if (!fallbackKey) {
    console.log("❌ No fallback key provided")
    return
  }

  try {
    const stripe = new Stripe(fallbackKey, {
      apiVersion: "2025-08-27.basil"
    })

    console.log("🔄 Testing API connection...")

    // Test with a simple API call
    const balance = await stripe.balance.retrieve()

    console.log("✅ SUCCESS! Fallback key is working!")
    console.log("📊 Balance response:", {
      available: balance.available,
      pending: balance.pending,
      currency: balance.available[0]?.currency || 'N/A'
    })

    // Test creating a customer (this will be blocked in test mode but shows API works)
    console.log("\n🔄 Testing customer creation...")
    try {
      const testCustomer = await stripe.customers.create({
        email: 'test@example.com',
        name: 'Test User',
        metadata: {
          test: true
        }
      })
      console.log("✅ Customer creation successful!")
      console.log("👤 Customer ID:", testCustomer.id)
    } catch (customerError) {
      console.log("⚠️ Customer creation failed (expected in live mode):", customerError.message)
    }

  } catch (error) {
    console.log("❌ FAILED! Fallback key error:", error.message)
    console.log("🔍 Error details:", {
      type: error.type,
      code: error.code,
      statusCode: error.statusCode
    })
  }
}

testFallbackKey().catch(console.error)
