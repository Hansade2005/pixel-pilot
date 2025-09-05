/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      // Handle root path for wildcard subdomains
      {
        source: '/',
        destination: '/api/serve/',
        has: [
          {
            type: 'host',
            value: '^[a-z0-9][a-z0-9-]*[a-z0-9]\\.pipilot\\.dev$'
          }
        ]
      },
      // Handle all other paths for wildcard subdomains
      {
        source: '/((?!api/).+)',
        destination: '/api/serve/$1',
        has: [
          {
            type: 'host',
            value: '^[a-z0-9][a-z0-9-]*[a-z0-9]\\.pipilot\\.dev$'
          }
        ]
      }
    ]
  },
  async headers() {
    return [
      // Cache headers for served files
      {
        source: '/api/serve/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type'
          }
        ]
      }
    ]
  }
}

export default nextConfig
