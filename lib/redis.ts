import { Redis } from '@upstash/redis'

// Type definition for subdomain data
export type SubdomainData = {
  name: string;
  userId?: string;
  createdAt: number;
  lastActive?: number;
  deploymentUrl?: string;
}

export const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN
})

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
