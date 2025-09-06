'use server';

import { redis } from '@/lib/redis';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { domainConfig } from '@/lib/redis';

export async function createSubdomainAction(
  prevState: any,
  formData: FormData
) {
  const subdomain = formData.get('subdomain') as string;

  if (!subdomain) {
    return { success: false, error: 'Subdomain is required' };
  }

  const sanitizedSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');

  if (sanitizedSubdomain !== subdomain) {
    return {
      subdomain,
      success: false,
      error:
        'Subdomain can only have lowercase letters, numbers, and hyphens. Please try again.'
    };
  }

  const subdomainAlreadyExists = await redis.get(
    `subdomain:${sanitizedSubdomain}`
  );
  if (subdomainAlreadyExists) {
    return {
      subdomain,
      success: false,
      error: 'This subdomain is already taken'
    };
  }

  await redis.set(`subdomain:${sanitizedSubdomain}`, {
    createdAt: Date.now()
  });

  redirect(`${domainConfig.protocol}://${sanitizedSubdomain}.${domainConfig.rootDomain}`);
}

export async function deleteSubdomainAction(
  prevState: any,
  formData: FormData
) {
  const subdomain = formData.get('subdomain');
  await redis.del(`subdomain:${subdomain}`);
  revalidatePath('/admin');
  return { success: 'Domain deleted successfully' };
}
