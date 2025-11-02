import { createHash, randomBytes } from 'crypto';

/**
 * Generate a secure API key with format: sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  // Generate random 32-byte key
  const randomKey = randomBytes(32).toString('hex');
  
  // Format: sk_live_[64 hex characters]
  const key = `sk_live_${randomKey}`;
  
  // Store only first 12 characters as prefix for display
  const prefix = key.substring(0, 12); // "sk_live_xxx"
  
  // Hash the full key for storage (SHA-256)
  const hash = hashApiKey(key);
  
  return { key, hash, prefix };
}

/**
 * Hash an API key using SHA-256
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Verify if a provided key matches the stored hash
 */
export function verifyApiKey(providedKey: string, storedHash: string): boolean {
  const providedHash = hashApiKey(providedKey);
  return providedHash === storedHash;
}

/**
 * Extract API key from Authorization header
 * Expected format: "Bearer sk_live_xxxxx"
 */
export function extractApiKey(authHeader: string | null): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(key: string): boolean {
  // Must start with sk_live_ and be 72 characters total
  return /^sk_live_[a-f0-9]{64}$/.test(key);
}

/**
 * Rate limiting helper
 * Returns true if rate limit exceeded
 */
export async function checkRateLimit(
  apiKeyId: string,
  rateLimit: number,
  supabase: any
): Promise<{ exceeded: boolean; usage: number; limit: number }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  // Count requests in the last hour
  const { count, error } = await supabase
    .from('api_usage')
    .select('*', { count: 'exact', head: true })
    .eq('api_key_id', apiKeyId)
    .gte('created_at', oneHourAgo);
  
  if (error) {
    console.error('Rate limit check error:', error);
    return { exceeded: false, usage: 0, limit: rateLimit };
  }
  
  const usage = count || 0;
  const exceeded = usage >= rateLimit;
  
  return { exceeded, usage, limit: rateLimit };
}

/**
 * Log API usage
 */
export async function logApiUsage(
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
  supabase: any
): Promise<void> {
  try {
    await supabase.from('api_usage').insert({
      api_key_id: apiKeyId,
      endpoint,
      method,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
    });
  } catch (error) {
    console.error('Failed to log API usage:', error);
  }
}

/**
 * Update last_used_at timestamp for API key
 */
export async function updateApiKeyLastUsed(
  apiKeyId: string,
  supabase: any
): Promise<void> {
  try {
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyId);
  } catch (error) {
    console.error('Failed to update API key last_used_at:', error);
  }
}
