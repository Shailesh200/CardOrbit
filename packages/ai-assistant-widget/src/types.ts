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

export type AiAssistantTransport = {
  getStatus: () => Promise<AssistantStatus>;
  loadConversation?: () => Promise<AssistantConversation | null>;
  sendMessage: (input: {
    message: string;
    conversationId?: string;
    history?: AssistantMessage[];
  }) => Promise<AssistantChatResponse>;
};
