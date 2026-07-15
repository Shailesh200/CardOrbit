import { describe, expect, it } from 'vitest';

import {
  AssistantChatRequestSchema,
  AssistantConversationSchema,
  AssistantIntentOutputSchema,
  AssistantResultItemSchema,
  parseAssistantChatRequest,
} from '../assistant';

describe('Assistant validation schemas', () => {
  it('parses a valid chat request', () => {
    const parsed = parseAssistantChatRequest({
      message: 'Which card has 0% forex?',
      history: [{ role: 'user', content: 'Hi' }],
    });

    expect(parsed.message).toBe('Which card has 0% forex?');
    expect(parsed.history).toHaveLength(1);
  });

  it('rejects empty messages', () => {
    expect(() => parseAssistantChatRequest({ message: '   ' })).toThrow();
  });

  it('accepts catalog_qa intent output with search query', () => {
    const result = AssistantIntentOutputSchema.parse({
      intent: 'catalog_qa',
      searchQuery: 'forex markup zero percent',
    });

    expect(result.intent).toBe('catalog_qa');
  });

  it('validates assistant result items for structured UI cards', () => {
    const item = AssistantResultItemSchema.parse({
      kind: 'card',
      id: '019f52a4-c692-727d-b386-e925a3c8aecc',
      slug: 'idfc-first-private',
      title: 'IDFC FIRST Private',
      highlights: ['0% forex markup'],
    });

    expect(item.kind).toBe('card');
  });

  it('validates persisted conversation shape', () => {
    const conversation = AssistantConversationSchema.parse({
      conversationId: '019f52a4-c692-727d-b386-e925a3c8ae01',
      messages: [
        { role: 'user', content: 'Hello' },
        {
          role: 'assistant',
          content: 'Hi — ask about cards or merchants.',
          confidence: 'high',
          toolsUsed: ['rag'],
        },
      ],
    });

    expect(conversation.messages).toHaveLength(2);
  });

  it('caps history length on chat requests', () => {
    const history = Array.from({ length: 13 }, (_, index) => ({
      role: 'user' as const,
      content: `Message ${index}`,
    }));

    expect(() =>
      AssistantChatRequestSchema.parse({
        message: 'test',
        history,
      }),
    ).toThrow();
  });
});
