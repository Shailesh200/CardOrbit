import Lottie from 'lottie-react';

import successAnimation from '../../assets/lottie/success-complete.json';

type Props = {
  className?: string;
};

export function SuccessLottieInner({ className }: Props) {
  return <Lottie animationData={successAnimation} loop={false} aria-hidden className={className} />;
}
