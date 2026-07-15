import { Check } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';

type CheckboxProps = Omit<React.ComponentProps<'button'>, 'onChange'> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

function Checkbox({ className, checked, onCheckedChange, disabled, id, ...props }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      id={id}
      aria-checked={checked}
      data-slot="checkbox"
      disabled={disabled}
      className={cn(
        'peer inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input bg-background shadow-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        checked && 'border-primary bg-primary text-primary-foreground',
        className,
      )}
      onClick={() => onCheckedChange(!checked)}
      {...props}
    >
      {checked ? <Check className="size-3" strokeWidth={3} /> : null}
    </button>
  );
}

export { Checkbox };
