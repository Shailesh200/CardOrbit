import { GoogleGenAI } from '@google/genai';

import { loadAiConfig } from '../config';

let singleton: GoogleGenAI | null = null;
let singletonKey: string | null = null;

/** Reusable singleton Gemini client for the process. */
export function getGeminiClient(): GoogleGenAI {
  const config = loadAiConfig();
  if (!singleton || singletonKey !== config.apiKey) {
    singleton = new GoogleGenAI({ apiKey: config.apiKey });
    singletonKey = config.apiKey;
  }
  return singleton;
}

/** Test helper — clears cached client after env changes. */
export function resetGeminiClient(): void {
  singleton = null;
  singletonKey = null;
}
