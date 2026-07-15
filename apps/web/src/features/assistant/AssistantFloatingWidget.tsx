import { lazy, Suspense } from 'react';
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

export function AssistantFloatingWidget() {
  const { assistant } = useAiFeatures();
  const navigate = useNavigate();

  if (!assistant) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <LazyWidget
        transport={transport}
        enabled={assistant}
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
