import { AUTH_SESSION_CHANGED, isAuthenticated } from '@cardwise/auth';
import { useSyncExternalStore } from 'react';

function subscribe(onStoreChange: () => void) {
  window.addEventListener(AUTH_SESSION_CHANGED, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(AUTH_SESSION_CHANGED, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

function getSnapshot() {
  return isAuthenticated();
}

function getServerSnapshot() {
  return false;
}

/** Reactive auth flag — re-renders when tokens are set or cleared. */
export function useAuthSession(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
