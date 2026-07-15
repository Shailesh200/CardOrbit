export type AiProviderKind = 'gemini' | 'openai' | 'anthropic';

export type AiConfig = {
  provider: AiProviderKind;
  apiKey: string;
  defaultModel: string;
  fastModel: string;
  qualityModel: string;
  pingModel: string;
  embeddingModel: string;
};

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

const DEFAULT_GEMINI_MODEL = 'gemini-flash-latest';
const DEFAULT_EMBEDDING_MODEL = 'text-embedding-004';

export const EMBEDDING_DIMENSION = 768;

function resolveProvider(raw: string | undefined): AiProviderKind {
  if (raw === 'openai' || raw === 'anthropic') return raw;
  return 'gemini';
}

export function loadAiConfig(): AiConfig {
  const provider = resolveProvider(readEnv('AI_PROVIDER'));

  const geminiKey = readEnv('GEMINI_API_KEY');
  const genericKey = readEnv('AI_API_KEY');
  const openaiKey = readEnv('OPENAI_API_KEY');
  const anthropicKey = readEnv('ANTHROPIC_API_KEY');

  const apiKey =
    provider === 'gemini'
      ? (geminiKey ?? genericKey ?? '')
      : provider === 'openai'
        ? (openaiKey ?? genericKey ?? '')
        : (anthropicKey ?? genericKey ?? '');

  if (!apiKey) {
    const hint =
      provider === 'gemini'
        ? 'GEMINI_API_KEY'
        : provider === 'openai'
          ? 'OPENAI_API_KEY or AI_API_KEY'
          : 'ANTHROPIC_API_KEY or AI_API_KEY';
    throw new Error(`Missing ${hint}. Add your API key to .env.local — see packages/ai/README.md`);
  }

  const defaultModel = readEnv('GEMINI_MODEL') ?? DEFAULT_GEMINI_MODEL;

  return {
    provider,
    apiKey,
    defaultModel,
    fastModel: readEnv('AI_DEFAULT_FAST_MODEL') ?? defaultModel,
    qualityModel: readEnv('AI_DEFAULT_QUALITY_MODEL') ?? defaultModel,
    pingModel: readEnv('AI_PING_MODEL') ?? defaultModel,
    embeddingModel: readEnv('AI_DEFAULT_EMBEDDING_MODEL') ?? DEFAULT_EMBEDDING_MODEL,
  };
}

export function isAiConfigured(): boolean {
  try {
    loadAiConfig();
    return true;
  } catch {
    return false;
  }
}
