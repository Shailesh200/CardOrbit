import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SearchX } from 'lucide-react';

import { EmptyState } from './EmptyState';

describe('EmptyState (M-024)', () => {
  it('renders title, description, and action', () => {
    render(
      <EmptyState
        icon={SearchX}
        title="No merchants found"
        description="Try another search."
        action={<button type="button">Clear search</button>}
      />,
    );
    expect(screen.getByText('No merchants found')).toBeInTheDocument();
    expect(screen.getByText('Try another search.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear search' })).toBeInTheDocument();
  });
});
