import type { User } from '@prisma/client';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_PRIVACY_PREFERENCES,
  parseNotificationPreferences,
  parsePrivacyPreferences,
  parseRewardPersonalizationProfile,
  type NotificationPreferences,
  type PrivacyPreferences,
} from '@cardwise/validation';

export type UserProfileDto = {
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
  onboardingStatus: string;
  onboardingStep: string;
  onboardingCompletedAt: string | null;
};

export function splitFullName(fullName: string | null | undefined): {
  firstName: string | null;
  lastName: string | null;
} {
  if (!fullName?.trim()) {
    return { firstName: null, lastName: null };
  }
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? null;
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : null;
  return { firstName, lastName };
}

export function joinFullName(firstName?: string | null, lastName?: string | null): string | null {
  const value = [firstName, lastName].filter(Boolean).join(' ').trim();
  return value || null;
}

export function toUserProfileDto(user: User): UserProfileDto {
  const { firstName, lastName } = splitFullName(user.fullName);
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    firstName,
    lastName,
    country: user.country || 'IN',
    currency: user.currency || 'INR',
    locale: user.locale || 'en-IN',
    timezone: user.timezone || 'Asia/Kolkata',
    avatarUrl: user.avatarUrl,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    onboardingStatus: user.onboardingStatus,
    onboardingStep: user.onboardingStep,
    onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
  };
}

export function notificationPrefsFromUser(user: User): NotificationPreferences {
  try {
    return parseNotificationPreferences(user.notificationPreferences);
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
}

export type AdminUserDetailDto = UserProfileDto & {
  accountStatus: string;
  role: string;
  portfolioCardCount: number;
  activeSessionCount: number;
  updatedAt: string;
};

export function toAdminUserDetailDto(
  user: User,
  extras: { portfolioCardCount: number; activeSessionCount: number },
): AdminUserDetailDto {
  return {
    ...toUserProfileDto(user),
    accountStatus: user.accountStatus,
    role: user.role,
    portfolioCardCount: extras.portfolioCardCount,
    activeSessionCount: extras.activeSessionCount,
    updatedAt: user.updatedAt.toISOString(),
  };
}
export function privacyPrefsFromUser(user: User): PrivacyPreferences {
  try {
    return parsePrivacyPreferences(user.privacyPreferences);
  } catch {
    return { ...DEFAULT_PRIVACY_PREFERENCES };
  }
}

export function rewardPersonalizationFromUser(user: User) {
  return parseRewardPersonalizationProfile(user.personalizationProfile);
}
