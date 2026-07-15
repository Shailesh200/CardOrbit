import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AiAssistantResultCards } from './AiAssistantResultCards';

describe('AiAssistantResultCards', () => {
  it('renders card and merchant result tiles with highlights', () => {
    render(
      <AiAssistantResultCards
        results={[
          {
            kind: 'card',
            id: '019f52a4-c692-727d-b386-e925a3c8aecc',
            slug: 'idfc-first-private',
            title: 'IDFC FIRST Private',
            subtitle: 'IDFC FIRST Bank · Visa',
            highlights: ['0% forex markup', 'Unlimited lounge access'],
            badge: 'Best match',
          },
          {
            kind: 'merchant',
            id: '019f52a4-c692-727d-b386-e925a3c8ae01',
            slug: 'amazon',
            title: 'Amazon',
            subtitle: 'Shopping',
          },
        ]}
        resolveResultHref={(result) =>
          result.kind === 'merchant' ? `/merchants/${result.slug}` : `/cards/${result.slug}`
        }
      />,
    );

    expect(screen.getByText('IDFC FIRST Private')).toBeInTheDocument();
    expect(screen.getByText('Best match')).toBeInTheDocument();
    expect(screen.getByText('0% forex markup')).toBeInTheDocument();
    expect(screen.getByText('Amazon')).toBeInTheDocument();
    expect(screen.getByText('View merchant')).toBeInTheDocument();
  });

  it('calls onNavigate when a linked result is clicked', () => {
    const onNavigate = vi.fn();

    render(
      <AiAssistantResultCards
        results={[
          {
            kind: 'portfolio_card',
            id: '019f52a4-c692-727d-b386-e925a3c8aecc',
            slug: 'hdfc-millennia',
            title: 'HDFC Millennia',
            inPortfolio: true,
            userCardId: '019f52a4-c692-727d-b386-e925a3c8ae02',
          },
        ]}
        resolveResultHref={() => '/account/cards/portfolio-id'}
        onNavigate={onNavigate}
      />,
    );

    const link = screen.getByRole('link', { name: /hdfc millennia/i });
    link.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onNavigate).toHaveBeenCalledWith('/account/cards/portfolio-id');
  });

  it('returns null when there are no results', () => {
    const { container } = render(<AiAssistantResultCards results={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
