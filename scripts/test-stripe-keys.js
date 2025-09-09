#!/usr/bin/env node

// Simple test script to verify Stripe API keys
const Stripe = require('stripe')

const primaryKey = process.env.STRIPE_SECRET_KEY
const fallbackKey = "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"

async function testStripeKey(key, label) {
  if (!key) {
    console.log(`${label}: No key provided`)
    return false
  }

  try {
    const stripe = new Stripe(key, {
      apiVersion: "2025-08-27.basil"
    })

    // Test with a simple API call that doesn't cost anything
    await stripe.balance.retrieve()
    console.log(`✅ ${label}: Working!`)
    return true
  } catch (error) {
    console.log(`❌ ${label}: Failed - ${error.message}`)
    return false
  }
}

async function main() {
  console.log("🧪 Testing Stripe API Keys...\n")

  const primaryWorks = await testStripeKey(primaryKey, "Primary Key")
  const fallbackWorks = await testStripeKey(fallbackKey, "Fallback Key")

  console.log("\n📊 Results:")
  if (primaryWorks) {
    console.log("✅ Primary key is working - no fallback needed")
  } else if (fallbackWorks) {
    console.log("⚠️ Primary key failed, but fallback key works!")
  } else {
    console.log("❌ Both keys failed - contact support")
  }
}

main().catch(console.error)
