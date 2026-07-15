import { describe, expect, it } from 'vitest';

import { normalizeConversationMessage, normalizeConversationMessages } from './normalize-conversation';

describe('normalizeConversationMessage', () => {
  it('passes through user messages unchanged', () => {
    expect(normalizeConversationMessage({ role: 'user', content: 'Hello' })).toEqual({
      role: 'user',
      content: 'Hello',
    });
  });

  it('flattens legacy nested metadata on assistant messages', () => {
    expect(
      normalizeConversationMessage({
        role: 'assistant',
        content: 'Try IDFC FIRST Private for 0% forex.',
        metadata: {
          confidence: 'high',
          toolsUsed: ['rag'],
          citations: [
            {
              entityType: 'card',
              id: '019f52a4-c692-727d-b386-e925a3c8aecc',
              slug: 'idfc-first-private',
              label: 'IDFC FIRST Private',
            },
          ],
          results: [
            {
              kind: 'card',
              id: '019f52a4-c692-727d-b386-e925a3c8aecc',
              slug: 'idfc-first-private',
              title: 'IDFC FIRST Private',
            },
          ],
        },
      }),
    ).toEqual({
      role: 'assistant',
      content: 'Try IDFC FIRST Private for 0% forex.',
      confidence: 'high',
      toolsUsed: ['rag'],
      citations: [
        {
          entityType: 'card',
          id: '019f52a4-c692-727d-b386-e925a3c8aecc',
          slug: 'idfc-first-private',
          label: 'IDFC FIRST Private',
        },
      ],
      results: [
        {
          kind: 'card',
          id: '019f52a4-c692-727d-b386-e925a3c8aecc',
          slug: 'idfc-first-private',
          title: 'IDFC FIRST Private',
        },
      ],
    });
  });

  it('prefers top-level fields over nested metadata', () => {
    expect(
      normalizeConversationMessage({
        role: 'assistant',
        content: 'Answer',
        confidence: 'medium',
        toolsUsed: ['listCards'],
        metadata: {
          confidence: 'high',
          toolsUsed: ['rag'],
        },
      }),
    ).toEqual({
      role: 'assistant',
      content: 'Answer',
      confidence: 'medium',
      toolsUsed: ['listCards'],
    });
  });
});

describe('normalizeConversationMessages', () => {
  it('normalizes an entire conversation thread', () => {
    const messages = normalizeConversationMessages([
      { role: 'user', content: 'Which card has 0% forex?' },
      {
        role: 'assistant',
        content: 'IDFC FIRST Private offers 0% forex markup.',
        metadata: { toolsUsed: ['rag'], confidence: 'high' },
      },
    ]);

    expect(messages).toHaveLength(2);
    expect(messages[1]?.toolsUsed).toEqual(['rag']);
  });
});
