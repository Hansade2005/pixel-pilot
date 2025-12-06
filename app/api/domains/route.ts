import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Vercel } from '@vercel/sdk'

// Vercel configuration
const VERCEL_TOKEN = process.env.VERCEL_TOKEN!
const VERCEL_PROJECT_NAME = 'pixel-pilot'
const VERCEL_PROJECT_ID = 'prj_JFqriEOhgPe8TVrwSk5kjhgTdS9g'
const VERCEL_TEAM_ID = 'team_xlFcuiXJWFIQ7ISEFPnsvkNP'

const vercel = new Vercel({
  bearerToken: VERCEL_TOKEN,
})

/**
 * POST /api/domains - Add and verify a custom domain
 * Step 1: Add to Vercel account
 * Step 2: Add to Vercel project
 * Step 3: Verify domain
 * Step 4: Add to Supabase custom_domains table
 */
export async function POST(req: Request) {
  try {
    const { domain, projectId, userId } = await req.json()

    if (!domain || !projectId || !userId) {
      return NextResponse.json(
        { error: 'Domain, projectId, and userId are required' },
        { status: 400 }
      )
    }

    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user || user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[Domain Manager] Adding domain ${domain} to Vercel project ${VERCEL_PROJECT_NAME}...`)

    // Step 1 & 2: Add domain to Vercel project (this handles both adding to account and project)
    try {
      const addDomainResponse = await vercel.projects.addProjectDomain({
        idOrName: VERCEL_PROJECT_NAME,
        teamId: VERCEL_TEAM_ID,
        requestBody: {
          name: domain.toLowerCase().trim(),
        },
      })

      console.log(`[Domain Manager] Domain added to Vercel:`, addDomainResponse)

      // Step 3: Verify domain ownership
      const verifyResponse = await vercel.projects.verifyProjectDomain({
        idOrName: VERCEL_PROJECT_NAME,
        teamId: VERCEL_TEAM_ID,
        domain: domain.toLowerCase().trim(),
      })

      console.log(`[Domain Manager] Verification response:`, verifyResponse)

      // Step 4: Check domain configuration
      const configResponse = await vercel.domains.getDomainConfig({
        domain: domain.toLowerCase().trim(),
        teamId: VERCEL_TEAM_ID,
      })

      const isVerified = verifyResponse.verified || false
      const isMisconfigured = configResponse.misconfigured || false

      console.log(`[Domain Manager] Domain verified: ${isVerified}, Misconfigured: ${isMisconfigured}`)

      // Step 5: Add to Supabase custom_domains table (only if verified)
      if (isVerified && !isMisconfigured) {
        const { data: domainRecord, error: dbError } = await supabase
          .from('custom_domains')
          .insert({
            domain: domain.toLowerCase().trim(),
            project_id: projectId,
            user_id: userId,
            verified: true,
            vercel_domain_id: addDomainResponse.name || domain,
            created_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (dbError) {
          console.error('[Domain Manager] Database error:', dbError)
          throw dbError
        }

        return NextResponse.json({
          success: true,
          verified: true,
          domain: domainRecord,
          message: 'Domain connected successfully!',
          vercelData: {
            ...addDomainResponse,
            verification: verifyResponse,
            config: configResponse,
          },
        })
      } else {
        // Domain added but not verified - return verification instructions
        return NextResponse.json({
          success: true,
          verified: false,
          requiresVerification: true,
          domain: {
            domain: domain.toLowerCase().trim(),
            project_id: projectId,
            user_id: userId,
            verified: false,
          },
          verificationInstructions: {
            type: configResponse.configuredBy === 'CNAME' ? 'CNAME' : 'TXT',
            name: configResponse.configuredBy === 'CNAME' ? '@' : '_vercel',
            value: configResponse.configuredBy === 'CNAME' 
              ? `cname.vercel-dns.com` 
              : 'vercel-dns-verification',
          },
          message: 'Domain added, verification required',
          vercelData: {
            ...addDomainResponse,
            verification: verifyResponse,
            config: configResponse,
          },
        })
      }
    } catch (vercelError: any) {
      console.error('[Domain Manager] Vercel API error:', vercelError)
      
      // Handle domain already exists
      if (vercelError.message?.includes('already exists') || vercelError.statusCode === 409) {
        return NextResponse.json({
          error: 'Domain already exists on Vercel. Please remove it first or verify ownership.',
          details: vercelError.message,
        }, { status: 409 })
      }

      throw vercelError
    }
  } catch (error: any) {
    console.error('[Domain Manager] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to add domain', 
        details: error.message || 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/domains - Remove domain from Vercel and database
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const domainId = searchParams.get('id')
    const domain = searchParams.get('domain')

    if (!domainId || !domain) {
      return NextResponse.json(
        { error: 'Domain ID and domain name are required' },
        { status: 400 }
      )
    }

    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[Domain Manager] Removing domain ${domain} from Vercel project...`)

    try {
      // Step 1: Remove from Vercel project
      await vercel.projects.removeProjectDomain({
        idOrName: VERCEL_PROJECT_NAME,
        teamId: VERCEL_TEAM_ID,
        domain: domain.toLowerCase().trim(),
      })

      console.log(`[Domain Manager] Domain removed from Vercel project`)

      // Step 2: Optionally delete from Vercel account entirely (uncomment if needed)
      // await vercel.domains.deleteDomain({
      //   domain: domain.toLowerCase().trim(),
      //   teamId: VERCEL_TEAM_ID,
      // })

      // Step 3: Remove from Supabase database
      const { error: dbError } = await supabase
        .from('custom_domains')
        .delete()
        .eq('id', domainId)
        .eq('user_id', user.id)

      if (dbError) {
        console.error('[Domain Manager] Database error:', dbError)
        throw dbError
      }

      return NextResponse.json({
        success: true,
        message: 'Domain disconnected successfully',
      })
    } catch (vercelError: any) {
      console.error('[Domain Manager] Vercel API error:', vercelError)
      
      // If domain not found in Vercel, still remove from database
      if (vercelError.statusCode === 404) {
        const { error: dbError } = await supabase
          .from('custom_domains')
          .delete()
          .eq('id', domainId)
          .eq('user_id', user.id)

        if (!dbError) {
          return NextResponse.json({
            success: true,
            message: 'Domain removed from database (not found in Vercel)',
          })
        }
      }

      throw vercelError
    }
  } catch (error: any) {
    console.error('[Domain Manager] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to remove domain', 
        details: error.message || 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/domains - Verify an existing domain
 */
export async function PATCH(req: Request) {
  try {
    const { domainId, domain, projectId, userId } = await req.json()

    if (!domainId || !domain) {
      return NextResponse.json(
        { error: 'Domain ID and domain name are required' },
        { status: 400 }
      )
    }

    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user || user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[Domain Manager] Verifying domain ${domain}...`)

    try {
      // Verify domain in Vercel
      const verifyResponse = await vercel.projects.verifyProjectDomain({
        idOrName: VERCEL_PROJECT_NAME,
        teamId: VERCEL_TEAM_ID,
        domain: domain.toLowerCase().trim(),
      })

      // Check domain configuration
      const configResponse = await vercel.domains.getDomainConfig({
        domain: domain.toLowerCase().trim(),
        teamId: VERCEL_TEAM_ID,
      })

      const isVerified = verifyResponse.verified || false
      const isMisconfigured = configResponse.misconfigured || false

      if (isVerified && !isMisconfigured) {
        // Update Supabase record
        const { data: updatedDomain, error: dbError } = await supabase
          .from('custom_domains')
          .update({ verified: true })
          .eq('id', domainId)
          .eq('user_id', user.id)
          .select()
          .single()

        if (dbError) throw dbError

        return NextResponse.json({
          success: true,
          verified: true,
          domain: updatedDomain,
          message: 'Domain verified successfully!',
        })
      } else {
        return NextResponse.json({
          success: false,
          verified: false,
          message: 'Domain verification failed. Please check DNS settings.',
          verificationInstructions: {
            type: configResponse.configuredBy === 'CNAME' ? 'CNAME' : 'TXT',
            name: configResponse.configuredBy === 'CNAME' ? '@' : '_vercel',
            value: configResponse.configuredBy === 'CNAME' 
              ? `cname.vercel-dns.com` 
              : 'vercel-dns-verification',
          },
        }, { status: 400 })
      }
    } catch (vercelError: any) {
      console.error('[Domain Manager] Vercel verification error:', vercelError)
      throw vercelError
    }
  } catch (error: any) {
    console.error('[Domain Manager] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to verify domain', 
        details: error.message || 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
