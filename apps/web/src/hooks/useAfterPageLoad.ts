import { useEffect, useState } from 'react';

function scheduleIdle(callback: () => void, timeoutMs: number): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(callback, { timeout: timeoutMs });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(callback, timeoutMs);
  return () => clearTimeout(id);
}

/** True after the window `load` event (all subresources fetched). */
export function useAfterPageLoad(): boolean {
  const [loaded, setLoaded] = useState(() =>
    typeof document !== 'undefined' ? document.readyState === 'complete' : false,
  );

  useEffect(() => {
    if (loaded) return;
    const onLoad = () => setLoaded(true);
    window.addEventListener('load', onLoad, { once: true });
    return () => window.removeEventListener('load', onLoad);
  }, [loaded]);

  return loaded;
}

/** Defer non-critical UI until after load + idle (keeps LCP on hero text, not late images). */
export function useDeferredAfterLoad(timeoutMs = 1200): boolean {
  const pageLoaded = useAfterPageLoad();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!pageLoaded || ready) return;

    let cancelled = false;
    const markReady = () => {
      if (!cancelled) setReady(true);
    };

    const cancel = scheduleIdle(markReady, timeoutMs);
    return () => {
      cancelled = true;
      cancel();
    };
  }, [pageLoaded, ready, timeoutMs]);

  return ready;
}
