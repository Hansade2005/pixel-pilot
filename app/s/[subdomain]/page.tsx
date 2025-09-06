import { createClient } from '@supabase/supabase-js';
import { redis } from '@/lib/redis';
import { notFound } from 'next/navigation';

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
    const storagePath = `projects/${subdomain}/index.html`;
    const { data, error } = await supabase.storage.from('projects').download(storagePath);

    if (error || !data) {
      console.error(`[Subdomain Debug] No index.html found for ${subdomain}`);
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

    const htmlContent = await data.text();

    // For Next.js pages, we need to return JSX, not Response
    // We'll use dangerouslySetInnerHTML to inject the HTML
    return (
      <div
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        style={{ height: '100vh', width: '100%' }}
      />
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
