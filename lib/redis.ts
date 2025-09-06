import { Redis } from '@upstash/redis'

// Type definition for subdomain data
export type SubdomainData = {
  name: string;
  userId?: string;
  createdAt: number;
  lastActive?: number;
  deploymentUrl?: string;
}

function normalizeRedisUrl(url: string): string {
  // Convert rediss:// to https://
  if (url.startsWith('rediss://')) {
    const parsedUrl = new URL(url);
    return `https://${parsedUrl.hostname}`;
  }
  
  // If already an https URL, return as-is
  if (url.startsWith('https://')) {
    return url;
  }
  
  // For other cases, try to extract hostname
  try {
    const parsedUrl = new URL(url);
    return `https://${parsedUrl.hostname}`;
  } catch {
    console.warn(`Unable to normalize Redis URL: ${url}`);
    return url;
  }
}

function getRedisConfig() {
  const redisUrl = process.env.KV_URL || 
                   process.env.KV_REST_API_URL || 
                   process.env.REDIS_URL ||
                   process.env.UPSTASH_REDIS_REST_URL

  const token = process.env.KV_REST_API_TOKEN || 
                process.env.KV_TOKEN || 
                process.env.UPSTASH_REDIS_REST_TOKEN

  if (!redisUrl) {
    console.warn('WARNING: No Redis URL found. Using fallback configuration.')
    return { url: 'https://localhost', token: '' }
  }

  const normalizedUrl = normalizeRedisUrl(redisUrl)

  console.log('[Redis Config] Using configuration:', {
    originalUrl: redisUrl,
    normalizedUrl,
    tokenProvided: !!token
  })

  return { 
    url: normalizedUrl,
    token: token || ''
  }
}

export const redis = new Redis(getRedisConfig())

export const domainConfig = {
  protocol: process.env.NODE_ENV === 'production' ? 'https' : 'http',
  rootDomain: process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'pipilot.dev'
}

// Utility functions for subdomain management
export const subdomainUtils = {
  // Create a new subdomain entry
  async create(subdomain: string, data: SubdomainData) {
    try {
      await redis.set(`subdomain:${subdomain}`, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to create subdomain:', error)
      throw error
    }
  },

  // Get a subdomain entry
  async get(subdomain: string): Promise<SubdomainData | null> {
    try {
      const data = await redis.get(`subdomain:${subdomain}`)
      return data ? JSON.parse(data as string) : null
    } catch (error) {
      console.error('Failed to get subdomain:', error)
      return null
    }
  },

  // Delete a subdomain entry
  async delete(subdomain: string) {
    try {
      await redis.del(`subdomain:${subdomain}`)
    } catch (error) {
      console.error('Failed to delete subdomain:', error)
      throw error
    }
  },

  // List subdomains for a specific user
  async listByUser(userId: string): Promise<SubdomainData[]> {
    try {
      const keys = await redis.keys('subdomain:*')
      const subdomains = await Promise.all(
        keys.map(async (key) => {
          const data = await redis.get(key as string)
          return data ? JSON.parse(data as string) : null
        })
      )
      
      return subdomains.filter((subdomain): subdomain is SubdomainData => 
        !!subdomain && subdomain.userId === userId
      )
    } catch (error) {
      console.error('Failed to list subdomains:', error)
      return []
    }
  }
}
