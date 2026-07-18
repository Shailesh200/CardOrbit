import { WifiOff } from 'lucide-react';

import { useOnlineStatus } from '../../hooks/useOnlineStatus';

/** Slim connectivity banner — shown while the browser reports offline (M-PWA). */
export function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 border-b border-white/10 bg-[oklch(0.16_0.03_258)] px-4 py-2 text-center text-sm font-medium text-white/85"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      You&apos;re offline — some features may be unavailable until you reconnect.
    </div>
  );
}
