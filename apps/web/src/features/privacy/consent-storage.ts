export type ConsentPreferences = {
  necessary: true;
  analytics: boolean;
  decidedAt: string;
};

const STORAGE_KEY = 'cardwise.consent';

export function getConsentPreferences(): ConsentPreferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentPreferences;
  } catch {
    return null;
  }
}

export function saveConsentPreferences(analytics: boolean): ConsentPreferences {
  const prefs: ConsentPreferences = {
    necessary: true,
    analytics,
    decidedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  return prefs;
}
