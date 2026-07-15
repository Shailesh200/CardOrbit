import { lazy, Suspense } from 'react';

const AiSparkleLottieInner = lazy(() =>
  import('./AiSparkleLottieInner').then((m) => ({ default: m.AiSparkleLottieInner })),
);

type Props = {
  className?: string;
};

export function AiSparkleLottie({ className }: Props) {
  return (
    <Suspense fallback={<span className={className} aria-hidden />}>
      <AiSparkleLottieInner className={className} />
    </Suspense>
  );
}
