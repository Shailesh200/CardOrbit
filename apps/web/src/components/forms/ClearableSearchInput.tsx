import { type ComponentProps } from 'react';
import { Input, cn } from '@cardwise/ui';
import { Search, X } from 'lucide-react';

type Props = Omit<ComponentProps<typeof Input>, 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
  /** Show leading search icon (default true). */
  withSearchIcon?: boolean;
};

/** Text input with an in-field clear control when non-empty. */
export function ClearableSearchInput({
  value,
  onChange,
  withSearchIcon = true,
  className,
  ...rest
}: Props) {
  const showClear = value.length > 0;

  return (
    <div className="relative min-w-0">
      {withSearchIcon ? (
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
      ) : null}
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          withSearchIcon && 'consumer-input-with-icon',
          showClear && 'consumer-input-with-clear',
          className,
        )}
        {...rest}
      />
      {showClear ? (
        <button
          type="button"
          className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Clear search"
          onClick={() => onChange('')}
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
