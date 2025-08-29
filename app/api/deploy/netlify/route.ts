import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { projectId, netlifyToken, siteName, siteDescription, files } = await req.json()
    
    // Get user from Supabase
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // IndexedDB is only available in browser context, not server-side
  // Client-side code now pulls tokens from IndexedDB and passes them explicitly with each request
  // This solves the issue of server not being able to access IndexedDB
  let actualNetlifyToken = netlifyToken
    
    if (!actualNetlifyToken || actualNetlifyToken === 'stored') {
      return Response.json({ 
        error: 'Missing Netlify token',
        details: 'Please provide your Netlify token with the request. Server cannot access client-side IndexedDB.'
      }, { status: 400 })
    }

    if (!actualNetlifyToken) {
      return Response.json({ error: 'Netlify token is required' }, { status: 400 })
    }

    // Validate files array
    if (!files || !Array.isArray(files) || files.length === 0) {
      return Response.json({ error: 'Files array is required' }, { status: 400 })
    }

    console.log(`Deploying to Netlify with ${files.length} files`)

    // Create Netlify site
    const createSiteResponse = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${actualNetlifyToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: siteName || `ai-app-builder-${Date.now()}`,
        custom_domain: null,
        force_ssl: true,
        processing_settings: {
          skip_processing: false,
        },
        build_settings: {
          cmd: 'npm run build',
          dir: 'dist',
          env: {},
          functions_dir: null,
          publish_dir: 'dist',
        },
      }),
    })

    if (!createSiteResponse.ok) {
      const error = await createSiteResponse.text()
      console.error('Netlify site creation failed:', error)
      return Response.json({ 
        error: 'Failed to create Netlify site',
        details: error 
      }, { status: createSiteResponse.status })
    }

    const site = await createSiteResponse.json()

    // Upload files to Netlify
    const formData = new FormData()
    
    // Add essential files
    const essentialFiles = [
      'index.html',
      'package.json',
      'netlify.toml',
      'README.md'
    ]

    // Create index.html if not present
    const hasIndexHtml = files.some(f => f.path === '/index.html' || f.path === 'index.html')
    if (!hasIndexHtml) {
      const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${siteName || 'AI App Builder'}</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
</body>
</html>`
      
      const indexBlob = new Blob([indexHtml], { type: 'text/html' })
      formData.append('index.html', indexBlob)
    }

    // Add package.json if not present
    const hasPackageJson = files.some(f => f.path === '/package.json' || f.path === 'package.json')
    if (!hasPackageJson) {
      const packageJson = {
        name: siteName || 'ai-app-builder',
        version: '0.1.0',
        private: true,
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview'
        },
        dependencies: {
          'react': '^18.0.0',
          'react-dom': '^18.0.0'
        },
        devDependencies: {
          '@vitejs/plugin-react': '^4.0.0',
          'vite': '^4.0.0'
        }
      }
      
      const packageBlob = new Blob([JSON.stringify(packageJson, null, 2)], { type: 'application/json' })
      formData.append('package.json', packageBlob)
    }

    // Add netlify.toml for build configuration
    const netlifyToml = `[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200`
  
    const netlifyBlob = new Blob([netlifyToml], { type: 'text/plain' })
    formData.append('netlify.toml', netlifyBlob)

    // Add project files
    for (const file of files) {
      if (file.content) {
        const filePath = file.path.startsWith('/') ? file.path.slice(1) : file.path
        const fileBlob = new Blob([file.content], { type: 'text/plain' })
        formData.append(filePath, fileBlob)
      }
    }

    // Deploy to Netlify
    const deployResponse = await fetch(`https://api.netlify.com/api/v1/sites/${site.id}/deploys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${actualNetlifyToken}`,
      },
      body: formData,
    })

    if (!deployResponse.ok) {
      const error = await deployResponse.text()
      console.error('Netlify deployment failed:', error)
      
      // Try to delete the site if deployment fails
      try {
        await fetch(`https://api.netlify.com/api/v1/sites/${site.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${actualNetlifyToken}`,
          },
        })
      } catch (deleteError) {
        console.error('Failed to cleanup site after deployment error:', deleteError)
      }
      
      return Response.json({ 
        error: 'Failed to deploy to Netlify',
        details: error 
      }, { status: deployResponse.status })
    }

    const deployment = await deployResponse.json()

    // Store Netlify token in user profile only if it was manually provided
    if (netlifyToken && netlifyToken !== 'stored') {
      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          netlify_token: netlifyToken,
          updated_at: new Date().toISOString(),
        })
    }

         // Note: Workspace metadata updates should be handled client-side
     // The client should update IndexedDB with deployment info after successful deployment

    return Response.json({
      siteId: site.id,
      siteUrl: site.ssl_url || site.url,
      deploymentId: deployment.id,
      adminUrl: site.admin_url,
    })

  } catch (error) {
    console.error('Netlify deploy error:', error)
    return Response.json({ error: 'Failed to deploy to Netlify' }, { status: 500 })
  }
}

// Get deployment status
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const deploymentId = url.searchParams.get('deploymentId')
    const netlifyToken = url.searchParams.get('netlifyToken')
    
    if (!deploymentId || !netlifyToken) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Check deployment status
    const response = await fetch(`https://api.netlify.com/api/v1/deploys/${deploymentId}`, {
      headers: {
        'Authorization': `Bearer ${netlifyToken}`,
      },
    })

    if (!response.ok) {
      return Response.json({ error: 'Failed to fetch deployment status' }, { status: response.status })
    }

    const deployment = await response.json()
    
    return Response.json({
      status: deployment.state,
      url: deployment.ssl_url || deployment.url,
      createdAt: deployment.created_at,
      publishedAt: deployment.published_at,
      errorMessage: deployment.error_message,
    })

  } catch (error) {
    console.error('Deployment status check error:', error)
    return Response.json({ error: 'Failed to check deployment status' }, { status: 500 })
  }
}
