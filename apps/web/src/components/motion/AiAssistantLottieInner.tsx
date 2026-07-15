import Lottie from 'lottie-react';

import aiAssistantIdle from '../../assets/lottie/ai-assistant-idle.json';

type Props = {
  className?: string;
};

export function AiAssistantLottieInner({ className }: Props) {
  return <Lottie animationData={aiAssistantIdle} loop aria-hidden className={className} />;
}
