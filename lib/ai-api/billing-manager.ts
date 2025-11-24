import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get pricing for a model
 */
export async function getModelPricing(model: string) {
  try {
    const { data, error } = await supabase
      .from('ai_pricing')
      .select('*')
      .eq('model', model)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting model pricing:', error);
    return null;
  }
}

/**
 * Calculate cost based on token usage
 */
export async function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): Promise<number> {
  try {
    const pricing = await getModelPricing(model);
    if (!pricing) {
      console.warn(`No pricing found for model: ${model}, using default $0.05`);
      return 0.05; // Default fallback
    }

    const inputCost = (inputTokens / 1000) * parseFloat(pricing.input_price_per_1k_tokens);
    const outputCost = (outputTokens / 1000) * parseFloat(pricing.output_price_per_1k_tokens);
    const baseFee = parseFloat(pricing.base_request_fee);

    return inputCost + outputCost + baseFee;
  } catch (error) {
    console.error('Error calculating cost:', error);
    return 0.05; // Default fallback
  }
}

/**
 * Count tokens (simple approximation - can be replaced with tiktoken)
 */
export function estimateTokenCount(text: string): number {
  // Simple approximation: ~4 characters per token
  // For production, use tiktoken library for accurate counts
  return Math.ceil(text.length / 4);
}

/**
 * Count tokens for messages array
 */
export function estimateMessagesTokenCount(messages: any[]): number {
  let totalTokens = 0;
  
  for (const message of messages) {
    // Count role
    totalTokens += 1;
    
    // Count content
    if (typeof message.content === 'string') {
      totalTokens += estimateTokenCount(message.content);
    } else if (Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part.type === 'text') {
          totalTokens += estimateTokenCount(part.text);
        } else if (part.type === 'image_url') {
          // Images cost more - approximate 85 tokens per image
          totalTokens += 85;
        }
      }
    }
    
    // Count tool calls if present
    if (message.tool_calls) {
      totalTokens += estimateTokenCount(JSON.stringify(message.tool_calls));
    }
  }
  
  return totalTokens;
}

/**
 * Log API usage
 */
export async function logUsage(params: {
  userId: string;
  apiKeyId: string;
  walletId: string;
  model: string;
  endpoint: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  statusCode: number;
  responseTimeMs?: number;
  errorMessage?: string;
  metadata?: any;
}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ai_usage_logs')
      .insert({
        user_id: params.userId,
        api_key_id: params.apiKeyId,
        wallet_id: params.walletId,
        model: params.model,
        endpoint: params.endpoint,
        input_tokens: params.inputTokens,
        output_tokens: params.outputTokens,
        total_tokens: params.inputTokens + params.outputTokens,
        cost: params.cost,
        status_code: params.statusCode,
        response_time_ms: params.responseTimeMs,
        error_message: params.errorMessage,
        metadata: params.metadata || {},
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error logging usage:', error);
    return false;
  }
}

/**
 * Get usage statistics for a user
 */
export async function getUsageStats(
  userId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    model?: string;
  }
) {
  try {
    let query = supabase
      .from('ai_usage_logs')
      .select('*')
      .eq('user_id', userId);

    if (options?.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }

    if (options?.endDate) {
      query = query.lte('created_at', options.endDate.toISOString());
    }

    if (options?.model) {
      query = query.eq('model', options.model);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate totals
    const stats = {
      totalRequests: data.length,
      totalTokens: data.reduce((sum, log) => sum + log.total_tokens, 0),
      totalCost: data.reduce((sum, log) => sum + parseFloat(log.cost), 0),
      byModel: {} as Record<string, { requests: number; tokens: number; cost: number }>,
      logs: data,
    };

    // Group by model
    data.forEach((log) => {
      if (!stats.byModel[log.model]) {
        stats.byModel[log.model] = { requests: 0, tokens: 0, cost: 0 };
      }
      stats.byModel[log.model].requests++;
      stats.byModel[log.model].tokens += log.total_tokens;
      stats.byModel[log.model].cost += parseFloat(log.cost);
    });

    return stats;
  } catch (error) {
    console.error('Error getting usage stats:', error);
    return null;
  }
}

/**
 * Check rate limits
 */
export async function checkRateLimit(
  apiKeyId: string,
  rateLimitPerMinute: number,
  rateLimitPerDay: number
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check minute limit
    const { count: minuteCount, error: minuteError } = await supabase
      .from('ai_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('api_key_id', apiKeyId)
      .gte('created_at', oneMinuteAgo.toISOString());

    if (minuteError) throw minuteError;

    if ((minuteCount || 0) >= rateLimitPerMinute) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${rateLimitPerMinute} requests per minute`,
      };
    }

    // Check daily limit
    const { count: dayCount, error: dayError } = await supabase
      .from('ai_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('api_key_id', apiKeyId)
      .gte('created_at', oneDayAgo.toISOString());

    if (dayError) throw dayError;

    if ((dayCount || 0) >= rateLimitPerDay) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${rateLimitPerDay} requests per day`,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return { allowed: false, reason: 'Error checking rate limits' };
  }
}
