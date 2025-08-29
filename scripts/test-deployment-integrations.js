#!/usr/bin/env node

/**
 * Deployment System Test Script
 * Tests the GitHub, Vercel, and Netlify deployment integrations
 */

const https = require('https')
const http = require('http')

// Test configuration
const TEST_CONFIG = {
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    testRepo: 'test-deployment-repo'
  },
  vercel: {
    accessToken: process.env.VERCEL_ACCESS_TOKEN
  },
  netlify: {
    accessToken: process.env.NETLIFY_ACCESS_TOKEN
  }
}

class DeploymentTester {
  constructor() {
    this.results = {
      github: { status: 'pending', message: '' },
      vercel: { status: 'pending', message: '' },
      netlify: { status: 'pending', message: '' }
    }
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      reset: '\x1b[0m'
    }
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`)
  }

  async testGitHubConnection() {
    this.log('Testing GitHub API connection...', 'info')

    try {
      if (!TEST_CONFIG.github.clientId || !TEST_CONFIG.github.clientSecret) {
        throw new Error('GitHub credentials not configured')
      }

      // Test basic API access
      const response = await this.makeRequest('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${TEST_CONFIG.github.clientSecret}`,
          'User-Agent': 'AI-App-Builder-Test'
        }
      })

      if (response.statusCode === 200) {
        this.results.github = { status: 'success', message: 'GitHub API connection successful' }
        this.log('✅ GitHub API connection successful', 'success')
      } else {
        throw new Error(`GitHub API returned status ${response.statusCode}`)
      }
    } catch (error) {
      this.results.github = { status: 'error', message: error.message }
      this.log(`❌ GitHub test failed: ${error.message}`, 'error')
    }
  }

  async testVercelConnection() {
    this.log('Testing Vercel API connection...', 'info')

    try {
      if (!TEST_CONFIG.vercel.accessToken) {
        throw new Error('Vercel access token not configured')
      }

      const response = await this.makeRequest('https://api.vercel.com/v1/user', {
        headers: {
          'Authorization': `Bearer ${TEST_CONFIG.vercel.accessToken}`
        }
      })

      if (response.statusCode === 200) {
        this.results.vercel = { status: 'success', message: 'Vercel API connection successful' }
        this.log('✅ Vercel API connection successful', 'success')
      } else {
        throw new Error(`Vercel API returned status ${response.statusCode}`)
      }
    } catch (error) {
      this.results.vercel = { status: 'error', message: error.message }
      this.log(`❌ Vercel test failed: ${error.message}`, 'error')
    }
  }

  async testNetlifyConnection() {
    this.log('Testing Netlify API connection...', 'info')

    try {
      if (!TEST_CONFIG.netlify.accessToken) {
        throw new Error('Netlify access token not configured')
      }

      const response = await this.makeRequest('https://api.netlify.com/api/v1/user', {
        headers: {
          'Authorization': `Bearer ${TEST_CONFIG.netlify.accessToken}`
        }
      })

      if (response.statusCode === 200) {
        this.results.netlify = { status: 'success', message: 'Netlify API connection successful' }
        this.log('✅ Netlify API connection successful', 'success')
      } else {
        throw new Error(`Netlify API returned status ${response.statusCode}`)
      }
    } catch (error) {
      this.results.netlify = { status: 'error', message: error.message }
      this.log(`❌ Netlify test failed: ${error.message}`, 'error')
    }
  }

  makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http

      const request = protocol.request(url, {
        method: 'GET',
        ...options
      }, (response) => {
        resolve(response)
      })

      request.on('error', reject)
      request.end()
    })
  }

  async runAllTests() {
    this.log('🚀 Starting Deployment System Tests', 'info')
    this.log('=' .repeat(50), 'info')

    await Promise.all([
      this.testGitHubConnection(),
      this.testVercelConnection(),
      this.testNetlifyConnection()
    ])

    this.log('=' .repeat(50), 'info')
    this.printSummary()
  }

  printSummary() {
    this.log('📊 Test Results Summary:', 'info')

    Object.entries(this.results).forEach(([service, result]) => {
      const status = result.status === 'success' ? '✅' : result.status === 'error' ? '❌' : '⏳'
      this.log(`${status} ${service.toUpperCase()}: ${result.message}`,
        result.status === 'success' ? 'success' : result.status === 'error' ? 'error' : 'warning')
    })

    const allSuccessful = Object.values(this.results).every(r => r.status === 'success')
    if (allSuccessful) {
      this.log('🎉 All deployment integrations are working correctly!', 'success')
    } else {
      this.log('⚠️  Some integrations need configuration. Check the error messages above.', 'warning')
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new DeploymentTester()
  tester.runAllTests().catch(error => {
    console.error('Test execution failed:', error)
    process.exit(1)
  })
}

module.exports = DeploymentTester
