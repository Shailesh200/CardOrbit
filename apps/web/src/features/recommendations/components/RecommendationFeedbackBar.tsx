import { useState } from 'react';
import { Button } from '@cardwise/ui';
import { ThumbsDown, ThumbsUp } from 'lucide-react';

import { notify, toast } from '@lib/app-toast';

import {
  submitRecommendationFeedback,
  type RecommendationFeedbackType,
} from '../recommendation-history-api';
import { trackRecommendationFeedbackSubmittedClient } from '../recommendation-analytics';

type Props = {
  recommendationId: string;
  merchantName?: string;
  initialFeedback?: RecommendationFeedbackType | null;
};

export function RecommendationFeedbackBar({
  recommendationId,
  merchantName,
  initialFeedback = null,
}: Props) {
  const [feedback, setFeedback] = useState<RecommendationFeedbackType | null>(initialFeedback);
  const [pending, setPending] = useState(false);

  async function sendFeedback(type: RecommendationFeedbackType) {
    if (pending || feedback === type) return;
    setPending(true);
    try {
      await submitRecommendationFeedback(recommendationId, { type });
      setFeedback(type);
      trackRecommendationFeedbackSubmittedClient({
        recommendationId,
        feedbackType: type,
        merchantName,
      });
      toast.success('Thanks for the feedback');
    } catch (error) {
      notify.fromError(error, 'Could not save feedback');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-background/40 p-3">
      <p className="text-sm text-muted-foreground">Was this recommendation helpful?</p>
      <div className="ml-auto flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={feedback === 'USEFUL' ? 'default' : 'outline'}
          disabled={pending}
          onClick={() => void sendFeedback('USEFUL')}
          aria-pressed={feedback === 'USEFUL'}
        >
          <ThumbsUp className="size-4" aria-hidden />
          Yes
        </Button>
        <Button
          type="button"
          size="sm"
          variant={feedback === 'NOT_USEFUL' ? 'default' : 'outline'}
          disabled={pending}
          onClick={() => void sendFeedback('NOT_USEFUL')}
          aria-pressed={feedback === 'NOT_USEFUL'}
        >
          <ThumbsDown className="size-4" aria-hidden />
          No
        </Button>
      </div>
    </div>
  );
}
