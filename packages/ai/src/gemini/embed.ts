import { loadAiConfig } from '../config';
import { getGeminiClient } from './client';

export type EmbeddingUsage = {
  totalTokens?: number;
};

function mapEmbeddingUsage(metadata: unknown): EmbeddingUsage {
  if (!metadata || typeof metadata !== 'object') return {};
  const tokenCount = (metadata as { tokenCount?: number }).tokenCount;
  return tokenCount !== undefined ? { totalTokens: tokenCount } : {};
}

/** Embed a single text document using the configured embedding model. */
export async function embedText(text: string): Promise<{
  values: number[];
  model: string;
  usage: EmbeddingUsage;
}> {
  const [result] = await embedTexts([text]);
  return result!;
}

/** Embed multiple documents in one API call (same model). */
export async function embedTexts(texts: string[]): Promise<
  Array<{
    values: number[];
    model: string;
    usage: EmbeddingUsage;
  }>
> {
  if (texts.length === 0) return [];

  const config = loadAiConfig();
  const client = getGeminiClient();
  const response = await client.models.embedContent({
    model: config.embeddingModel,
    contents: texts,
  });

  const embeddings = response.embeddings ?? [];
  if (embeddings.length !== texts.length) {
    throw new Error(
      `Expected ${texts.length} embeddings, received ${embeddings.length}`,
    );
  }

  return embeddings.map((row, index) => {
    const values = row.values;
    if (!values?.length) {
      throw new Error(`Gemini returned an empty embedding at index ${index}`);
    }
    return {
      values,
      model: config.embeddingModel,
      usage: mapEmbeddingUsage(response.metadata),
    };
  });
}
