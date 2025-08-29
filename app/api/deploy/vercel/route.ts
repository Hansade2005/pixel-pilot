import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { projectId, vercelToken, githubRepoName } = await req.json()
    
    // Get user from Supabase
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // IndexedDB is only available in browser context, not server-side
  // Client-side code now pulls tokens from IndexedDB and passes them explicitly with each request
  // This solves the issue of server not being able to access IndexedDB
  let actualVercelToken = vercelToken
    
    if (!actualVercelToken || actualVercelToken === 'stored') {
      return Response.json({ 
        error: 'Missing Vercel token',
        details: 'Please provide your Vercel token with the request. Server cannot access client-side IndexedDB.'
      }, { status: 400 })
    }

    if (!actualVercelToken || !githubRepoName) {
      return Response.json({ error: 'Vercel token and GitHub repo name are required' }, { status: 400 })
    }

    // Create Vercel project
    const createProjectResponse = await fetch('https://api.vercel.com/v10/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${actualVercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: githubRepoName.split('/')[1], // Extract repo name from full name
        gitRepository: {
          type: 'github',
          repo: githubRepoName,
        },
        framework: 'nextjs',
        buildCommand: 'npm run build',
        devCommand: 'npm run dev',
        installCommand: 'npm install',
        outputDirectory: '.next',
      }),
    })

    if (!createProjectResponse.ok) {
      const error = await createProjectResponse.text()
      console.error('Vercel project creation failed:', error)
      return Response.json({ 
        error: 'Failed to create Vercel project',
        details: error 
      }, { status: createProjectResponse.status })
    }

    const project = await createProjectResponse.json()

    // Trigger deployment
    const deployResponse = await fetch(`https://api.vercel.com/v13/deployments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${actualVercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: project.name,
        gitSource: {
          type: 'github',
          repo: githubRepoName,
          ref: 'main',
        },
        projectSettings: {
          framework: 'nextjs',
          buildCommand: 'npm run build',
          devCommand: 'npm run dev',
          installCommand: 'npm install',
          outputDirectory: '.next',
        },
      }),
    })

    if (!deployResponse.ok) {
      const error = await deployResponse.text()
      console.error('Vercel deployment failed:', error)
      return Response.json({ 
        error: 'Failed to trigger deployment',
        details: error 
      }, { status: deployResponse.status })
    }

    const deployment = await deployResponse.json()

    // Token storage is now handled client-side in IndexedDB
    // No need to store the token in Supabase anymore

    // Note: Workspace metadata updates should be handled client-side
    // The client should update IndexedDB with deployment info after successful deployment

    return Response.json({
      projectId: project.id,
      deploymentId: deployment.uid,
      url: `https://${deployment.url}`,
      inspectorUrl: deployment.inspectorUrl,
    })

  } catch (error) {
    console.error('Vercel deploy error:', error)
    return Response.json({ error: 'Failed to deploy to Vercel' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const deploymentId = url.searchParams.get('deploymentId')
    const vercelToken = url.searchParams.get('vercelToken')
    
    if (!deploymentId || !vercelToken) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Check deployment status
    const response = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
      },
    })

    if (!response.ok) {
      return Response.json({ error: 'Failed to fetch deployment status' }, { status: response.status })
    }

    const deployment = await response.json()
    
    return Response.json({
      status: deployment.readyState,
      url: deployment.url ? `https://${deployment.url}` : null,
      createdAt: deployment.createdAt,
      target: deployment.target,
    })

  } catch (error) {
    console.error('Deployment status check error:', error)
    return Response.json({ error: 'Failed to check deployment status' }, { status: 500 })
  }
}
