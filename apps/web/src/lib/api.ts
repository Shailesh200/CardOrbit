import { authFetch } from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function requestDataExport(): Promise<{ exportId: string; status: string }> {
  return authFetch<{ exportId: string; status: string }>(
    '/api/v1/users/me/export',
    { method: 'POST', body: '{}' },
    API_BASE,
  );
}

export async function requestAccountDeletion(): Promise<{ status: string }> {
  return authFetch<{ status: string }>('/api/v1/users/me', { method: 'DELETE' }, API_BASE);
}
