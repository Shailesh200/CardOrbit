import { AccountRouteSkeleton } from '../components/feedback/PageSkeletons';

/** Route suspense fallback — skeleton shell to reduce layout shift (M-024). */
export function RouteFallback() {
  return <AccountRouteSkeleton />;
}
