import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthHttpError } from '@cardwise/auth';

vi.mock('@cardwise/ui', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

import { toast } from '@cardwise/ui';
import { notify } from './app-toast';

describe('notify.fromError', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('suppresses silent session unauthorized errors', () => {
    notify.fromError(
      new AuthHttpError('Your session has expired. Please sign in again.', {
        status: 401,
        code: 'UNAUTHORIZED',
        silentToast: true,
      }),
    );
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('blocks leaky Unauthorized copy', () => {
    notify.fromError(new Error('Unauthorized'), 'Could not load');
    expect(toast.error).toHaveBeenCalledWith('Could not load');
  });

  it('shows human Error messages', () => {
    notify.fromError(new Error('Card not found'), 'Fallback');
    expect(toast.error).toHaveBeenCalledWith('Card not found');
  });
});
