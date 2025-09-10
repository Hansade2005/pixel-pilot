#!/usr/bin/env node

// Script to help generate or identify a new Stripe API key
console.log("🔑 STRIPE API KEY DIAGNOSTIC")
console.log("============================")

console.log("\n📋 Current Status:")
console.log("❌ Primary key: Expired")
console.log("❌ Fallback key: Also expired")

console.log("\n🔧 Required Action:")
console.log("You need to obtain a NEW, VALID Stripe API key from your Stripe dashboard.")

console.log("\n📝 Steps to get a new key:")
console.log("1. Go to https://dashboard.stripe.com/")
console.log("2. Navigate to 'Developers' → 'API Keys'")
console.log("3. Create a new 'Secret key' (starts with sk_live_ or sk_test_)")
console.log("4. Replace the expired key in your environment variables")

console.log("\n⚙️ Update locations:")
console.log("- Environment variable: STRIPE_SECRET_KEY")
console.log("- Or update the fallback key in the code")

console.log("\n💡 For testing, you can also:")
console.log("- Use Stripe test keys (sk_test_*) for development")
console.log("- Get a new live key from Stripe dashboard")

console.log("\n🚨 IMPORTANT:")
console.log("Never share or commit real API keys to version control!")
console.log("Always use environment variables for sensitive data!")

console.log("\n📞 Need help?")
console.log("Contact Stripe support or check their documentation:")
console.log("https://stripe.com/docs/keys")
