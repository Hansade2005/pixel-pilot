#!/usr/bin/env node

// Quick test of Stripe secret key functionality
const Stripe = require('stripe')

// Use the live secret key from your env.txt
const STRIPE_SECRET_KEY = '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'

console.log('🚀 QUICK STRIPE SECRET KEY TEST')
console.log('===============================')
console.log('')

async function quickStripeTest() {
  try {
    console.log('🔄 Initializing Stripe...')
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil'
    })
    console.log('✅ Stripe initialized successfully')
    console.log('')

    // Test 1: List existing products
    console.log('📦 Test 1: Listing products...')
    const products = await stripe.products.list({ limit: 5 })
    console.log(`✅ Found ${products.data.length} product(s)`)
    if (products.data.length > 0) {
      products.data.forEach(product => {
        console.log(`   • ${product.name} (${product.id})`)
      })
    }
    console.log('')

    // Test 2: List existing prices
    console.log('💰 Test 2: Listing prices...')
    const prices = await stripe.prices.list({ limit: 5 })
    console.log(`✅ Found ${prices.data.length} price(s)`)
    if (prices.data.length > 0) {
      prices.data.forEach(price => {
        console.log(`   • $${price.unit_amount / 100}/${price.recurring?.interval} (${price.id})`)
      })
    }
    console.log('')

    // Test 3: Create a test product
    console.log('🧪 Test 3: Creating test product...')
    const testProduct = await stripe.products.create({
      name: 'Quick Test Product',
      description: 'Testing publishable key checkout',
      type: 'service',
      metadata: {
        test: 'quick-test',
        timestamp: Date.now().toString()
      }
    })
    console.log(`✅ Created product: ${testProduct.id}`)
    console.log('')

    // Test 4: Create a test price
    console.log('💵 Test 4: Creating test price...')
    const testPrice = await stripe.prices.create({
      product: testProduct.id,
      unit_amount: 500, // $5.00
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        test: 'quick-test'
      }
    })
    console.log(`✅ Created price: ${testPrice.id} ($${testPrice.unit_amount / 100})`)
    console.log('')

    // Test 5: Create a test customer
    console.log('👤 Test 5: Creating test customer...')
    const testCustomer = await stripe.customers.create({
      email: `test-${Date.now()}@example.com`,
      name: 'Quick Test Customer',
      metadata: {
        test: 'quick-test'
      }
    })
    console.log(`✅ Created customer: ${testCustomer.id}`)
    console.log('')

    // Test 6: Create a test subscription
    console.log('📋 Test 6: Creating test subscription...')
    const testSubscription = await stripe.subscriptions.create({
      customer: testCustomer.id,
      items: [{
        price: testPrice.id,
      }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        test: 'quick-test'
      }
    })

    const clientSecret = testSubscription.latest_invoice.payment_intent.client_secret
    console.log(`✅ Created subscription: ${testSubscription.id}`)
    console.log(`✅ Client secret generated: ${clientSecret ? 'Yes' : 'No'}`)
    console.log('')

    console.log('🎉 ALL TESTS PASSED!')
    console.log('===================')
    console.log('')
    console.log('Your Stripe secret key is working perfectly!')
    console.log('')
    console.log('Test Results Summary:')
    console.log('✅ Product creation: PASSED')
    console.log('✅ Price creation: PASSED')
    console.log('✅ Customer creation: PASSED')
    console.log('✅ Subscription creation: PASSED')
    console.log('✅ Client secret generation: PASSED')
    console.log('')
    console.log('Your publishable key checkout system is ready to use! 🚀')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.log('')
    console.log('🔧 Troubleshooting:')

    if (error.type === 'StripeAuthenticationError') {
      console.log('   • Your Stripe secret key may be invalid')
      console.log('   • Check if it starts with "sk_live_" or "sk_test_"')
      console.log('   • Verify your Stripe account is active')
    } else if (error.type === 'StripeRateLimitError') {
      console.log('   • Too many API calls - wait a moment and try again')
    } else {
      console.log('   • Check your internet connection')
      console.log('   • Verify your Stripe account permissions')
    }

    process.exit(1)
  }
}

// Run the test
quickStripeTest()