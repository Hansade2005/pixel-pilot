import { NextResponse } from 'next/server'

/**
 * Check if PiPilot deployment is properly configured
 */
export async function GET() {
  try {
    const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID
    const CF_API_TOKEN = process.env.CF_API_TOKEN

    if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
      return NextResponse.json({ 
        configured: false, 
        message: 'Cloudflare credentials not configured. Please set CF_ACCOUNT_ID and CF_API_TOKEN environment variables.' 
      }, { status: 200 })
    }

    // Test the credentials by making a simple API call
    try {
      const testResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
      })

      if (testResponse.ok) {
        const data = await testResponse.json() as { success: boolean; result?: { name: string } }
        if (data.success) {
          return NextResponse.json({ 
            configured: true, 
            message: 'PiPilot deployment is properly configured.',
            accountName: data.result?.name || 'Unknown'
          }, { status: 200 })
        }
      }

      // If we get here, credentials are invalid
      return NextResponse.json({ 
        configured: false, 
        message: 'Cloudflare credentials are invalid. Please check your CF_ACCOUNT_ID and CF_API_TOKEN.' 
      }, { status: 200 })

    } catch (error) {
      return NextResponse.json({ 
        configured: false, 
        message: 'Failed to validate Cloudflare credentials. Please check your configuration.' 
      }, { status: 200 })
    }

  } catch (error) {
    console.error('Configuration check error:', error)
    return NextResponse.json({ 
      configured: false, 
      message: 'Internal error checking configuration.' 
    }, { status: 500 })
  }
}