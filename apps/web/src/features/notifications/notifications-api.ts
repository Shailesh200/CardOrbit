import { authFetch } from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type InAppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationListResponse = {
  items: InAppNotification[];
  total: number;
  sync?: {
    delivered: number;
    candidates: number;
    skipped: number;
  };
};

export type ContextualSyncResult = {
  delivered: number;
  candidates: number;
  skipped: number;
};

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  WELCOME: 'Welcome',
  REWARD_EXPIRY: 'Rewards',
  MILESTONE_PROGRESS: 'Milestone',
  BILL_DUE: 'Bill due',
  OFFER_MATCH: 'Offer',
  TRAVEL_TIP: 'Travel',
  PURCHASE_TIMING: 'Timing',
};

export function listNotifications(limit = 20, offset = 0) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return authFetch<NotificationListResponse>(
    `/api/v1/notifications?${params.toString()}`,
    {},
    API_BASE,
  );
}

export function getUnreadNotificationCount() {
  return authFetch<{ count: number }>('/api/v1/notifications/unread-count', {}, API_BASE);
}

export function syncContextualNotifications() {
  return authFetch<ContextualSyncResult>(
    '/api/v1/notifications/sync',
    { method: 'POST', body: '{}' },
    API_BASE,
  );
}

export function markNotificationRead(id: string) {
  return authFetch<InAppNotification>(
    `/api/v1/notifications/${encodeURIComponent(id)}/read`,
    { method: 'PATCH' },
    API_BASE,
  );
}

export function markAllNotificationsRead() {
  return authFetch<{ updated: number }>(
    '/api/v1/notifications/read-all',
    { method: 'POST', body: '{}' },
    API_BASE,
  );
}
