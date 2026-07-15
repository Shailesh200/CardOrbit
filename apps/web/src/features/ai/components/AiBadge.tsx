import { cn } from '@cardwise/ui';
import { AiSparkleMark } from '@brand/ai/AiSparkleMark';

export type AiBadgeVariant =
  | 'search'
  | 'search-keyword'
  | 'explained'
  | 'insight'
  | 'assistant'
  | 'native'
  | 'read-only'
  | 'computed';

const LABELS: Record<AiBadgeVariant, string> = {
  search: 'AI search',
  'search-keyword': 'Keyword search',
  explained: 'AI explained',
  insight: 'AI insight',
  assistant: 'AI assistant',
  native: 'AI-native',
  'read-only': 'Read-only',
  computed: 'Computed · AI explained',
};

type Props = {
  variant: AiBadgeVariant;
  className?: string;
  showIcon?: boolean;
};

export function AiBadge({ variant, className, showIcon = variant !== 'search-keyword' }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary',
        className,
      )}
    >
      {showIcon ? <AiSparkleMark className="size-2.5" /> : null}
      {LABELS[variant]}
    </span>
  );
}
