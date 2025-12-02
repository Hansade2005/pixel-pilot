import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60 // Allow up to 60 seconds for large repos
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { repoUrl } = await request.json()

    if (!repoUrl) {
      return NextResponse.json({ error: 'Repository URL is required' }, { status: 400 })
    }

    // Parse GitHub URL to extract owner and repo
    const urlMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\/|$)/i)
    if (!urlMatch) {
      return NextResponse.json({ error: 'Invalid GitHub repository URL' }, { status: 400 })
    }

    const [, owner, repo] = urlMatch
    const cleanRepo = repo.replace(/\.git$/, '') // Remove .git suffix if present

    console.log(`Importing GitHub repo: ${owner}/${cleanRepo}`)

    // Download the repository as zip
    const zipUrl = `https://github.com/${owner}/${cleanRepo}/archive/refs/heads/main.zip`
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
        const masterZipUrl = `https://github.com/${owner}/${cleanRepo}/archive/refs/heads/master.zip`
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
        'X-Branch': branch,
        'Access-Control-Expose-Headers': 'X-Repo-Name, X-Owner, X-Branch'
      }
    })

  } catch (error) {
    console.error('Error importing GitHub repo:', error)
    return NextResponse.json({
      error: 'Failed to import repository. Please check the URL and try again.'
    }, { status: 500 })
  }
}