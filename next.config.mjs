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
      // Handle wildcard subdomains for pipilot.dev
      {
        source: '/:path*',
        destination: '/api/serve/:path*',
        has: [
          {
            type: 'host',
            value: '*.pipilot.dev'
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
