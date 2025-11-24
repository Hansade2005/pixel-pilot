import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for admin operations
);

/**
 * Generate a new API key with format: pp_live-[32 random chars]
 */
export function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(24); // 24 bytes = 32 chars in base64
  const keySecret = randomBytes.toString('base64url').substring(0, 32);
  return `pp_live-${keySecret}`;
}

/**
 * Hash an API key using bcrypt
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  return await bcrypt.hash(apiKey, 10);
}

/**
 * Verify an API key against its hash
 */
export async function verifyApiKey(apiKey: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(apiKey, hash);
}

/**
 * Create a new API key for a user
 */
export async function createApiKey(
  userId: string,
  name: string,
  options?: {
    rateLimitPerMinute?: number;
    rateLimitPerDay?: number;
    expiresAt?: Date;
  }
): Promise<{ apiKey: string; keyPrefix: string; id: string } | null> {
  try {
    // Generate API key
    const apiKey = generateApiKey();
    const keyHash = await hashApiKey(apiKey);
    const keyPrefix = apiKey.substring(0, 15); // pp_live-xxxxxx

    // Insert into database
    const { data, error } = await supabase
      .from('ai_api_keys')
      .insert({
        user_id: userId,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        name,
        rate_limit_per_minute: options?.rateLimitPerMinute || 60,
        rate_limit_per_day: options?.rateLimitPerDay || 1000,
        expires_at: options?.expiresAt?.toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;

    return {
      apiKey, // Return full key ONCE (never stored in plain text)
      keyPrefix,
      id: data.id,
    };
  } catch (error) {
    console.error('Error creating API key:', error);
    return null;
  }
}

/**
 * Validate an API key and return user info
 */
export async function validateApiKey(apiKey: string): Promise<{
  isValid: boolean;
  userId?: string;
  apiKeyId?: string;
  rateLimitPerMinute?: number;
  rateLimitPerDay?: number;
} | null> {
  try {
    // Get all active API keys (we need to check hashes)
    const { data: apiKeys, error } = await supabase
      .from('ai_api_keys')
      .select('id, user_id, key_hash, rate_limit_per_minute, rate_limit_per_day, expires_at, is_active')
      .eq('is_active', true);

    if (error) throw error;

    // Check each key hash
    for (const key of apiKeys || []) {
      // Check if expired
      if (key.expires_at && new Date(key.expires_at) < new Date()) {
        continue;
      }

      // Verify hash
      const isMatch = await verifyApiKey(apiKey, key.key_hash);
      if (isMatch) {
        // Update last_used_at
        await supabase
          .from('ai_api_keys')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', key.id);

        return {
          isValid: true,
          userId: key.user_id,
          apiKeyId: key.id,
          rateLimitPerMinute: key.rate_limit_per_minute,
          rateLimitPerDay: key.rate_limit_per_day,
        };
      }
    }

    return { isValid: false };
  } catch (error) {
    console.error('Error validating API key:', error);
    return null;
  }
}

/**
 * Deactivate an API key
 */
export async function deactivateApiKey(apiKeyId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ai_api_keys')
      .update({ is_active: false })
      .eq('id', apiKeyId)
      .eq('user_id', userId);

    return !error;
  } catch (error) {
    console.error('Error deactivating API key:', error);
    return false;
  }
}

/**
 * List all API keys for a user (without showing full keys)
 */
export async function listApiKeys(userId: string) {
  try {
    const { data, error } = await supabase
      .from('ai_api_keys')
      .select('id, key_prefix, name, rate_limit_per_minute, rate_limit_per_day, is_active, last_used_at, created_at, expires_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error listing API keys:', error);
    return [];
  }
}
