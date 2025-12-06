import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration for sites storage
const SUPABASE_CONFIG = {
  URL: "https://dlunpilhklsgvkegnnlp.supabase.co",
  SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdW5waWxoa2xzZ3ZrZWdubmxwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA1MDQxOSwiZXhwIjoyMDcwNjI2NDE5fQ.k-2OJ4p3hr9feR4ks54OQM2HhOhaVJ3pUK-20tGJwpo",
};

// Extract subdomain from hostname for multi-tenant routing
function getSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];
  
  // For local development, treat localhost as no subdomain
  if (host === 'localhost' || host === '127.0.0.1') {
    return null;
  }
  
  // Only apply subdomain routing for pipilot.dev domains
  if (!host.endsWith('pipilot.dev')) {
    return null;
  }
  
  // Split by dots and check if we have a subdomain
  const parts = host.split('.');
  
  // If we have more than 2 parts and it's not 'www', we have a subdomain
  if (parts.length > 2 && parts[0] !== 'www') {
    return parts[0]; // Return the first part as subdomain
  }
  
  return null; // No subdomain
}

// Check if hostname is a custom domain and return siteId
async function getCustomDomainSiteId(hostname: string, supabase: any): Promise<string | null> {
  const host = hostname.split(':')[0];
  
  // Skip if it's pipilot.dev or localhost
  if (host.endsWith('pipilot.dev') || host === 'localhost' || host === '127.0.0.1') {
    return null;
  }
  
  // Query custom_domains table with JOIN to sites table
  // Only serve production sites for custom domains
  const { data, error } = await supabase
    .from('custom_domains')
    .select('site_id, sites!inner(id, site_type, is_active)')
    .eq('domain', host)
    .eq('verified', true)
    .eq('sites.site_type', 'production')
    .eq('sites.is_active', true)
    .single();
  
  if (error || !data) {
    console.log(`[Custom Domain] No production site found for ${host}`, error);
    return null;
  }
  
  console.log(`[Custom Domain] Serving production site ${data.site_id} for ${host}`);
  return data.site_id;
}

// Get site by project_slug - prefer production over preview
async function getSiteByProjectSlug(projectSlug: string, supabase: any): Promise<string | null> {
  // Try production first
  const { data: prodData, error: prodError } = await supabase
    .from('sites')
    .select('project_id')
    .eq('project_slug', projectSlug)
    .eq('site_type', 'production')
    .eq('is_active', true)
    .order('deployed_at', { ascending: false })
    .limit(1)
    .single();
  
  if (!prodError && prodData) {
    console.log(`[Project Slug] Found production site for ${projectSlug}: ${prodData.project_id}`);
    return prodData.project_id;
  }
  
  // Fallback to preview
  const { data: previewData, error: previewError } = await supabase
    .from('sites')
    .select('project_id')
    .eq('project_slug', projectSlug)
    .eq('site_type', 'preview')
    .eq('is_active', true)
    .order('deployed_at', { ascending: false })
    .limit(1)
    .single();
  
  if (!previewError && previewData) {
    console.log(`[Project Slug] Found preview site for ${projectSlug}: ${previewData.project_id}`);
    return previewData.project_id;
  }
  
  console.log(`[Project Slug] No active site found for ${projectSlug}`);
  return null;
}

// Serves files from Supabase Storage bucket "sites" with SPA fallback
export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const hostname = request.headers.get('host') || '';
    const path = params.path || [];
    
    const supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.SERVICE_ROLE_KEY);
    
    // Check for custom domain first
    const customSiteId = await getCustomDomainSiteId(hostname, supabase);
    
    let siteId: string;
    let filePath: string[];
    
    if (customSiteId) {
      // Custom domain mode: customdomain.com/path
      siteId = customSiteId;
      filePath = path; // Path is directly after domain
    } else {
      // Extract subdomain for multi-tenant routing
      const subdomain = getSubdomain(hostname);
      
      if (subdomain) {
        // Multi-tenant subdomain mode: subdomain.pipilot.dev/path
        // Try to resolve as project_slug first, fallback to direct siteId
        const resolvedSiteId = await getSiteByProjectSlug(subdomain, supabase);
        siteId = resolvedSiteId || subdomain; // Use resolved or original
        // For subdomains, the path might start with the siteId due to middleware rewrite
        // Remove the siteId from the beginning if it matches
        filePath = path[0] === subdomain ? path.slice(1) : path;
      } else {
        // Direct /sites/siteId/path access
        if (path.length === 0) {
          return new NextResponse('Site ID required', { status: 400 });
        }
        const identifier = path[0]; // First segment could be siteId or project_slug
        
        // Try to resolve as project_slug first
        const resolvedSiteId = await getSiteByProjectSlug(identifier, supabase);
        siteId = resolvedSiteId || identifier; // Use resolved or treat as direct siteId
        filePath = path.slice(1); // Everything after identifier
      }
    }
    
    const joinedPath = filePath.join('/') || 'index.html';

    console.log(`[Sites Route] Serving ${siteId}/${joinedPath} for ${hostname}`);

    // Try to fetch the requested file
    const storagePath = `sites/${siteId}/${joinedPath}`;
    const { data, error } = await supabase.storage.from('documents').download(storagePath);

    if (error) {
      // SPA fallback: If file not found and it's not already index.html, try index.html
      if (joinedPath !== 'index.html') {
        console.log(`[SPA Fallback] ${storagePath} not found, falling back to index.html`);
        const fallbackPath = `sites/${siteId}/index.html`;
        const { data: fallbackData, error: fallbackError } = await supabase.storage
          .from('documents')
          .download(fallbackPath);
        
        if (!fallbackError && fallbackData) {
          const fallbackBuffer = await fallbackData.arrayBuffer();
          return new NextResponse(Buffer.from(fallbackBuffer), {
            headers: { 
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'public, max-age=0, must-revalidate',
            },
          });
        }
      }
      // If even index.html is not found, return 404
      return new NextResponse(`Site not found: ${siteId}`, { status: 404 });
    }

    const arrayBuffer = await data.arrayBuffer();
    const contentType = detectContentType(joinedPath);
    
    const responseBuffer = Buffer.from(arrayBuffer);
    
    // Badge is now injected during upload phase, not at serve time
    // This improves performance and ensures consistent rendering
    
    // Set appropriate cache headers
    const cacheControl = contentType.includes('html')
      ? 'public, max-age=0, must-revalidate'
      : 'public, max-age=31536000, immutable';

    return new NextResponse(responseBuffer, {
      headers: { 
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
      },
    });
  } catch (e) {
    console.error('[Sites Route Error]', e);
    return new NextResponse(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`, { status: 500 });
  }
}

function detectContentType(path: string) {
  const lower = path.toLowerCase();
  if (lower.endsWith('.html')) return 'text/html; charset=utf-8';
  if (lower.endsWith('.css')) return 'text/css; charset=utf-8';
  if (lower.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (lower.endsWith('.json')) return 'application/json; charset=utf-8';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}