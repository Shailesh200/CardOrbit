import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';

import { consumerLink } from '@lib/consumer-link';

type PageBackLinkProps = {
  to: string;
  label: string;
};

/** Inline back navigation — icon and label on one row. */
export function PageBackLink({ to, label }: PageBackLinkProps) {
  return (
    <Link className={`${consumerLink} page-back-link inline-flex items-center gap-1.5`} to={to}>
      <ArrowLeft className="size-4 shrink-0" aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
