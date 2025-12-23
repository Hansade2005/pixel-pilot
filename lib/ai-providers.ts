import { createOpenAI } from '@ai-sdk/openai';
import { createMistral } from '@ai-sdk/mistral';
import { createXai } from '@ai-sdk/xai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

// Custom a0.dev provider implementation (no API key required)
function createA0Dev(options: { apiKey?: string } = {}) {
  // a0.dev doesn't require API key authentication
  return {
    languageModel(model: string) {
      return {
        specificationVersion: 'v1',
        provider: 'a0-dev',
        modelId: model,
        defaultObjectGenerationMode: 'json',

        async doGenerate(options: any) {
          const { prompt, mode, ...otherOptions } = options;

          // Convert AI SDK messages to a0.dev format
          const messages = prompt.map((msg: any) => ({
            role: msg.role,
            content: msg.content
          }));

          const body = {
            messages,
            temperature: otherOptions.temperature || 0.7,
            ...otherOptions
          };

          const response = await fetch('https://api.a0.dev/ai/llm', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
              // No Authorization header needed for a0.dev
            },
            body: JSON.stringify(body)
          });

          if (!response.ok) {
            const errorText = await response.text();
            // Log the actual error internally but don't expose it
            console.error(`a0.dev API error (${response.status}):`, errorText);
            throw new Error(`API_ERROR_${response.status}`);
          }

          const result = await response.json();

          return {
            text: result.completion || result.message || JSON.stringify(result),
            finishReason: 'stop',
            usage: {
              promptTokens: 0, // a0.dev doesn't provide token counts
              completionTokens: 0,
              totalTokens: 0
            },
            rawCall: {
              rawPrompt: prompt,
              rawSettings: otherOptions
            }
          };
        },

        async doStream(options: any) {
          const { prompt, ...otherOptions } = options;

          // Convert AI SDK messages to a0.dev format
          const messages = prompt.map((msg: any) => ({
            role: msg.role,
            content: msg.content
          }));

          const body = {
            messages,
            temperature: otherOptions.temperature || 0.7,
            stream: true,
            ...otherOptions
          };

          const response = await fetch('https://api.a0.dev/ai/llm', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
              // No Authorization header needed for a0.dev
            },
            body: JSON.stringify(body)
          });

          if (!response.ok) {
            const errorText = await response.text();
            // Log the actual error internally but don't expose it
            console.error(`a0.dev streaming API error (${response.status}):`, errorText);
            throw new Error(`API_ERROR_${response.status}`);
          }

          if (!response.body) {
            throw new Error('Response body is null - streaming not supported');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          return {
            [Symbol.asyncIterator]() {
              return {
                async next() {
                  const { done, value } = await reader.read();
                  if (done) {
                    return { done: true, value: undefined };
                  }

                  const chunk = decoder.decode(value, { stream: true });
                  return {
                    done: false,
                    value: {
                      type: 'text-delta',
                      textDelta: chunk
                    }
                  };
                }
              };
            }
          };
        }
      };
    }
  };
}

// Create the a0.dev provider instance (no API key required)
const a0devProvider = createA0Dev();

// Create Vercel AI Gateway provider
const vercelGateway = createOpenAICompatible({
  name: 'vercel-gateway',
  baseURL: 'https://ai-gateway.vercel.sh/v1',
  apiKey: process.env.VERCEL_AI_GATEWAY_API_KEY || '',
});

// Create the default Codestral client
const codestral = createOpenAICompatible({
  name: 'codestral',
  baseURL: 'https://codestral.mistral.ai/v1',
  apiKey: process.env.CODESTRAL_API_KEY || 'DXfXAjwNIZcAv1ESKtoDwWZZF98lJxho',
});

// Create provider instances with fallback API keys
const openaiProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const mistralProvider = createMistral({
  apiKey: process.env.MISTRAL_API_KEY || 'W8txIqwcJnyHBTthSlouN2w3mQciqAUr',
});

const xaiProvider = createXai({
  apiKey: process.env.XAI_API_KEY || 'xai-your-api-key-here',
});

const openrouterProvider = createOpenAICompatible({
  name: 'openrouter',
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || 'sk-or-v1-your-openrouter-api-key',
  headers: {
    'HTTP-Referer': 'https://pipilot.dev', // app's URL
    'X-Title': 'PiPilot', // app's display name
  },
});

// Create PiPilot Local Provider (OpenAI Compatible)
// In development, ALWAYS use localhost to ensure we're testing the local API
// In production, use the APP_URL or fallback to localhost
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const pipilotBaseUrl = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3000/api/v1'
  : `${appUrl}/api/v1`;

const pipilotProvider = createOpenAICompatible({
  name: 'pipilot',
  baseURL: pipilotBaseUrl,
  apiKey: 'not-needed', // Internal API doesn't require key
});

// Smart routing for xAI Grok Code Fast 1 - tries gateway first, falls back to direct xAI
function createSmartXaiGrokProvider() {
  const gatewayModel = vercelGateway('xai/grok-code-fast-1');
  const directXaiModel = xaiProvider('grok-code-fast-1');

  return {
    ...gatewayModel,
    async doGenerate(options: any) {
      try {
        // Try gateway first
        return await gatewayModel.doGenerate(options);
      } catch (error) {
        console.log('Gateway failed for xAI Grok Code Fast 1, falling back to direct xAI provider');
        // Fall back to direct xAI provider
        return await directXaiModel.doGenerate(options);
      }
    },
    async doStream(options: any) {
      try {
        // Try gateway first
        return await gatewayModel.doStream(options);
      } catch (error) {
        console.log('Gateway failed for xAI Grok Code Fast 1, falling back to direct xAI provider');
        // Fall back to direct xAI provider
        return await directXaiModel.doStream(options);
      }
    }
  };
}

const smartXaiGrokProvider = createSmartXaiGrokProvider();

// Debug function to check environment variables
function checkProviderKeys() {
  const keys = {
    a0dev: process.env.A0_DEV_API_KEY || 'Not required',
    codestral: process.env.CODESTRAL_API_KEY || 'DXfXAjwNIZcAv1ESKtoDwWZZF98lJxho',
    vercelGateway: process.env.VERCEL_AI_GATEWAY_API_KEY || '',
    openai: process.env.OPENAI_API_KEY || '',
    mistral: process.env.MISTRAL_API_KEY || 'W8txIqwcJnyHBTthSlouN2w3mQciqAUr',
    xai: process.env.XAI_API_KEY || 'xai-your-api-key-here',
    openrouter: process.env.OPENROUTER_API_KEY || '',
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('🔑 AI Provider API Keys Status:');
    console.log('================================');
    Object.entries(keys).forEach(([provider, key]) => {
      const envVarMap: Record<string, string> = {
        a0dev: 'A0_DEV_API_KEY',
        codestral: 'CODESTRAL_API_KEY',
        vercelGateway: 'VERCEL_AI_GATEWAY_API_KEY',
        openai: 'OPENAI_API_KEY',
        mistral: 'MISTRAL_API_KEY',
        xai: 'XAI_API_KEY',
        openrouter: 'OPENROUTER_API_KEY',
      };
      const isEnvVar = !!process.env[envVarMap[provider]];
      const status = isEnvVar ? '✅ Env' : '🔄 Fallback';
      const keyPreview = key ? `${key.substring(0, 12)}...` : 'Not found';
      console.log(`${provider.padEnd(12)}: ${status} (${keyPreview})`);
    });
    console.log('================================');
  }

  return keys;
}

// Check keys on initialization (only in development)
if (process.env.NODE_ENV === 'development') {
  checkProviderKeys();
}

// Model mapping with direct provider instances
const modelProviders: Record<string, any> = {
  // Auto/Default Option - uses Grok Code Fast 1 with smart routing
  'auto': smartXaiGrokProvider,

  // Codestral Models (Custom - kept as is)
  'codestral-latest': codestral('codestral-latest'),

  // a0.dev Models (Custom - kept as is)
  'a0-dev-llm': a0devProvider.languageModel('a0-dev-llm'),

  // Mistral Models
  'pixtral-12b-2409': mistralProvider('pixtral-12b-2409'),

  // Vercel AI Gateway Models
  'mistral/devstral-2': vercelGateway('mistral/devstral-2'),
  'kwaipilot/kat-coder-pro-v1': vercelGateway('kwaipilot/kat-coder-pro-v1'),
  'xai/grok-code-fast-1': smartXaiGrokProvider,
  'nvidia/nemotron-nano-12b-v2-vl': vercelGateway('nvidia/nemotron-nano-12b-v2-vl'),
  'minimax/minimax-m2': vercelGateway('minimax/minimax-m2'),
  'moonshotai/kimi-k2-thinking': vercelGateway('moonshotai/kimi-k2-thinking'),
  'mistral/devstral-small-2': vercelGateway('mistral/devstral-small-2'),
  'anthropic/claude-haiku-4.5': vercelGateway('anthropic/claude-haiku-4.5'),
  'alibaba/qwen3-coder-plus': vercelGateway('alibaba/qwen3-coder-plus'),
  'anthropic/claude-sonnet-4.5': vercelGateway('anthropic/claude-sonnet-4.5'),
  'meituan/longcat-flash-chat': vercelGateway('meituan/longcat-flash-chat'),
};

// Helper function to get a model by ID
export function getModel(modelId: string) {
  const model = modelProviders[modelId];
  if (!model) {
    throw new Error(`Model ${modelId} not found. Available models: ${Object.keys(modelProviders).join(', ')}`);
  }
  return model;
}

// Export individual providers for direct use if needed
export {
  a0devProvider as a0dev,
  vercelGateway,
  openaiProvider as openai,
  mistralProvider as mistral,
  xaiProvider as xai,
  openrouterProvider as openrouter,
  codestral,
  createOpenAICompatible,
};