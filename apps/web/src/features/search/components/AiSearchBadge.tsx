import { AiBadge } from '../../ai/components/AiBadge';
import { useAiFeatures } from '../../ai/use-ai-features';
import type { AiSearchSource } from '../search-api';

type Props = {
  source?: AiSearchSource;
  /** When false, hide badge (e.g. no active query). Default true. */
  visible?: boolean;
};

export function AiSearchBadge({ source, visible = true }: Props) {
  const { search } = useAiFeatures();

  if (!visible || !source) return null;

  if (source === 'semantic' && search) {
    return <AiBadge variant="search" />;
  }

  if (source === 'keyword') {
    return <AiBadge variant="search-keyword" showIcon={false} />;
  }

  return null;
}
