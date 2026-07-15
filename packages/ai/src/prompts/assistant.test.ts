import { describe, expect, it } from 'vitest';

import { buildAssistantIntentPrompt, buildAssistantTurnPrompt } from './assistant';

describe('assistant prompts', () => {
  it('includes forex catalog disambiguation in intent prompt', () => {
    const prompt = buildAssistantIntentPrompt({
      message: 'best card for forex transactions',
      history: [],
      userContext: { portfolioCount: 2 },
    });

    expect(prompt).toContain('catalog_qa');
    expect(prompt).toContain('best card for forex transactions');
    expect(prompt).toContain('0% forex');
  });

  it('includes tool results in turn prompt', () => {
    const prompt = buildAssistantTurnPrompt({
      message: 'Which card has 0% forex?',
      history: [{ role: 'user', content: 'Which card has 0% forex?' }],
      userContext: { portfolioCount: 1 },
      toolsUsed: ['rag'],
      toolResults: {
        rag: {
          answer: 'IDFC FIRST Private has 0% forex markup.',
          chunks: [{ title: 'IDFC FIRST Private' }],
        },
      },
    });

    expect(prompt).toContain('IDFC FIRST Private');
    expect(prompt).toContain('rag');
  });
});
