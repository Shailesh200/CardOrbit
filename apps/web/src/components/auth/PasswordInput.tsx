import { useState, type ComponentProps } from 'react';
import { Input } from '@cardwise/ui';
import { Eye, EyeOff } from 'lucide-react';

type PasswordInputProps = Omit<ComponentProps<typeof Input>, 'type'>;

export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="consumer-password-field relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`pr-10 ${props.className ?? ''}`}
      />
      <button
        type="button"
        tabIndex={-1}
        className="consumer-password-toggle absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
      >
        {visible ? (
          <EyeOff className="size-4" aria-hidden />
        ) : (
          <Eye className="size-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
