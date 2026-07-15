import { describe, expect, it } from 'vitest';

import {
  parseListRecommendationHistoryQuery,
  parseSubmitRecommendationFeedbackInput,
  SubmitRecommendationFeedbackSchema,
} from '../recommendation-history';

describe('recommendation-history validation', () => {
  it('parses history list query defaults', () => {
    const parsed = parseListRecommendationHistoryQuery({});
    expect(parsed.limit).toBe(20);
  });

  it('parses feedback submission input', () => {
    const parsed = parseSubmitRecommendationFeedbackInput({ type: 'USEFUL' });
    expect(parsed.type).toBe('USEFUL');
  });

  it('rejects unknown feedback types', () => {
    expect(() => SubmitRecommendationFeedbackSchema.parse({ type: 'MAYBE' })).toThrow();
  });
});
