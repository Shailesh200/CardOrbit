import { authFetch } from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type UserProfile = {
  id: string;
  email: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  country: string;
  currency: string;
  locale: string;
  timezone: string;
  avatarUrl: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
  onboardingStatus?: string;
  onboardingStep?: string;
  onboardingCompletedAt?: string | null;
};

export type NotificationPreferences = {
  emailMarketing: boolean;
  emailProduct: boolean;
  emailSecurity: boolean;
  inAppContextual: boolean;
};

export type PrivacyPreferences = {
  shareAnonymousAnalytics: boolean;
  personalizedOffers: boolean;
};

export type RewardPersonalizationProfile = {
  version: 2;
  preferredRewardType: 'cashback' | 'airline_miles' | 'hotel_points' | 'reward_points' | 'any';
  preferredBankSlugs: string[];
  preferredCategorySlugs: string[];
  boostFavoriteCards: boolean;
  preferredCurrency: string;
  spendBand?: 'UNDER_10K' | '10K_50K' | '50K_PLUS';
  categories?: string[];
  updatedAt?: string;
};

export function getProfile() {
  return authFetch<UserProfile>('/api/v1/users/me', {}, API_BASE);
}

export function updateProfile(
  body: Partial<UserProfile> & { firstName?: string; lastName?: string },
) {
  return authFetch<UserProfile>(
    '/api/v1/users/me',
    { method: 'PATCH', body: JSON.stringify(body) },
    API_BASE,
  );
}

export function getNotificationPreferences() {
  return authFetch<NotificationPreferences>('/api/v1/users/me/notifications', {}, API_BASE);
}

export function putNotificationPreferences(body: NotificationPreferences) {
  return authFetch<NotificationPreferences>(
    '/api/v1/users/me/notifications',
    { method: 'PUT', body: JSON.stringify(body) },
    API_BASE,
  );
}

export function getPrivacyPreferences() {
  return authFetch<PrivacyPreferences>('/api/v1/users/me/privacy', {}, API_BASE);
}

export function putPrivacyPreferences(body: PrivacyPreferences) {
  return authFetch<PrivacyPreferences>(
    '/api/v1/users/me/privacy',
    { method: 'PUT', body: JSON.stringify(body) },
    API_BASE,
  );
}

export function getRewardPersonalization() {
  return authFetch<RewardPersonalizationProfile>('/api/v1/users/me/personalization', {}, API_BASE);
}

export function putRewardPersonalization(body: Partial<RewardPersonalizationProfile>) {
  return authFetch<RewardPersonalizationProfile>(
    '/api/v1/users/me/personalization',
    { method: 'PUT', body: JSON.stringify(body) },
    API_BASE,
  );
}

export function changePassword(currentPassword: string, newPassword: string) {
  return authFetch<{ ok: true }>(
    '/api/v1/auth/change-password',
    { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) },
    API_BASE,
  );
}

export function requestDataExport() {
  return authFetch<{ exportId: string; status: string }>(
    '/api/v1/users/me/export',
    { method: 'POST', body: '{}' },
    API_BASE,
  );
}

export function requestAccountDeletion() {
  return authFetch<{ status: string }>('/api/v1/users/me', { method: 'DELETE' }, API_BASE);
}
