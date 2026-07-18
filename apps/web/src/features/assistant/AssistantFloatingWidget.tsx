import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AiAssistantWidget, type AiAssistantTransport } from '@cardwise/ai-assistant-widget';

import { toast } from '@lib/app-toast';
import { useAiFeatures } from '../ai/use-ai-features';
import {
  assistantActionPath,
  assistantResultPath,
  getAssistantConversation,
  getAssistantStatus,
  sendAssistantMessage,
} from '../assistant/assistant-api';
import { subscribeNovaOpen } from '../nova/nova-events';

const transport: AiAssistantTransport = {
  getStatus: getAssistantStatus,
  loadConversation: getAssistantConversation,
  sendMessage: sendAssistantMessage,
};

const LazyWidget = lazy(async () => ({
  default: AiAssistantWidget,
}));

type LinkProps = {
  href: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
};

function RouterLink({ href, className, children, onClick }: LinkProps) {
  return (
    <Link to={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

const NOVA_STARTERS = [
  'Plan an itinerary for Delhi — best cards for flights and hotels',
  'Which card should I use for international travel?',
  'Best card for weekend dining under ₹3,000',
  'What lounge access do my cards include?',
];

export function AssistantFloatingWidget() {
  const { assistant } = useAiFeatures();
  const navigate = useNavigate();
  const [openSignal, setOpenSignal] = useState(0);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  useEffect(() => {
    return subscribeNovaOpen((detail) => {
      setPendingPrompt(detail.query ?? null);
      setOpenSignal((value) => value + 1);
    });
  }, []);

  const onPendingPromptConsumed = useCallback(() => {
    setPendingPrompt(null);
  }, []);

  if (!assistant) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <LazyWidget
        transport={transport}
        enabled={assistant}
        title="Nova"
        subtitle="Plan trips, pick the right card, and chart your rewards — sources cited, read-only."
        fabLabel="Open Nova"
        starters={NOVA_STARTERS}
        openSignal={openSignal}
        pendingPrompt={pendingPrompt}
        onPendingPromptConsumed={onPendingPromptConsumed}
        resolveActionHref={assistantActionPath}
        resolveResultHref={assistantResultPath}
        LinkComponent={RouterLink}
        onNavigate={(href) => navigate(href)}
        onError={(message) => toast.error(message)}
        mobileNavOffset
      />
    </Suspense>
  );
}
