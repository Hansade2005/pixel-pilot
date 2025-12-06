# Preview API - Production & Preview Deployment Guide

## Overview

The `/api/preview` endpoint now handles **both preview and production deployments** for Vite projects. A single `isProduction` parameter controls whether the deployment is temporary (preview) or permanent (production).

## Quick Start

### Preview Deployment (Default)
```typescript
const response = await fetch('/api/preview', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: 'my-project-123',
    projectSlug: 'myproject',
    files: [...],
    authUserId: user.id,
    authUsername: user.email,
    isProduction: false  // or omit (defaults to false)
  })
});

// Response
{
  "url": "https://myproject.pipilot.dev",
  "isProduction": false,
  "hosted": true
}
```

### Production Deployment
```typescript
const response = await fetch('/api/preview', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: 'my-project-123',
    projectSlug: 'myproject',
    files: [...],
    authUserId: user.id,
    authUsername: user.email,
    isProduction: true,  // Deploy to production
    customDomainId: 'domain-uuid-optional'  // Optional: link custom domain
  })
});

// Response
{
  "url": "https://myproject.pipilot.dev",
  "isProduction": true,
  "hosted": true
}
```

## Key Differences

| Feature | Preview (`isProduction: false`) | Production (`isProduction: true`) |
|---------|--------------------------------|-----------------------------------|
| `site_type` | `'preview'` | `'production'` |
| `auto_delete` | `true` | `false` |
| Custom Domain | ❌ Not supported | ✅ Supported via `customDomainId` |
| Lifespan | Temporary (auto-cleaned) | Permanent |
| Purpose | Testing/development | Live hosting |

## Database Records Created

### Preview Site
```sql
INSERT INTO sites (
  user_id, project_id, project_slug, site_type, url,
  is_active, auto_delete, deployed_at, metadata
) VALUES (
  'user-uuid', 'project-123', 'myproject', 'preview',
  'https://myproject.pipilot.dev', true, true, NOW(),
  '{"framework": "vite", "deployed_from": "pixelpilot"}'
);
```

### Production Site
```sql
INSERT INTO sites (
  user_id, project_id, project_slug, site_type, url,
  custom_domain_id, is_active, auto_delete, deployed_at, metadata
) VALUES (
  'user-uuid', 'project-123', 'myproject', 'production',
  'https://myproject.pipilot.dev', 'domain-uuid-optional',
  true, false, NOW(),
  '{"framework": "vite", "deployed_from": "pixelpilot"}'
);
```

## Frontend Implementation Examples

### Deploy Button Component
```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

export function DeployButton({ 
  projectId, 
  projectSlug, 
  files, 
  userId, 
  username,
  isProduction = false,
  customDomainId 
}: {
  projectId: string
  projectSlug: string
  files: any[]
  userId: string
  username: string
  isProduction?: boolean
  customDomainId?: string
}) {
  const { toast } = useToast()
  const [deploying, setDeploying] = useState(false)
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null)

  const handleDeploy = async () => {
    setDeploying(true)
    try {
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          projectSlug,
          files,
          authUserId: userId,
          authUsername: username,
          isProduction,
          customDomainId
        })
      })

      const data = await response.json()

      if (data.url) {
        setDeployedUrl(data.url)
        toast({
          title: isProduction ? 'Production Deployed!' : 'Preview Deployed!',
          description: `Site is live at ${data.url}`
        })
      }
    } catch (error) {
      toast({
        title: 'Deployment Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setDeploying(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button 
        onClick={handleDeploy} 
        disabled={deploying}
      >
        {deploying ? 'Deploying...' : isProduction ? 'Deploy to Production' : 'Deploy Preview'}
      </Button>
      
      {deployedUrl && (
        <a 
          href={deployedUrl} 
          target="_blank" 
          className="text-blue-400 underline"
        >
          {deployedUrl}
        </a>
      )}
    </div>
  )
}
```

### Project Page Integration
```typescript
// app/workspace/projects/[slug]/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { DeployButton } from '@/components/deploy-button'
import { createClient } from '@/lib/supabase/client'
import { storageManager } from '@/lib/storage-manager'

export default function ProjectPage() {
  const { slug } = useParams()
  const [project, setProject] = useState<any>(null)
  const [productionUrl, setProductionUrl] = useState<string | null>(null)
  const [customDomainId, setCustomDomainId] = useState<string | null>(null)

  useEffect(() => {
    loadProject()
    loadProductionSite()
  }, [slug])

  const loadProject = async () => {
    const projects = await storageManager.getWorkspaces(userId)
    const found = projects.find(p => p.slug === slug)
    setProject(found)
  }

  const loadProductionSite = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('sites')
      .select('url, custom_domain_id')
      .eq('project_id', project?.id)
      .eq('site_type', 'production')
      .single()
    
    if (data) {
      setProductionUrl(data.url)
      setCustomDomainId(data.custom_domain_id)
    }
  }

  const getProjectFiles = async () => {
    // Get files from IndexedDB or workspace storage
    // This is project-specific implementation
    return await storageManager.getWorkspaceFiles(project.id)
  }

  return (
    <div>
      <h1>{project?.name}</h1>
      
      {/* Preview Deployment */}
      <section>
        <h2>Test Your App</h2>
        <DeployButton
          projectId={project?.id}
          projectSlug={project?.slug}
          files={await getProjectFiles()}
          userId={user.id}
          username={user.email}
          isProduction={false}
        />
      </section>

      {/* Production Deployment */}
      <section>
        <h2>Production Hosting</h2>
        {productionUrl ? (
          <div>
            <p>Live at: <a href={productionUrl}>{productionUrl}</a></p>
            <DeployButton
              projectId={project?.id}
              projectSlug={project?.slug}
              files={await getProjectFiles()}
              userId={user.id}
              username={user.email}
              isProduction={true}
              customDomainId={customDomainId}
            />
          </div>
        ) : (
          <DeployButton
            projectId={project?.id}
            projectSlug={project?.slug}
            files={await getProjectFiles()}
            userId={user.id}
            username={user.email}
            isProduction={true}
          />
        )}
      </section>
    </div>
  )
}
```

## Querying Sites

### Get Preview Site
```typescript
const { data: previewSite } = await supabase
  .from('sites')
  .select('*')
  .eq('project_id', projectId)
  .eq('site_type', 'preview')
  .eq('user_id', userId)
  .single()
```

### Get Production Site
```typescript
const { data: productionSite } = await supabase
  .from('sites')
  .select('*')
  .eq('project_id', projectId)
  .eq('site_type', 'production')
  .eq('user_id', userId)
  .single()
```

### Get All Sites for a Project
```typescript
const { data: sites } = await supabase
  .from('sites')
  .select('*')
  .eq('project_id', projectId)
  .eq('user_id', userId)
  .order('deployed_at', { ascending: false })
```

## Custom Domain Linking

To link a custom domain to a production site:

1. **Add custom domain to `supabase_projects` table:**
```typescript
await supabase
  .from('supabase_projects')
  .update({
    custom_domain: 'myapp.com',
    custom_domain_verified: false,
    custom_domain_added_at: new Date().toISOString()
  })
  .eq('pixelpilot_project_id', projectId)
```

2. **Create `custom_domains` record:**
```typescript
const { data: domain } = await supabase
  .from('custom_domains')
  .insert({
    domain: 'myapp.com',
    site_id: siteId,  // From sites table
    user_id: userId,
    verified: false
  })
  .select()
  .single()
```

3. **Deploy to production with custom domain:**
```typescript
await fetch('/api/preview', {
  method: 'POST',
  body: JSON.stringify({
    projectId,
    projectSlug,
    files,
    authUserId,
    authUsername,
    isProduction: true,
    customDomainId: domain.id  // Link the domain
  })
})
```

## Cleanup & Maintenance

### Auto-cleanup Preview Sites (Cron Job)
```sql
-- Delete preview sites older than 7 days
DELETE FROM sites
WHERE site_type = 'preview'
  AND auto_delete = true
  AND deployed_at < NOW() - INTERVAL '7 days';
```

### Manual Site Deletion
```typescript
await supabase
  .from('sites')
  .delete()
  .eq('id', siteId)
  .eq('user_id', userId)
```

## Troubleshooting

### Preview vs Production Confusion
**Problem:** Accidentally deployed preview as production or vice versa

**Solution:** Check the `site_type` in the database:
```sql
SELECT project_id, site_type, auto_delete, url
FROM sites
WHERE project_id = 'your-project-id';
```

Update if needed:
```sql
UPDATE sites
SET site_type = 'production', auto_delete = false
WHERE id = 'site-uuid';
```

### Multiple Production Sites
**Problem:** Multiple production sites for same project

**Solution:** The API should prevent this by checking for existing production sites. If it happens:
```sql
-- Keep the most recent one
DELETE FROM sites
WHERE project_id = 'project-id'
  AND site_type = 'production'
  AND id NOT IN (
    SELECT id FROM sites
    WHERE project_id = 'project-id'
      AND site_type = 'production'
    ORDER BY deployed_at DESC
    LIMIT 1
  );
```

### Site Not Updating
**Problem:** Production redeployment doesn't update the site

**Solution:** Check that the API is updating (not inserting):
- Ensure `project_id`, `site_type`, and `user_id` match exactly
- Verify `last_updated` timestamp changes after deployment
- Check Supabase Storage to confirm new files were uploaded

## Best Practices

1. **Always Use isProduction Explicitly**
   - Don't rely on defaults for production deployments
   - Always set `isProduction: true` for production

2. **Link Custom Domains Before Production Deployment**
   - Create custom domain record first
   - Pass `customDomainId` during production deployment
   - Verify DNS before marking as production

3. **Test with Preview First**
   - Always deploy preview before production
   - Verify functionality on preview URL
   - Only promote to production after testing

4. **Monitor Production Sites**
   - Track `last_updated` timestamp
   - Check `is_active` status
   - Monitor custom domain verification status

5. **Clean Up Preview Sites Regularly**
   - Set up automated cleanup for old previews
   - Archive important previews before auto-deletion
   - Keep preview count manageable per project

## Summary

The updated `/api/preview` endpoint provides a **unified deployment interface** for both preview and production sites. By simply toggling the `isProduction` parameter, you can control whether a deployment is temporary (for testing) or permanent (for production hosting). This simplification makes the codebase cleaner and easier to maintain while providing full production hosting capabilities.
