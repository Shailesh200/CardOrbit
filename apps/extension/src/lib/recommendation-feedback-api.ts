import { extensionAuthFetch } from './extension-api';

export async function submitRecommendationFeedback(
  recommendationId: string,
  type: 'USEFUL' | 'NOT_USEFUL',
) {
  return extensionAuthFetch<{ recommendationId: string }>(
    `/api/v1/recommendations/${recommendationId}/feedback`,
    {
      method: 'POST',
      body: JSON.stringify({ type }),
    },
  );
}
