import {
  FormEvent,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { Button, Input, cn } from '@cardwise/ui';
import { Bot, Loader2, Send, Sparkles } from 'lucide-react';

import type {
  AiAssistantTransport,
  AssistantAction,
  AssistantMessage,
  AssistantResultItem,
} from '../types';
import { normalizeConversationMessages } from '../normalize-conversation';
import { AiAssistantResultCards } from './AiAssistantResultCards';

const DEFAULT_STARTERS = [
  'Which card should I use at Swiggy for ₹800?',
  'What cards do I have in my portfolio?',
  'Find a card with 0% forex markup',
];

type ActionLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
};

export type AiAssistantChatProps = {
  transport: AiAssistantTransport;
  enabled?: boolean;
  starters?: string[];
  title?: string;
  subtitle?: string;
  readOnlyLabel?: string;
  resolveActionHref?: (action: AssistantAction) => string | null;
  resolveResultHref?: (result: AssistantResultItem) => string | null;
  LinkComponent?: ComponentType<ActionLinkProps>;
  onNavigate?: (href: string) => void;
  onError?: (message: string) => void;
  className?: string;
  panelClassName?: string;
  compactHeader?: boolean;
};

function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  const label =
    confidence === 'high'
      ? 'High confidence'
      : confidence === 'medium'
        ? 'Medium confidence'
        : 'Low confidence';
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
  );
}

export function AiAssistantChat({
  transport,
  enabled: enabledProp,
  starters = DEFAULT_STARTERS,
  title = 'Ask CardWise',
  subtitle = 'Grounded answers from your portfolio and catalog · sources cited · read-only',
  readOnlyLabel = 'Read-only',
  resolveActionHref: _resolveActionHref,
  resolveResultHref,
  LinkComponent,
  onNavigate,
  onError,
  className,
  panelClassName,
  compactHeader = false,
}: AiAssistantChatProps) {
  const [statusLoading, setStatusLoading] = useState(enabledProp === undefined);
  const [enabled, setEnabled] = useState(enabledProp ?? false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (enabledProp !== undefined) {
      setEnabled(enabledProp);
      setStatusLoading(false);
      return;
    }

    setStatusLoading(true);
    transport
      .getStatus()
      .then((status) => setEnabled(status.enabled))
      .catch(() => setEnabled(false))
      .finally(() => setStatusLoading(false));
  }, [enabledProp, transport]);

  useEffect(() => {
    if (!enabled || !transport.loadConversation) return;

    setHistoryLoading(true);
    transport
      .loadConversation()
      .then((conversation) => {
        if (!conversation) return;
        setConversationId(conversation.conversationId);
        setMessages(normalizeConversationMessages(conversation.messages));
      })
      .catch(() => {
        /* ignore — start fresh */
      })
      .finally(() => setHistoryLoading(false));
  }, [enabled, transport]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  async function submitMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending || !enabled) return;

    const priorMessages = messages;
    const nextHistory: AssistantMessage[] = [...priorMessages, { role: 'user', content: trimmed }];
    setMessages(nextHistory);
    setInput('');
    setSending(true);

    try {
      const response = await transport.sendMessage({
        message: trimmed,
        conversationId,
        history: priorMessages,
      });
      setConversationId(response.conversationId);
      setMessages([
        ...nextHistory,
        {
          role: 'assistant',
          content: response.message,
          confidence: response.confidence,
          toolsUsed: response.toolsUsed,
          citations: response.citations,
          actions: response.actions,
          results: response.results,
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Assistant unavailable';
      onError?.(message);
      setMessages(priorMessages);
    } finally {
      setSending(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submitMessage(input);
  }

  if (statusLoading || historyLoading) {
    return (
      <div
        className={cn(
          'flex min-h-[12rem] items-center justify-center text-xs text-muted-foreground',
          className,
        )}
      >
        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
        Loading assistant…
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className={cn('space-y-3 py-6 text-center', className)}>
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Bot className="size-6" aria-hidden />
        </div>
        <h2 className="font-display text-lg font-semibold tracking-tight">AI Assistant</h2>
        <p className="text-xs text-muted-foreground">
          The read-only AI assistant is rolling out gradually. When enabled for your account, use
          the floating button to ask about cards, merchants, and portfolio picks.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      {!compactHeader ? (
        <div className="mb-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Assistant</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-2.5" aria-hidden />
              {readOnlyLabel}
            </span>
          </div>
          <h2 className="font-display text-[1.75rem] font-semibold tracking-tight">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      ) : null}

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-background/95 shadow-sm',
          panelClassName,
        )}
      >
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain p-3 sm:p-4"
        >
          {messages.length === 0 ? (
            <div className="space-y-3 py-2">
              <p className="text-center text-xs text-muted-foreground">Try one of these questions:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {starters.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    className="rounded-full border border-border/70 px-3 py-1.5 text-left text-[11px] text-muted-foreground transition hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                    onClick={() => void submitMessage(starter)}
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={cn(
                  'max-w-[96%]',
                  message.role === 'user' ? 'ml-auto' : 'mr-auto',
                )}
              >
                <div
                  className={cn(
                    'rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border/60 bg-muted/40 text-foreground',
                  )}
                >
                  {message.content}
                </div>
                {message.role === 'assistant' ? (
                  <div className="mt-1.5 space-y-1.5">
                    {message.results && message.results.length > 0 ? (
                      <AiAssistantResultCards
                        results={message.results}
                        resolveResultHref={resolveResultHref}
                        LinkComponent={LinkComponent}
                        onNavigate={onNavigate}
                      />
                    ) : null}
                    {message.confidence ? (
                      <ConfidenceBadge confidence={message.confidence} />
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))
          )}
          {sending ? (
            <div className="mr-auto inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/40 px-3.5 py-2.5 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Thinking…
            </div>
          ) : null}
        </div>

        <form
          onSubmit={onSubmit}
          className="flex items-center gap-2 border-t border-border/60 bg-background/80 p-3"
        >
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about cards, rewards, or merchants…"
            disabled={sending}
            aria-label="Message to assistant"
            className="h-9 flex-1 text-xs"
          />
          <Button type="submit" size="sm" disabled={sending || !input.trim()} className="shrink-0">
            <Send className="size-3.5" aria-hidden />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
