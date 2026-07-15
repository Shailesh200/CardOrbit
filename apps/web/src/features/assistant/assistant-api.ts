import { authFetch } from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type AssistantMessage = {
  role: 'user' | 'assistant';
  content: string;
  confidence?: 'high' | 'medium' | 'low';
  toolsUsed?: Array<'getRecommendation' | 'listCards' | 'rag'>;
  citations?: AssistantCitation[];
  actions?: AssistantAction[];
  results?: AssistantResultItem[];
};

export type AssistantAction = {
  type: 'VIEW_CARD' | 'VIEW_MERCHANT' | 'OPEN_MERCHANT' | 'OPEN_CATALOG';
  id?: string;
  slug?: string;
  label?: string;
};

export type AssistantCitation = {
  entityType: 'card' | 'merchant';
  id: string;
  slug: string;
  label: string;
};

export type AssistantResultItem = {
  kind: 'card' | 'merchant' | 'portfolio_card' | 'offer';
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  highlights?: string[];
  badge?: string;
  inPortfolio?: boolean;
  userCardId?: string;
};

export type AssistantChatResponse = {
  conversationId: string;
  message: string;
  readOnly: true;
  confidence: 'high' | 'medium' | 'low';
  toolsUsed: Array<'getRecommendation' | 'listCards' | 'rag'>;
  citations: AssistantCitation[];
  actions: AssistantAction[];
  results: AssistantResultItem[];
};

export type AssistantConversation = {
  conversationId: string;
  messages: AssistantMessage[];
};

export type AssistantStatus = {
  enabled: boolean;
  configured: boolean;
};

export function getAssistantStatus() {
  return authFetch<AssistantStatus>('/api/v1/ai/assistant/status', {}, API_BASE);
}

export function getAssistantConversation() {
  return authFetch<AssistantConversation | null>('/api/v1/ai/assistant/conversation', {}, API_BASE);
}

export function sendAssistantMessage(input: {
  message: string;
  conversationId?: string;
  history?: AssistantMessage[];
}) {
  return authFetch<AssistantChatResponse>(
    '/api/v1/ai/chat',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    API_BASE,
  );
}

export function assistantActionPath(action: AssistantAction): string | null {
  switch (action.type) {
    case 'VIEW_CARD':
      return action.id ? `/account/cards/${action.id}` : '/account/cards/add';
    case 'VIEW_MERCHANT':
    case 'OPEN_MERCHANT':
      return action.slug ? `/account/merchants/${action.slug}` : '/account/merchants';
    case 'OPEN_CATALOG':
      return '/account/cards/add';
    default:
      return null;
  }
}

export function assistantResultPath(result: AssistantResultItem): string | null {
  if (result.kind === 'merchant') {
    return `/account/merchants/${result.slug}`;
  }
  if (result.kind === 'portfolio_card' && result.userCardId) {
    return `/account/cards/${result.userCardId}`;
  }
  return `/account/cards/add`;
}
