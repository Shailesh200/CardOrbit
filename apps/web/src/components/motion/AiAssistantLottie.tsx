import { lazy, Suspense } from 'react';

const AiAssistantLottieInner = lazy(() =>
  import('./AiAssistantLottieInner').then((m) => ({ default: m.AiAssistantLottieInner })),
);

type Props = {
  className?: string;
};

export function AiAssistantLottie({ className }: Props) {
  return (
    <Suspense fallback={<span className={className} aria-hidden />}>
      <AiAssistantLottieInner className={className} />
    </Suspense>
  );
}
