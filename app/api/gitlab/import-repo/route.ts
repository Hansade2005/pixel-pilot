import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60 // Allow up to 60 seconds for large repos
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { repoUrl } = await request.json()

    if (!repoUrl) {
      return NextResponse.json({ error: 'Repository URL is required' }, { status: 400 })
    }

    // Parse GitLab URL to extract owner and repo
    // Supports both gitlab.com and self-hosted GitLab instances
    const urlMatch = repoUrl.match(/(?:https?:\/\/)?([^\/]+)\/([^\/]+)\/([^\/]+)(?:\/|$)/i)
    if (!urlMatch) {
      return NextResponse.json({ error: 'Invalid GitLab repository URL' }, { status: 400 })
    }

    const [, domain, owner, repo] = urlMatch
    const cleanRepo = repo.replace(/\.git$/, '') // Remove .git suffix if present

    console.log(`Importing GitLab repo: ${domain}/${owner}/${cleanRepo}`)

    // GitLab uses different URL structure for downloads
    // Try main branch first, then master
    const baseUrl = domain.includes('gitlab.com') ? 'https://gitlab.com' : `https://${domain}`
    const zipUrl = `${baseUrl}/${owner}/${cleanRepo}/-/archive/main/${cleanRepo}-main.zip`
    console.log(`Downloading from: ${zipUrl}`)

    let finalResponse = await fetch(zipUrl, {
      headers: {
        'Accept': 'application/zip, application/octet-stream, */*'
      }
    })
    let branch = 'main'

    if (!finalResponse.ok) {
      if (finalResponse.status === 404) {
        // Try master branch if main doesn't exist
        const masterZipUrl = `${baseUrl}/${owner}/${cleanRepo}/-/archive/master/${cleanRepo}-master.zip`
        console.log(`Main branch not found, trying master: ${masterZipUrl}`)
        finalResponse = await fetch(masterZipUrl, {
          headers: {
            'Accept': 'application/zip, application/octet-stream, */*'
          }
        })
        branch = 'master'

        if (!finalResponse.ok) {
          return NextResponse.json({
            error: 'Repository not found or not accessible. Make sure it\'s a public repository.'
          }, { status: 404 })
        }
      } else {
        return NextResponse.json({
          error: 'Failed to download repository. Make sure it\'s a public repository.'
        }, { status: finalResponse.status })
      }
    }

    // Check content type
    const contentType = finalResponse.headers.get('content-type')
    console.log(`Content-Type: ${contentType}`)

    // Get the zip data as buffer
    const arrayBuffer = await finalResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    console.log(`Downloaded ${buffer.length} bytes`)

    // Return binary data directly instead of base64
    // This avoids the 33% size increase from base64 encoding
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${cleanRepo}-${branch}.zip"`,
        'X-Repo-Name': cleanRepo,
        'X-Owner': owner,
        'X-Domain': domain,
        'X-Branch': branch,
        'Access-Control-Expose-Headers': 'X-Repo-Name, X-Owner, X-Domain, X-Branch'
      }
    })

  } catch (error) {
    console.error('Error importing GitLab repo:', error)
    return NextResponse.json({
      error: 'Failed to import repository. Please check the URL and try again.'
    }, { status: 500 })
  }
}