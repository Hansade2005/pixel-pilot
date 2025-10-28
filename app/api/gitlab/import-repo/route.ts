import { NextRequest, NextResponse } from 'next/server'

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

    const response = await fetch(zipUrl)

    if (!response.ok) {
      if (response.status === 404) {
        // Try master branch if main doesn't exist
        const masterZipUrl = `${baseUrl}/${owner}/${cleanRepo}/-/archive/master/${cleanRepo}-master.zip`
        console.log(`Main branch not found, trying master: ${masterZipUrl}`)
        const masterResponse = await fetch(masterZipUrl)

        if (!masterResponse.ok) {
          return NextResponse.json({
            error: 'Repository not found or not accessible. Make sure it\'s a public repository.'
          }, { status: 404 })
        }

        // Use master response
        const arrayBuffer = await masterResponse.arrayBuffer()
        const base64Zip = Buffer.from(arrayBuffer).toString('base64')

        return NextResponse.json({
          success: true,
          repoName: cleanRepo,
          owner,
          domain,
          zipData: base64Zip,
          branch: 'master'
        })
      }

      return NextResponse.json({
        error: 'Failed to download repository. Make sure it\'s a public repository.'
      }, { status: response.status })
    }

    // Convert to base64 for client-side processing
    const arrayBuffer = await response.arrayBuffer()
    const base64Zip = Buffer.from(arrayBuffer).toString('base64')

    return NextResponse.json({
      success: true,
      repoName: cleanRepo,
      owner,
      domain,
      zipData: base64Zip,
      branch: 'main'
    })

  } catch (error) {
    console.error('Error importing GitLab repo:', error)
    return NextResponse.json({
      error: 'Failed to import repository. Please check the URL and try again.'
    }, { status: 500 })
  }
}