import { AiVisual } from './AiVisual';
import { useAiFeatures } from '../use-ai-features';

type Props = {
  context: 'merchant' | 'catalog';
};

export function AiSearchHint({ context }: Props) {
  const { search } = useAiFeatures();

  const examples =
    context === 'merchant'
      ? '"Swiggy", "food delivery", or "airport lounge"'
      : '"HDFC Millennia", "0% forex", or "dining cashback"';

  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary/10 bg-primary/[0.03] px-3 py-2.5">
      {search ? (
        <AiVisual
          variant="search"
          className="hidden shrink-0 sm:block"
          illustrationClassName="h-14 w-20"
        />
      ) : null}
      <p className="flex min-w-0 items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        {search ? <AiVisual variant="mark" className="mt-0.5 size-3.5 shrink-0 sm:hidden" /> : null}
        <span>
          {search ? (
            <>
              <strong className="font-medium text-foreground">AI-powered search</strong> — use
              merchant names, categories, or natural keywords. Try {examples}.
            </>
          ) : (
            <>Search by name or keywords. Try {examples}.</>
          )}
        </span>
      </p>
    </div>
  );
}
