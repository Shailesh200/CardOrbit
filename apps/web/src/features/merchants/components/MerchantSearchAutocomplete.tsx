import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Input } from '@cardwise/ui';
import { Loader2 } from 'lucide-react';

import { AiBadge } from '../../ai/components/AiBadge';
import { AiSparkleMark } from '@brand/ai/AiSparkleMark';
import { useAiFeatures } from '../../ai/use-ai-features';
import { aiSearch } from '../../search/search-api';
import type { MerchantListItem } from '../merchants-api';

const DEBOUNCE_MS = 300;
const MIN_QUERY = 2;
const SUGGESTION_LIMIT = 6;

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
};

export function MerchantSearchAutocomplete({ value, onChange, onSubmit, disabled }: Props) {
  const navigate = useNavigate();
  const { search: aiSearchEnabled } = useAiFeatures();
  const listboxId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<MerchantListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const q = value.trim();
    if (q.length < MIN_QUERY) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      aiSearch({ q, types: 'merchant', limit: SUGGESTION_LIMIT, offset: 0 })
        .then((page) => {
          if (cancelled) return;
          const items = (page.merchants ?? []) as MerchantListItem[];
          setSuggestions(items);
          setOpen(items.length > 0);
          setActiveIndex(-1);
        })
        .catch(() => {
          if (!cancelled) {
            setSuggestions([]);
            setOpen(false);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (event.key === 'Enter') onSubmit();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      const selected = suggestions[activeIndex];
      if (selected) {
        setOpen(false);
        navigate(`/account/merchants/${selected.slug}`);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative min-w-0 flex-1">
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        placeholder={
          aiSearchEnabled
            ? 'Search merchants — name, category, or keywords'
            : 'Search merchants or describe where you shop'
        }
        aria-label="Search merchants"
        aria-autocomplete="list"
        aria-controls={open ? listboxId : undefined}
        aria-expanded={open}
        disabled={disabled}
        role="combobox"
      />

      {loading ? (
        <Loader2
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
          aria-hidden
        />
      ) : null}

      {open && suggestions.length > 0 ? (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border/60 bg-background shadow-lg">
          {aiSearchEnabled ? (
            <div className="flex items-center justify-between border-b border-border/40 px-3 py-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                <AiSparkleMark className="size-3 text-primary" />
                Suggestions
              </span>
              <AiBadge variant="search" className="scale-90" />
            </div>
          ) : null}
          <ul id={listboxId} role="listbox" className="max-h-64 overflow-auto">
            {suggestions.map((merchant, index) => (
              <li key={merchant.id} role="option" aria-selected={index === activeIndex}>
                <Link
                  to={`/account/merchants/${merchant.slug}`}
                  className={`block px-3 py-2.5 text-sm transition hover:bg-muted/50 ${
                    index === activeIndex ? 'bg-muted/60' : ''
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => setOpen(false)}
                >
                  <span className="font-medium">{merchant.name}</span>
                  {merchant.category ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {merchant.category.name}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
