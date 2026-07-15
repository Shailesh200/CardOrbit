import { useEffect, useId, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button, cn } from '@cardwise/ui';
import { Bot, Minus, Sparkles, X } from 'lucide-react';

import type { AiAssistantTransport, AssistantAction } from '../types';
import { AiAssistantChat } from './AiAssistantChat';

type ActionLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
};

export type AiAssistantWidgetProps = {
  transport: AiAssistantTransport;
  /** When false, widget is hidden entirely. When undefined, fetches status. */
  enabled?: boolean;
  starters?: string[];
  title?: string;
  subtitle?: string;
  resolveActionHref?: (action: AssistantAction) => string | null;
  resolveResultHref?: (result: import('../types').AssistantResultItem) => string | null;
  LinkComponent?: ComponentType<ActionLinkProps>;
  onNavigate?: (href: string) => void;
  onError?: (message: string) => void;
  /** Adds bottom offset for mobile tab bars (uses CSS var when true). */
  mobileNavOffset?: boolean;
  className?: string;
  fabLabel?: string;
};

export function AiAssistantWidget({
  transport,
  enabled: enabledProp,
  starters,
  title = 'AI Assistant',
  subtitle = 'Ask about cards, merchants, and rewards — read-only with sources cited.',
  resolveActionHref,
  resolveResultHref,
  LinkComponent,
  onNavigate,
  onError,
  mobileNavOffset = true,
  className,
  fabLabel = 'Open AI assistant',
}: AiAssistantWidgetProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [enabled, setEnabled] = useState(enabledProp ?? false);
  const panelId = useId();
  const fabRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (enabledProp !== undefined) {
      setEnabled(enabledProp);
      return;
    }

    transport
      .getStatus()
      .then((status) => setEnabled(status.enabled))
      .catch(() => setEnabled(false));
  }, [enabledProp, transport]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        fabRef.current?.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const { overflow, overscrollBehavior } = document.body.style;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = overflow;
      document.body.style.overscrollBehavior = overscrollBehavior;
    };
  }, [open]);

  useEffect(() => {
    if (open) setSessionActive(true);
  }, [open]);

  if (!mounted || !enabled) {
    return null;
  }

  const widget = (
    <>
      {open ? (
        <button
          type="button"
          className="ai-assistant-widget__backdrop fixed inset-0 z-[69] cursor-default border-0 bg-black/10 dark:bg-black/25"
          aria-label="Close assistant"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div
        className={cn(
          'ai-assistant-widget pointer-events-none fixed right-4 z-[70] flex flex-col items-end',
          mobileNavOffset && 'ai-assistant-widget--mobile-nav-offset',
          className,
        )}
        aria-live="polite"
      >
        {sessionActive ? (
          <div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            aria-hidden={!open}
            className={cn(
              'ai-assistant-widget__panel pointer-events-auto mb-3 flex h-[min(42rem,calc(100dvh-5rem))] w-[min(100vw-1rem,42rem)] min-h-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl shadow-primary/10 sm:w-[42rem]',
              !open && 'hidden',
            )}
          >
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 bg-gradient-to-r from-primary/[0.06] to-transparent px-4 py-3">
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Bot className="size-4" aria-hidden />
                </span>
                <div>
                  <p className="font-display text-sm font-semibold tracking-tight">{title}</p>
                  <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    <Sparkles className="size-2.5" aria-hidden />
                    Read-only
                  </p>
                </div>
              </div>
              <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8"
                aria-label="Minimize assistant"
                onClick={() => setOpen(false)}
              >
                <Minus className="size-4" aria-hidden />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8"
                aria-label="Close assistant"
                onClick={() => setOpen(false)}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </div>
          </header>

          <AiAssistantChat
            transport={transport}
            enabled
            starters={starters}
            resolveActionHref={resolveActionHref}
            resolveResultHref={resolveResultHref}
            LinkComponent={LinkComponent}
            onNavigate={(href) => {
              onNavigate?.(href);
              setOpen(false);
            }}
            onError={onError}
            compactHeader
            className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
            panelClassName="h-full min-h-0 flex-1 rounded-none border-0 bg-transparent shadow-none"
          />
        </div>
      ) : null}

      <button
        ref={fabRef}
        type="button"
        className={cn(
          'ai-assistant-widget__fab pointer-events-auto inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-[1.03] hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          open && 'scale-95',
        )}
        aria-label={open ? 'Close AI assistant' : fabLabel}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="size-6" aria-hidden /> : <Bot className="size-6" aria-hidden />}
      </button>
    </div>
    </>
  );

  return createPortal(widget, document.body);
}
