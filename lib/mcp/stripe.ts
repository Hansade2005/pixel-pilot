// lib/mcp/stripe.ts
import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp'
import { getDeploymentTokens } from '@/lib/cloud-sync'

const STRIPE_MCP_URL = 'https://mcp.stripe.com'

export async function createStripeMCPClient(userId: string) {
  // Get the user's Stripe secret key from the database
  const tokens = await getDeploymentTokens(userId)
  const stripeSecretKey = tokens?.stripe

  if (!stripeSecretKey) {
    throw new Error('No Stripe secret key found for user')
  }

  const mcpClient = await createMCPClient({
    transport: {
      type: 'http',
      url: STRIPE_MCP_URL,
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
      },
    },
  })
  return mcpClient
}