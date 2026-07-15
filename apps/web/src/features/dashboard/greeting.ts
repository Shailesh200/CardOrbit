import type { UserProfile } from '../account/account-api';

export function greetingName(profile: Pick<UserProfile, 'firstName' | 'fullName'> | null): string {
  if (profile?.firstName?.trim()) return profile.firstName.trim();
  if (profile?.fullName?.trim()) {
    const first = profile.fullName.trim().split(/\s+/)[0];
    if (first) return first;
  }
  return 'there';
}
