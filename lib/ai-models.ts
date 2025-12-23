export const DEFAULT_CHAT_MODEL: string = 'xai/grok-code-fast-1';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
  provider: string;
}

export const chatModels: Array<ChatModel> = [
  // Auto/Default Option
  {
    id: 'auto',
    name: 'Auto',
    description: 'Automatically uses the best model for code generation',
    provider: 'vercel-gateway',
  },

  // Codestral Models (Custom)
  {
    id: 'codestral-latest',
    name: 'Codestral',
    description: 'Mistral Codestral model via custom endpoint',
    provider: 'codestral',
  },

  // a0.dev Models (Custom)
  {
    id: 'a0-dev-llm',
    name: 'Pixela',
    description: 'Pixela model from PiPilot with strong code generation capabilities',
    provider: 'a0dev',
  },

  // Mistral Models
  {
    id: 'pixtral-12b-2409',
    name: 'Pixtral 12B',
    description: 'Mistral multimodal model with vision capabilities',
    provider: 'mistral',
  },

  // Vercel AI Gateway Models
  {
    id: 'mistral/devstral-2',
    name: 'Mistral Devstral 2',
    description: 'Mistral Devstral 2 via Vercel AI Gateway',
    provider: 'vercel-gateway',
  },
  {
    id: 'kwaipilot/kat-coder-pro-v1',
    name: 'Kwaipilot Kat Coder Pro V1',
    description: 'Kwaipilot Kat Coder Pro V1 via Vercel AI Gateway',
    provider: 'vercel-gateway',
  },
  {
    id: 'xai/grok-code-fast-1',
    name: 'xAI Grok Code Fast 1',
    description: 'xAI Grok Code Fast 1 via Vercel AI Gateway',
    provider: 'vercel-gateway',
  },
  {
    id: 'nvidia/nemotron-nano-12b-v2-vl',
    name: 'NVIDIA Nemotron Nano 12B V2 VL',
    description: 'NVIDIA Nemotron Nano 12B V2 VL via Vercel AI Gateway',
    provider: 'vercel-gateway',
  },
  {
    id: 'minimax/minimax-m2',
    name: 'MiniMax M2',
    description: 'MiniMax M2 via Vercel AI Gateway',
    provider: 'vercel-gateway',
  },
  {
    id: 'moonshotai/kimi-k2-thinking',
    name: 'MoonshotAI Kimi K2 Thinking',
    description: 'MoonshotAI Kimi K2 Thinking via Vercel AI Gateway',
    provider: 'vercel-gateway',
  },
  {
    id: 'mistral/devstral-small-2',
    name: 'Mistral Devstral Small 2',
    description: 'Mistral Devstral Small 2 via Vercel AI Gateway',
    provider: 'vercel-gateway',
  },
  {
    id: 'anthropic/claude-haiku-4.5',
    name: 'Anthropic Claude Haiku 4.5',
    description: 'Anthropic Claude Haiku 4.5 via Vercel AI Gateway',
    provider: 'vercel-gateway',
  },
  {
    id: 'alibaba/qwen3-coder-plus',
    name: 'Alibaba Qwen3 Coder Plus',
    description: 'Alibaba Qwen3 Coder Plus via Vercel AI Gateway',
    provider: 'vercel-gateway',
  },
  {
    id: 'anthropic/claude-sonnet-4.5',
    name: 'Anthropic Claude Sonnet 4.5',
    description: 'Anthropic Claude Sonnet 4.5 via Vercel AI Gateway',
    provider: 'vercel-gateway',
  },
  {
    id: 'meituan/longcat-flash-chat',
    name: 'Meituan LongCat Flash Chat',
    description: 'Meituan LongCat Flash Chat via Vercel AI Gateway',
    provider: 'vercel-gateway',
  },
];

export function getModelById(modelId: string): ChatModel | undefined {
  return chatModels.find(model => model.id === modelId);
}

export function getModelsByProvider(provider: string): ChatModel[] {
  return chatModels.filter(model => model.provider === provider);
}

export function getAllProviders(): string[] {
  return Array.from(new Set(chatModels.map(model => model.provider)));
}