import { z } from 'zod';

export const NotificationPreferencesSchema = z.object({
  emailMarketing: z.boolean().default(false),
  emailProduct: z.boolean().default(true),
  emailSecurity: z.boolean().default(true),
  /** In-app contextual alerts (milestones, bills, offers, travel). M-051. */
  inAppContextual: z.boolean().default(true),
});

export const PrivacyPreferencesSchema = z.object({
  shareAnonymousAnalytics: z.boolean().default(true),
  personalizedOffers: z.boolean().default(true),
});

export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;
export type PrivacyPreferences = z.infer<typeof PrivacyPreferencesSchema>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailMarketing: false,
  emailProduct: true,
  emailSecurity: true,
  inAppContextual: true,
};

export const DEFAULT_PRIVACY_PREFERENCES: PrivacyPreferences = {
  shareAnonymousAnalytics: true,
  personalizedOffers: true,
};

export function parseNotificationPreferences(input: unknown): NotificationPreferences {
  return NotificationPreferencesSchema.parse({
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(typeof input === 'object' && input !== null ? input : {}),
  });
}

export function parsePrivacyPreferences(input: unknown): PrivacyPreferences {
  return PrivacyPreferencesSchema.parse({
    ...DEFAULT_PRIVACY_PREFERENCES,
    ...(typeof input === 'object' && input !== null ? input : {}),
  });
}
