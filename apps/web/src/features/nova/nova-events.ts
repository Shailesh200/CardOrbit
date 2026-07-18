export const NOVA_OPEN_EVENT = 'cardorbit:nova-open';

export type NovaOpenDetail = {
  query?: string;
};

export function openNova(query?: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<NovaOpenDetail>(NOVA_OPEN_EVENT, {
      detail: { query: query?.trim() || undefined },
    }),
  );
}

export function subscribeNovaOpen(listener: (detail: NovaOpenDetail) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const handler = (event: Event) => {
    const custom = event as CustomEvent<NovaOpenDetail>;
    listener(custom.detail ?? {});
  };

  window.addEventListener(NOVA_OPEN_EVENT, handler);
  return () => window.removeEventListener(NOVA_OPEN_EVENT, handler);
}
