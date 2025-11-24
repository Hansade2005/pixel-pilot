import { NextRequest } from 'next/server';
import { validateApiKey } from './api-key-manager';
import { getWalletBalance, deductCredits, getOrCreateWallet } from './wallet-manager';
import { calculateCost, estimateMessagesTokenCount, logUsage, checkRateLimit } from './billing-manager';

export interface AuthContext {
  userId: string;
  apiKeyId: string;
  walletId: string;
  balance: number;
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
}

/**
 * Authenticate API request and check balance
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<{ success: true; context: AuthContext } | { success: false; error: any }> {
  try {
    // Extract API key from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return {
        success: false,
        error: {
          error: {
            message: 'Missing Authorization header. Please provide your API key as: Authorization: Bearer pp_live-...',
            type: 'auth_error',
            code: 'missing_api_key',
          },
        },
      };
    }

    // Parse Bearer token
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      return {
        success: false,
        error: {
          error: {
            message: 'Invalid Authorization header format. Use: Authorization: Bearer pp_live-...',
            type: 'auth_error',
            code: 'invalid_auth_format',
          },
        },
      };
    }

    const apiKey = match[1];

    // Validate API key
    const validation = await validateApiKey(apiKey);
    if (!validation || !validation.isValid || !validation.userId || !validation.apiKeyId) {
      return {
        success: false,
        error: {
          error: {
            message: 'Invalid or expired API key',
            type: 'auth_error',
            code: 'invalid_api_key',
          },
        },
      };
    }

    // Check rate limits
    const rateLimitCheck = await checkRateLimit(
      validation.apiKeyId,
      validation.rateLimitPerMinute || 60,
      validation.rateLimitPerDay || 1000
    );

    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        error: {
          error: {
            message: rateLimitCheck.reason || 'Rate limit exceeded',
            type: 'rate_limit_error',
            code: 'rate_limit_exceeded',
          },
        },
      };
    }

    // Get wallet and check balance
    const wallet = await getOrCreateWallet(validation.userId);
    if (!wallet) {
      return {
        success: false,
        error: {
          error: {
            message: 'Failed to access wallet',
            type: 'server_error',
            code: 'wallet_error',
          },
        },
      };
    }

    const balance = parseFloat(wallet.balance);

    // Check minimum balance (at least $0.01)
    if (balance < 0.01) {
      return {
        success: false,
        error: {
          error: {
            message: `Insufficient balance. Your current balance is $${balance.toFixed(2)}. Please top up your wallet to continue using the API.`,
            type: 'insufficient_balance',
            code: 'insufficient_balance',
            details: {
              balance: balance,
              minimum_required: 0.01,
            },
          },
        },
      };
    }

    // Return auth context
    return {
      success: true,
      context: {
        userId: validation.userId,
        apiKeyId: validation.apiKeyId,
        walletId: wallet.id,
        balance: balance,
        rateLimitPerMinute: validation.rateLimitPerMinute || 60,
        rateLimitPerDay: validation.rateLimitPerDay || 1000,
      },
    };
  } catch (error) {
    console.error('Error authenticating request:', error);
    return {
      success: false,
      error: {
        error: {
          message: 'Authentication failed',
          type: 'server_error',
          code: 'auth_error',
        },
      },
    };
  }
}

/**
 * Process billing after API call completes
 */
export async function processBilling(params: {
  authContext: AuthContext;
  model: string;
  messages: any[];
  responseText: string;
  endpoint: string;
  statusCode: number;
  responseTimeMs: number;
  errorMessage?: string;
}): Promise<{ success: boolean; cost: number; newBalance?: number }> {
  try {
    const {
      authContext,
      model,
      messages,
      responseText,
      endpoint,
      statusCode,
      responseTimeMs,
      errorMessage,
    } = params;

    // Estimate token counts
    const inputTokens = estimateMessagesTokenCount(messages);
    const outputTokens = Math.ceil(responseText.length / 4); // Simple estimation

    // Calculate cost
    const cost = await calculateCost(model, inputTokens, outputTokens);

    // Only charge for successful requests
    if (statusCode === 200) {
      // Deduct credits
      const deductResult = await deductCredits(
        authContext.userId,
        cost,
        `AI API usage: ${model}`,
        {
          api_key_id: authContext.apiKeyId,
          model,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          endpoint,
        }
      );

      if (!deductResult.success) {
        console.error('Failed to deduct credits:', authContext.userId, cost);
        return { success: false, cost };
      }

      // Log usage
      await logUsage({
        userId: authContext.userId,
        apiKeyId: authContext.apiKeyId,
        walletId: authContext.walletId,
        model,
        endpoint,
        inputTokens,
        outputTokens,
        cost,
        statusCode,
        responseTimeMs,
        errorMessage,
        metadata: {
          message_count: messages.length,
          response_length: responseText.length,
        },
      });

      return {
        success: true,
        cost,
        newBalance: deductResult.newBalance,
      };
    } else {
      // Log failed request (no charge)
      await logUsage({
        userId: authContext.userId,
        apiKeyId: authContext.apiKeyId,
        walletId: authContext.walletId,
        model,
        endpoint,
        inputTokens,
        outputTokens,
        cost: 0, // No charge for failed requests
        statusCode,
        responseTimeMs,
        errorMessage,
        metadata: {
          message_count: messages.length,
          error: true,
        },
      });

      return { success: true, cost: 0 };
    }
  } catch (error) {
    console.error('Error processing billing:', error);
    return { success: false, cost: 0 };
  }
}
