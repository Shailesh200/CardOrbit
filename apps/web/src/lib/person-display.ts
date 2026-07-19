/** Build a human-readable display name for PostHog Persons. */
export function resolvePersonDisplayName(profile: {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string | undefined {
  const full = profile.fullName?.trim();
  if (full) return full;

  const parts = [profile.firstName, profile.lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  if (parts.length > 0) return parts.join(' ');

  const email = profile.email?.trim();
  return email || undefined;
}

/** Person properties PostHog uses for the Persons display column. */
export function buildPostHogPersonProperties(profile: {
  email: string;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): Record<string, string> {
  const name = resolvePersonDisplayName(profile);
  const props: Record<string, string> = {
    email: profile.email.trim(),
  };
  if (name) {
    props.name = name;
    props.$name = name;
  }
  const firstName = profile.firstName?.trim();
  const lastName = profile.lastName?.trim();
  if (firstName) props.first_name = firstName;
  if (lastName) props.last_name = lastName;
  return props;
}
