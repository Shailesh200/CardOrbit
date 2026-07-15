import { useEffect } from 'react';
import { Link } from 'react-router';
import { AiAssistantChat } from '@cardwise/ai-assistant-widget';

import { toast } from '@lib/app-toast';
import { AiVisual } from '../ai/components/AiVisual';
import { useAiFeatures } from '../ai/use-ai-features';
import { assistantActionPath, getAssistantStatus, sendAssistantMessage } from './assistant-api';

const transport = {
  getStatus: getAssistantStatus,
  sendMessage: sendAssistantMessage,
};

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

export function AssistantPage() {
  const { assistant } = useAiFeatures();

  useEffect(() => {
    document.title = 'CardOrbit · AI Assistant';
  }, []);

  if (!assistant) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-8 text-center">
        <AiVisual
          variant="assistant"
          motion="lottie"
          className="mx-auto"
          illustrationClassName="mx-auto h-32 w-40"
        />
        <h1 className="font-display text-2xl font-semibold tracking-tight">AI Assistant</h1>
        <p className="text-sm text-muted-foreground">
          The read-only AI assistant is rolling out gradually. When enabled for your account, you
          can ask about cards, merchants, and portfolio picks with sources cited.
        </p>
        <p className="text-xs text-muted-foreground">
          Use the floating assistant button when enabled, or try AI search on Merchants and Cards.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-wrap items-start gap-4">
      <AiVisual
        variant="assistant"
        motion="lottie"
        className="hidden shrink-0 sm:block"
        illustrationClassName="h-24 w-32"
      />
      <AiAssistantChat
        transport={transport}
        enabled={assistant}
        resolveActionHref={assistantActionPath}
        LinkComponent={RouterLink}
        onError={(message) => toast.error(message)}
        className="min-w-0 flex-1"
        panelClassName="min-h-[420px]"
      />
    </div>
  );
}
