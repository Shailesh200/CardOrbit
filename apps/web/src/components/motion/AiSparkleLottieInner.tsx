import Lottie from 'lottie-react';

import aiSparkleLoop from '../../assets/lottie/ai-sparkle-loop.json';

type Props = {
  className?: string;
};

export function AiSparkleLottieInner({ className }: Props) {
  return <Lottie animationData={aiSparkleLoop} loop aria-hidden className={className} />;
}
