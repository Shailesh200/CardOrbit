import { lazy, Suspense } from 'react';

const SuccessLottieInner = lazy(() =>
  import('./SuccessLottieInner').then((m) => ({ default: m.SuccessLottieInner })),
);

type Props = {
  className?: string;
};

export function SuccessLottie({ className }: Props) {
  return (
    <Suspense fallback={<div aria-hidden className={className} />}>
      <SuccessLottieInner className={className} />
    </Suspense>
  );
}
