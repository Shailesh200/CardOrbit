import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Toaster } from './components/ui/sonner';
import { toast } from './index';

describe('@cardwise/ui core components', () => {
  it('renders Button in isolation', () => {
    render(<Button>Save card</Button>);
    expect(screen.getByRole('button', { name: 'Save card' })).toBeInTheDocument();
  });

  it('renders Input in isolation', () => {
    render(<Input aria-label="Card nickname" placeholder="Premium card" />);
    expect(screen.getByLabelText('Card nickname')).toBeInTheDocument();
  });

  it('renders Card in isolation', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Portfolio</CardTitle>
        </CardHeader>
        <CardContent>3 active cards</CardContent>
      </Card>,
    );
    expect(screen.getByText('Portfolio')).toBeInTheDocument();
    expect(screen.getByText('3 active cards')).toBeInTheDocument();
  });

  it('renders Toaster in isolation', () => {
    expect(() => render(<Toaster />)).not.toThrow();
  });

  it('exports toast helper for notifications', () => {
    expect(typeof toast).toBe('function');
  });
});
