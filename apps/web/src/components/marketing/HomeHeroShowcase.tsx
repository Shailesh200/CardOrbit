import { AnimatedCardStack } from '@brand/AnimatedCardStack';
import { RecommendationPreview } from '@marketing/RecommendationPreview';

type Props = {
  /** Heavy card-stack visual — shown on large screens. */
  showCardStack?: boolean;
};

export function HomeHeroShowcase({ showCardStack = true }: Props) {
  return (
    <div className="home-hero-showcase relative flex w-full flex-col items-stretch justify-center gap-2 lg:pl-2">
      <div className="home-visual-glow pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_60%_40%,rgb(79_140_255/0.35),transparent_65%)] blur-2xl" />
      {showCardStack ? (
        <AnimatedCardStack
          variant="showcase"
          className="home-visual relative z-[1] w-full self-end"
        />
      ) : (
        <div className="home-visual relative z-[1] min-h-[10rem] w-full" aria-hidden />
      )}
      <div className="relative z-[2] w-full max-w-md self-end">
        <RecommendationPreview compact />
      </div>
    </div>
  );
}
