import { describe, it, expect } from 'vitest';
import { MockDriver } from './mock.driver.js';
import { LlmConfigurationError } from '../../core/domain/errors.js';

const driver = new MockDriver({
  defaultModel: 'test-model',
  scenarios: [
    {
      name: 'greeting',
      respond: { type: 'text', text: 'hello' },
    },
    {
      name: 'invoice.extract',
      respond: {
        type: 'structured',
        data: { invoiceNumber: 'INV-001', total: 125000 },
      },
    },
    {
      name: 'customer.lookup',
      respond: {
        type: 'tool_calls',
        toolCalls: [
          {
            id: 'c1',
            name: 'find_customer',
            arguments: { email: 'a@b.test' },
          },
        ],
      },
    },
    {
      name: 'boom',
      respond: { type: 'error', error: new Error('nope') as never },
    },
  ],
});

describe('MockDriver', () => {
  it('returns text for text scenario', async () => {
    const res = await driver.chat({
      messages: [{ role: 'user', content: 'hi' }],
      metadata: { scenario: 'greeting' },
    });
    expect(res).toMatchObject({
      type: 'text',
      text: 'hello',
      model: 'test-model',
      provider: 'mock',
      finishReason: 'stop',
    });
  });

  it('returns structured data', async () => {
    const res = await driver.chat({
      messages: [{ role: 'user', content: 'x' }],
      metadata: { scenario: 'invoice.extract' },
    });
    expect(res).toMatchObject({
      type: 'structured',
      data: { invoiceNumber: 'INV-001', total: 125000 },
    });
  });

  it('returns tool calls', async () => {
    const res = await driver.chat({
      messages: [{ role: 'user', content: 'x' }],
      metadata: { scenario: 'customer.lookup' },
    });
    expect(res).toMatchObject({
      type: 'tool_calls',
      toolCalls: [{ id: 'c1', name: 'find_customer' }],
      finishReason: 'tool_calls',
    });
  });

  it('throws when scenario is missing', async () => {
    await expect(
      driver.chat({ messages: [{ role: 'user', content: 'x' }] }),
    ).rejects.toBeInstanceOf(LlmConfigurationError);
  });

  it('throws when scenario is unknown', async () => {
    await expect(
      driver.chat({
        messages: [{ role: 'user', content: 'x' }],
        metadata: { scenario: 'unknown' },
      }),
    ).rejects.toBeInstanceOf(LlmConfigurationError);
  });

  it('streams text in chunks', async () => {
    const chunks: string[] = [];
    for await (const ev of driver.stream({
      messages: [{ role: 'user', content: 'x' }],
      metadata: { scenario: 'greeting' },
    })) {
      if (ev.type === 'text_delta') chunks.push(ev.delta);
    }
    expect(chunks.join('')).toBe('hello');
  });
});
