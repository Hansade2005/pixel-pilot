import { NextRequest, NextResponse } from 'next/server'

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

    const response = await fetch(zipUrl)

    if (!response.ok) {
      if (response.status === 404) {
        // Try master branch if main doesn't exist
        const masterZipUrl = `https://github.com/${owner}/${cleanRepo}/archive/refs/heads/master.zip`
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
      zipData: base64Zip,
      branch: 'main'
    })

  } catch (error) {
    console.error('Error importing GitHub repo:', error)
    return NextResponse.json({
      error: 'Failed to import repository. Please check the URL and try again.'
    }, { status: 500 })
  }
}