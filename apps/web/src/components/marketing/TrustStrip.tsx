import { Badge, cn } from '@cardwise/ui';
import { IndianRupee, Shield } from 'lucide-react';

import { AiSparkleMark } from '@brand/ai/AiSparkleMark';

type TrustStripProps = {
  variant?: 'light' | 'dark';
};

export function TrustStrip({ variant = 'light' }: TrustStripProps) {
  const dark = variant === 'dark';
  const items = [
    { icon: Shield, label: 'Privacy-first', kind: 'icon' as const },
    { icon: IndianRupee, label: 'INR-native', kind: 'icon' as const },
    { label: 'AI-grounded', kind: 'ai' as const },
  ];

  return (
    <div className="home-trust-strip flex flex-wrap items-center gap-2">
      {items.map(({ icon: Icon, label, kind }, index) => (
        <Badge
          key={label}
          variant="secondary"
          className={cn(
            'home-trust-badge gap-1.5 rounded-full px-3.5 py-1.5',
            dark &&
              'border border-white/12 bg-white/[0.07] text-white/85 backdrop-blur-md hover:bg-white/10',
          )}
          style={{ animationDelay: `${120 + index * 80}ms` }}
        >
          {kind === 'ai' ? (
            <AiSparkleMark className={cn('size-3.5', dark ? 'text-sky-300' : 'text-primary')} />
          ) : Icon ? (
            <Icon className={cn('size-3.5', dark ? 'text-sky-300' : 'text-primary')} />
          ) : null}
          {label}
        </Badge>
      ))}
    </div>
  );
}
