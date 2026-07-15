import { Check } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';

type SelectableTileProps = React.ComponentProps<'button'> & {
  selected?: boolean;
  icon?: React.ReactNode;
  title: string;
  description?: string;
};

function SelectableTile({
  className,
  selected,
  icon,
  title,
  description,
  ...props
}: SelectableTileProps) {
  return (
    <button
      type="button"
      data-slot="selectable-tile"
      aria-pressed={selected}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border-2 bg-card p-4 text-left shadow-xs transition-all duration-200 outline-none',
        'hover:border-primary/40 hover:shadow-sm',
        'focus-visible:ring-[3px] focus-visible:ring-ring/50',
        selected ? 'scale-[1.01] border-primary bg-accent/60 shadow-md' : 'border-border',
        className,
      )}
      {...props}
    >
      {icon ? (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-medium text-foreground">{title}</span>
        {description ? <span className="text-sm text-muted-foreground">{description}</span> : null}
      </span>
      {selected ? (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      ) : null}
    </button>
  );
}

export { SelectableTile };
