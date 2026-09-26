import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAiCompatibleDriver } from './openai-compatible.driver.js';
import {
  LlmAuthenticationError,
  LlmRateLimitError,
} from '../../core/domain/errors.js';

const originalFetch = globalThis.fetch;

describe('OpenAiCompatibleDriver', () => {
  let driver: OpenAiCompatibleDriver;

  beforeEach(() => {
    globalThis.fetch = originalFetch;
    driver = new OpenAiCompatibleDriver({
      baseUrl: 'http://localhost:1234/v1',
      apiKey: 'sk-test',
      defaultModel: 'gpt-4o-mini',
    });
  });

  it('translates text completion', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 'x',
            model: 'gpt-4o-mini',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'hello' },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    ) as never;

    const res = await driver.chat({
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(res).toMatchObject({
      type: 'text',
      text: 'hello',
      usage: { inputTokens: 5, outputTokens: 3, totalTokens: 8 },
    });
  });

  it('maps 401 to LlmAuthenticationError', async () => {
    globalThis.fetch = vi.fn(
      async () => new Response('unauthorized', { status: 401 }),
    ) as never;

    await expect(
      driver.chat({ messages: [{ role: 'user', content: 'x' }] }),
    ).rejects.toBeInstanceOf(LlmAuthenticationError);
  });

  it('maps 429 to LlmRateLimitError', async () => {
    globalThis.fetch = vi.fn(
      async () => new Response('slow down', { status: 429 }),
    ) as never;

    await expect(
      driver.chat({ messages: [{ role: 'user', content: 'x' }] }),
    ).rejects.toBeInstanceOf(LlmRateLimitError);
  });
});
