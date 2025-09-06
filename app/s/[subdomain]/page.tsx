import { createClient } from '@supabase/supabase-js';
import { redis } from '@/lib/redis';
import { notFound } from 'next/navigation';
import { domainConfig } from '@/lib/redis';
import { Metadata } from 'next';

// Type for subdomain tracking
type SubdomainTracking = {
  name: string;
  userId: string;
  createdAt: number;
  lastActive?: number;
  deploymentUrl?: string;
  storagePath?: string;
  isActive?: boolean;
}

// Supabase client for file serving
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Dynamic metadata for the subdomain
export async function generateMetadata({
  params
}: {
  params: { subdomain: string };
}): Promise<Metadata> {
  return {
    title: `${params.subdomain}.${domainConfig.rootDomain}`,
    description: `Subdomain page for ${params.subdomain}`
  };
}

export default async function SubdomainPage({
  params
}: {
  params: { subdomain: string };
}) {
  try {
    const subdomain = params.subdomain;

    // Check if subdomain exists in Redis
    const subdomainData = await redis.get(`subdomain:${subdomain}`);
    if (!subdomainData) {
      notFound();
    }

    // Try to download index.html from Supabase
    const storagePath = `projects/${subdomain}/dist/index.html`;
    const { data, error } = await supabase.storage.from('projects').download(storagePath);

    if (error || !data) {
      console.error(`[Subdomain Debug] No index.html found for ${subdomain} at path: ${storagePath}`);
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">
              {subdomain}
            </h1>
            <p className="mt-3 text-lg text-gray-600">
              No application files found
            </p>
          </div>
        </div>
      );
    }

    let htmlContent = await data.text();

    // Modify asset paths to point to Supabase storage
    const supabaseBaseUrl = 'https://lzuknbfbvpuscpammwzg.supabase.co/storage/v1/object/public/projects/projects';
    const subdomain_url = `${subdomain}.${domainConfig.rootDomain}`;

    // Replace relative paths with absolute Supabase URLs
    htmlContent = htmlContent.replace(
      /(?:href|src)=["'](?!https?:\/\/)(\.\/)?([^"']+)["']/gi, 
      (match, prefix, path) => {
        // Special handling for assets folder
        if (path.startsWith('assets/')) {
          return `${match.split('=')[0]}="https://lzuknbfbvpuscpammwzg.supabase.co/storage/v1/object/public/projects/projects/${subdomain}/dist/${path}"`;
        }

        // Handle other potential relative paths
        const isScript = path.endsWith('.js');
        const isStylesheet = path.endsWith('.css');
        const isImage = /\.(png|jpg|jpeg|gif|svg|webp)$/.test(path);

        const absolutePath = isScript || isStylesheet || isImage
          ? `${match.split('=')[0]}="https://lzuknbfbvpuscpammwzg.supabase.co/storage/v1/object/public/projects/projects/${subdomain}/dist/${path}"`
          : match;

        return absolutePath;
      }
    );

    // Inject base tag to ensure relative paths work correctly
    const baseTag = `<base href="https://${subdomain_url}/" />`;
    htmlContent = htmlContent.replace(/<head>/i, `<head>${baseTag}`);

    // Return the HTML content as a full HTML document
    return (
      <html lang="en">
        <head 
          dangerouslySetInnerHTML={{ 
            __html: htmlContent.match(/<head>(.*?)<\/head>/i)?.[1] || '' 
          }} 
        />
        <body 
          dangerouslySetInnerHTML={{ 
            __html: htmlContent.match(/<body>(.*?)<\/body>/i)?.[1] || '' 
          }} 
        />
      </html>
    );

  } catch (error: any) {
    console.error('[Subdomain Debug] Error:', error);
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Error
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Something went wrong
          </p>
        </div>
      </div>
    );
  }
}
