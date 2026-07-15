import { lazy, Suspense } from 'react';
import { cn } from '@cardwise/ui';

import {
  AiAssistantIllustration,
  AiExplainedIllustration,
  AiSearchIllustration,
  AiSparkleMark,
  AiSparkleOrbIllustration,
} from '@brand/ai';

const AiAssistantLottie = lazy(() =>
  import('@motion/AiAssistantLottie').then((m) => ({ default: m.AiAssistantLottie })),
);
const AiSparkleLottie = lazy(() =>
  import('@motion/AiSparkleLottie').then((m) => ({ default: m.AiSparkleLottie })),
);

export type AiVisualVariant = 'mark' | 'orb' | 'search' | 'assistant' | 'explained';

type Props = {
  variant: AiVisualVariant;
  /** Optional looping Lottie overlay (sparkle orb + assistant only). */
  motion?: 'static' | 'lottie';
  className?: string;
  illustrationClassName?: string;
  lottieClassName?: string;
};

const ILLUSTRATIONS = {
  orb: AiSparkleOrbIllustration,
  search: AiSearchIllustration,
  assistant: AiAssistantIllustration,
  explained: AiExplainedIllustration,
} as const;

export function AiVisual({
  variant,
  motion = 'static',
  className,
  illustrationClassName,
  lottieClassName,
}: Props) {
  if (variant === 'mark') {
    return <AiSparkleMark className={cn('text-primary', className, illustrationClassName)} />;
  }

  const Illustration = ILLUSTRATIONS[variant];
  const showLottie = motion === 'lottie' && (variant === 'orb' || variant === 'assistant');

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <Illustration className={cn('ai-visual__illus', illustrationClassName)} />
      {showLottie ? (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 flex items-center justify-center',
            lottieClassName,
          )}
        >
          <Suspense fallback={null}>
            {variant === 'orb' ? (
              <AiSparkleLottie className="size-[38%] opacity-90" />
            ) : (
              <AiAssistantLottie className="size-[34%] -translate-y-2 opacity-95" />
            )}
          </Suspense>
        </div>
      ) : null}
    </div>
  );
}
