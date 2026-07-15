import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { isAiConfigured, loadAiConfig } from './config';
import { resetGeminiClient } from './gemini/client';
import { buildAiRunLog, emitAiRun, setAiRunLogger } from './run-logger';
import { getPromptVersion } from './prompts/registry';

describe('@cardwise/ai config', () => {
  const envKeys = [
    'GEMINI_API_KEY',
    'AI_API_KEY',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'AI_PROVIDER',
    'GEMINI_MODEL',
    'AI_DEFAULT_FAST_MODEL',
    'AI_PING_MODEL',
  ] as const;
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of envKeys) {
      saved[key] = process.env[key];
    }
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    delete process.env.AI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    process.env.AI_PROVIDER = 'gemini';
    process.env.GEMINI_MODEL = 'gemini-flash-latest';
    delete process.env.AI_DEFAULT_FAST_MODEL;
    delete process.env.AI_PING_MODEL;
    resetGeminiClient();
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
    resetGeminiClient();
  });

  it('loads env-driven Gemini config', () => {
    const config = loadAiConfig();
    expect(config.provider).toBe('gemini');
    expect(config.apiKey).toBe('test-gemini-key');
    expect(config.defaultModel).toBe('gemini-flash-latest');
    expect(config.fastModel).toBe('gemini-flash-latest');
    expect(config.pingModel).toBe('gemini-flash-latest');
    expect(isAiConfigured()).toBe(true);
  });

  it('accepts AI_API_KEY alias for Gemini', () => {
    delete process.env.GEMINI_API_KEY;
    process.env.AI_API_KEY = 'generic-key';
    expect(loadAiConfig().apiKey).toBe('generic-key');
  });

  it('throws when no API key is configured', () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.AI_API_KEY;
    expect(() => loadAiConfig()).toThrow(/Missing GEMINI_API_KEY/);
    expect(isAiConfigured()).toBe(false);
  });
});

describe('@cardwise/ai run logger', () => {
  afterEach(() => {
    setAiRunLogger(null);
  });

  it('builds success and failure log entries', () => {
    const success = buildAiRunLog({
      feature: 'ping',
      model: 'gemini-flash-latest',
      provider: 'gemini',
      tier: 'ping',
      latencyMs: 42,
      success: true,
    });
    expect(success.status).toBe('SUCCESS');
    expect(success.errorCode).toBeUndefined();

    const failure = buildAiRunLog({
      feature: 'ping',
      model: 'gemini-flash-latest',
      provider: 'gemini',
      latencyMs: 99,
      success: false,
      error: new Error('boom'),
    });
    expect(failure.status).toBe('FAILURE');
    expect(failure.errorMessage).toBe('boom');
  });

  it('invokes registered logger', async () => {
    const entries: unknown[] = [];
    setAiRunLogger((entry) => {
      entries.push(entry);
    });

    await emitAiRun(
      buildAiRunLog({
        feature: 'ping',
        model: 'gemini-flash-latest',
        provider: 'gemini',
        latencyMs: 1,
        success: true,
      }),
    );

    expect(entries).toHaveLength(1);
  });
});

describe('@cardwise/ai prompt registry', () => {
  it('exposes stable prompt versions', () => {
    expect(getPromptVersion('catalog-structure')).toBe('v1.0.0');
    expect(getPromptVersion('reco-explain')).toBe('v1.0.0');
    expect(getPromptVersion('ping')).toBe('v1.0.0');
  });
});
