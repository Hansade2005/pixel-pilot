// Simple test for wildcard subdomain logic
function getSubdomainFromHost(host) {
  // Remove port if present
  const hostname = host.split(':')[0]

  // Check if it's a pipilot.dev subdomain
  if (hostname.endsWith('.pipilot.dev')) {
    const subdomain = hostname.replace('.pipilot.dev', '')

    // Skip www and empty subdomains
    if (subdomain === 'www' || subdomain === '' || subdomain === 'pipilot') {
      return null
    }

    return subdomain
  }

  return null
}

// Test cases
const testCases = [
  'mysite.pipilot.dev',
  'test-app.pipilot.dev',
  'pipilot.dev',
  'www.pipilot.dev',
  'sub.domain.pipilot.dev',
  'localhost:3000',
  'vercel.app'
]

console.log('Testing wildcard subdomain extraction:')
testCases.forEach(host => {
  const subdomain = getSubdomainFromHost(host)
  console.log(`${host} → ${subdomain || 'null'}`)
})
