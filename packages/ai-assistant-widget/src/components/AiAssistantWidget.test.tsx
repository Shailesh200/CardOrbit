import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AiAssistantWidget } from './AiAssistantWidget';

describe('AiAssistantWidget', () => {
  it('renders FAB when enabled and opens panel on click', async () => {
    const user = userEvent.setup();
    const sendMessage = vi.fn().mockResolvedValue({
      conversationId: '019f52a4-c692-727d-b386-e925a3c8ae01',
      message: 'IDFC FIRST Private offers 0% forex markup.',
      readOnly: true as const,
      confidence: 'high' as const,
      toolsUsed: ['rag'] as const,
      citations: [],
      actions: [],
      results: [
        {
          kind: 'card' as const,
          id: '019f52a4-c692-727d-b386-e925a3c8aecc',
          slug: 'idfc-first-private',
          title: 'IDFC FIRST Private',
        },
      ],
    });

    render(
      <AiAssistantWidget
        enabled
        transport={{
          getStatus: vi.fn().mockResolvedValue({ enabled: true, configured: true }),
          sendMessage,
        }}
      />,
    );

    const fab = await screen.findByRole('button', { name: 'Open Nova' });
    await user.click(fab);

    expect(await screen.findByRole('dialog', { name: 'Nova' })).toBeInTheDocument();
    expect(screen.getByText(/read-only with sources cited/i)).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/ask nova about cards/i), '0% forex{enter}');

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalled();
    });
  });

  it('does not render when disabled via status fetch', async () => {
    render(
      <AiAssistantWidget
        transport={{
          getStatus: vi.fn().mockResolvedValue({ enabled: false, configured: true }),
          sendMessage: vi.fn(),
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Open Nova' })).not.toBeInTheDocument();
    });
  });
});
