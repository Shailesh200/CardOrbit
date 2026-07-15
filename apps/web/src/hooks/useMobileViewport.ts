import { useSyncExternalStore } from 'react';

const MOBILE_NAV_QUERY = '(max-width: 1023px)';

function subscribe(onStoreChange: () => void) {
  const media = window.matchMedia(MOBILE_NAV_QUERY);
  media.addEventListener('change', onStoreChange);
  return () => media.removeEventListener('change', onStoreChange);
}

function getSnapshot() {
  return window.matchMedia(MOBILE_NAV_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

/** True below lg — matches bottom tab bar breakpoint. */
export function useMobileViewport(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
