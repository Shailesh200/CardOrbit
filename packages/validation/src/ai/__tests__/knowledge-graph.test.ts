import { describe, expect, it } from 'vitest';

import {
  GraphTraverseRequestSchema,
  parseGraphExpandRequest,
  parseGraphTraverseRequest,
} from '../knowledge-graph';

describe('knowledge-graph validation', () => {
  it('parses traverse requests with defaults', () => {
    const parsed = parseGraphTraverseRequest({
      entityType: 'card',
      slug: 'idfc-first',
    });

    expect(parsed).toEqual({
      entityType: 'card',
      slug: 'idfc-first',
      depth: 1,
      limit: 20,
    });
  });

  it('rejects invalid traverse depth', () => {
    expect(() =>
      GraphTraverseRequestSchema.parse({
        entityType: 'merchant',
        slug: 'swiggy',
        depth: 5,
      }),
    ).toThrow();
  });

  it('parses expand requests for card and merchant entities', () => {
    const parsed = parseGraphExpandRequest({
      entities: [{ entityType: 'card', id: '550e8400-e29b-41d4-a716-446655440000' }],
    });

    expect(parsed.limit).toBe(12);
    expect(parsed.entities).toHaveLength(1);
  });
});
