import { createOpenAI } from '@ai-sdk/openai';
import { createMistral } from '@ai-sdk/mistral';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createTogetherAI } from '@ai-sdk/togetherai';
import { createCohere } from '@ai-sdk/cohere';
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
            throw new Error(`a0.dev API error: ${response.status} ${response.statusText}`);
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
            throw new Error(`a0.dev streaming API error: ${response.status} ${response.statusText}`);
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

// Create the default Codestral client
const codestral = createOpenAICompatible({
  name: 'codestral',
  baseURL: 'https://codestral.mistral.ai/v1',
  apiKey: process.env.CODESTRAL_API_KEY || 'DXfXAjwNIZcAv1ESKtoDwWZZF98lJxho',
});

// Create provider instances with fallback API keys
const openaiProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || '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',
});

const mistralProvider = createMistral({
  apiKey: process.env.MISTRAL_API_KEY || 'W8txIqwcJnyHBTthSlouN2w3mQciqAUr',
});

const googleProvider = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || 'AIzaSyAepjq9CgCOBhBBvZ8Vf0cxrqa_RFX60mE',
});

const groqProvider = createGroq({
  apiKey: process.env.GROQ_API_KEY || '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',
});

const togetheraiProvider = createTogetherAI({
  apiKey: process.env.TOGETHER_AI_API_KEY || 'c0c4d20f02dc71fdc2526f83049d0ed742b9cecbd1973abfe88610f6d0e9be2f',
});

const cohereProvider = createCohere({
  apiKey: process.env.COHERE_API_KEY || 'LMzu7i1zyxk5LWzBE1iDXRSwFwHvMLwZDhFhpP7q',
});

const xaiProvider = createXai({
  apiKey: process.env.XAI_API_KEY || 'xai-your-api-key-here',
});

// Debug function to check environment variables
function checkProviderKeys() {
  const keys = {
    a0dev: process.env.A0_DEV_API_KEY || 'Not required',
    codestral: process.env.CODESTRAL_API_KEY || 'DXfXAjwNIZcAv1ESKtoDwWZZF98lJxho',
    openai: process.env.OPENAI_API_KEY || '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',
    mistral: process.env.MISTRAL_API_KEY || 'W8txIqwcJnyHBTthSlouN2w3mQciqAUr',
    google: process.env.GOOGLE_GENERATIVE_AI_API_KEY || 'AIzaSyAepjq9CgCOBhBBvZ8Vf0cxrqa_RFX60mE',
    groq: process.env.GROQ_API_KEY || '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',
    togetherai: process.env.TOGETHER_AI_API_KEY || 'c0c4d20f02dc71fdc2526f83049d0ed742b9cecbd1973abfe88610f6d0e9be2f',
    cohere: process.env.COHERE_API_KEY || 'LMzu7i1zyxk5LWzBE1iDXRSwFwHvMLwZDhFhpP7q',
    xai: process.env.XAI_API_KEY || 'xai-your-api-key-here',
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('🔑 AI Provider API Keys Status:');
    console.log('================================');
    Object.entries(keys).forEach(([provider, key]) => {
      const envVarMap: Record<string, string> = {
        a0dev: 'A0_DEV_API_KEY',
        codestral: 'CODESTRAL_API_KEY',
        openai: 'OPENAI_API_KEY',
        mistral: 'MISTRAL_API_KEY',
        google: 'GOOGLE_GENERATIVE_AI_API_KEY',
        groq: 'GROQ_API_KEY',
        togetherai: 'TOGETHER_AI_API_KEY',
        cohere: 'COHERE_API_KEY',
        xai: 'XAI_API_KEY',
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
  // Auto/Default Option - uses Grok Code Fast 1
  'auto': xaiProvider ('grok-code-fast-1'), // Auto selection uses Grok Code Fast 1
  
  // a0.dev Models
  'a0-dev-llm': a0devProvider.languageModel('a0-dev-llm'),
  
  // Mistral Models - Default uses Codestral endpoint
  'open-codestral-mamba': codestral('codestral-latest'), // Direct Codestral model selection
  'pixtral-12b-2409': mistralProvider('pixtral-12b-2409'),
  'mistral-small-2503': mistralProvider('mistral-small-2503'),
  'mistral-small-2506': mistralProvider('mistral-small-2506'),
  'open-mistral-nemo': mistralProvider('open-mistral-nemo'),

  // OpenAI Models
  'gpt-4o': openaiProvider('gpt-4o'),
  'gpt-4o-mini': openaiProvider('gpt-4o-mini'),
  'gpt-4-turbo': openaiProvider('gpt-4-turbo'),
  'gpt-3.5-turbo': openaiProvider('gpt-3.5-turbo'),
  'gpt-5-mini': openaiProvider('gpt-5-mini'),
  'gpt-4.1-nano': openaiProvider('gpt-4.1-nano'),
  'gpt-5-nano': openaiProvider('gpt-5-nano'),
  'gpt-4.1-mini': openaiProvider('gpt-4.1-mini'),

  // Google Gemini Models
  'gemini-2.0-flash': googleProvider('gemini-2.0-flash'),
  'gemini-1.5-pro': googleProvider('gemini-1.5-pro'),
  'gemini-1.5-flash': googleProvider('gemini-1.5-flash'),
  'gemini-2.5-flash-lite': googleProvider('gemini-2.5-flash-lite'),

  // Groq Models
  'llama-3.3-70b-versatile': groqProvider('llama-3.3-70b-versatile'),
  'llama-3.1-8b-instant': groqProvider('llama-3.1-8b-instant'),
  'mixtral-8x7b-32768': groqProvider('mixtral-8x7b-32768'),
  'gemma2-9b-it': groqProvider('gemma2-9b-it'),
  'deepseek-r1-distill-llama-70b': groqProvider('deepseek-r1-distill-llama-70b'),
  'moonshotai/kimi-k2-instruct': groqProvider('moonshotai/kimi-k2-instruct'),
  'qwen/qwen3-32b': groqProvider('qwen/qwen3-32b'),
  'meta-llama/llama-4-scout-17b-16e-instruct': groqProvider('meta-llama/llama-4-scout-17b-16e-instruct'),

  // Together.ai Models
  'meta-llama/Llama-3.3-70B-Instruct-Turbo': togetheraiProvider('meta-llama/Llama-3.3-70B-Instruct-Turbo'),
  'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': togetheraiProvider('meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo'),
  'codellama/CodeLlama-34b-Instruct-hf': togetheraiProvider('codellama/CodeLlama-34b-Instruct-hf'),
  'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free': togetheraiProvider('meta-llama/Llama-3.3-70B-Instruct-Turbo-Free'),
  'meta-llama/Llama-Vision-Free': togetheraiProvider('meta-llama/Llama-Vision-Free'),
  'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free': togetheraiProvider('deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free'),

  // Cohere Models (v2 compatible with AI SDK 5 - confirmed working)
  'command-r-plus': cohereProvider('command-r-plus-04-2024'),
  'command-r': cohereProvider('command-r-08-2024'),
  'command': cohereProvider('command-nightly'),
  'command-a-reasoning-08-2025': cohereProvider('command-a-03-2025'),

  // xAI Grok Models
  'grok-code-fast-1': xaiProvider('grok-code-fast-1'),
  'grok-3': xaiProvider('grok-3'),
  'grok-3-mini': xaiProvider('grok-3-mini'),
  'grok-3-mini-fast': xaiProvider('grok-3-mini-fast'),
  'grok-3-latest': xaiProvider('grok-3-latest'),
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
  openaiProvider as openai,
  mistralProvider as mistral,
  googleProvider as google,
  groqProvider as groq,
  togetheraiProvider as togetherai,
  cohereProvider as cohere,
  xaiProvider as xai,
  codestral,
  createOpenAICompatible,
};