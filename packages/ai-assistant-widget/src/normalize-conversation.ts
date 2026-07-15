import type { AssistantMessage } from './types';

type StoredAssistantMessage = AssistantMessage & {
  metadata?: {
    confidence?: AssistantMessage['confidence'];
    toolsUsed?: AssistantMessage['toolsUsed'];
    citations?: AssistantMessage['citations'];
    results?: AssistantMessage['results'];
  };
};

/** Flatten legacy nested metadata from persisted conversations. */
export function normalizeConversationMessage(message: StoredAssistantMessage): AssistantMessage {
  if (message.role === 'user') {
    return { role: 'user', content: message.content };
  }

  const meta = message.metadata;

  return {
    role: 'assistant',
    content: message.content,
    confidence: message.confidence ?? meta?.confidence,
    toolsUsed: message.toolsUsed ?? meta?.toolsUsed,
    citations: message.citations ?? meta?.citations,
    results: message.results ?? meta?.results,
  };
}

export function normalizeConversationMessages(messages: StoredAssistantMessage[]): AssistantMessage[] {
  return messages.map(normalizeConversationMessage);
}
