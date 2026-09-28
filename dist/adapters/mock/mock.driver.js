import { FULL_CAPABILITIES } from '../../core/domain/capability.js';
import { LlmConfigurationError } from '../../core/domain/errors.js';
const ZERO_USAGE = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
};
export class MockDriver {
    provider = 'mock';
    capabilities = FULL_CAPABILITIES;
    scenarios;
    defaultScenario;
    defaultModel;
    constructor(config = {}) {
        this.scenarios = new Map((config.scenarios ?? []).map((s) => [s.name, s]));
        this.defaultScenario = config.defaultScenario;
        this.defaultModel = config.defaultModel ?? 'mock-model';
    }
    async chat(request) {
        const spec = await this.resolveSpec(request);
        if (spec.type === 'error')
            throw spec.error;
        const model = request.model ?? this.defaultModel;
        const usage = mergeUsage(spec.usage);
        if (spec.latencyMs)
            await sleep(spec.latencyMs);
        switch (spec.type) {
            case 'text':
                return {
                    type: 'text',
                    text: spec.text,
                    finishReason: spec.finishReason ?? 'stop',
                    usage,
                    model,
                    provider: this.provider,
                };
            case 'structured':
                return {
                    type: 'structured',
                    data: spec.data,
                    finishReason: spec.finishReason ?? 'stop',
                    usage,
                    model,
                    provider: this.provider,
                };
            case 'tool_calls':
                return {
                    type: 'tool_calls',
                    toolCalls: spec.toolCalls,
                    finishReason: spec.finishReason ?? 'tool_calls',
                    usage,
                    model,
                    provider: this.provider,
                };
        }
    }
    responses(request) {
        return this.chat(request);
    }
    async *stream(request) {
        const spec = await this.resolveSpec(request);
        const model = request.model ?? this.defaultModel;
        yield { type: 'response_started', provider: this.provider, model };
        if (spec.latencyMs)
            await sleep(spec.latencyMs);
        if (spec.type === 'error') {
            yield { type: 'error', error: spec.error };
            return;
        }
        if (spec.type === 'text') {
            const chunkSize = spec.chunkSize ?? 8;
            for (let i = 0; i < spec.text.length; i += chunkSize) {
                yield { type: 'text_delta', delta: spec.text.slice(i, i + chunkSize) };
            }
        }
        else if (spec.type === 'structured') {
            const json = JSON.stringify(spec.data);
            yield { type: 'text_delta', delta: json };
        }
        else if (spec.type === 'tool_calls') {
            for (let index = 0; index < spec.toolCalls.length; index++) {
                const call = spec.toolCalls[index];
                yield {
                    type: 'tool_call_delta',
                    index,
                    id: call.id,
                    name: call.name,
                    argumentsDelta: JSON.stringify(call.arguments),
                };
            }
        }
        yield { type: 'usage', usage: mergeUsage(spec.usage) };
        yield {
            type: 'response_completed',
            finishReason: spec.finishReason ??
                (spec.type === 'tool_calls' ? 'tool_calls' : 'stop'),
        };
    }
    async resolveSpec(request) {
        const scenarioName = request.metadata?.scenario ??
            this.defaultScenario;
        if (!scenarioName) {
            throw new LlmConfigurationError('Mock driver: no scenario in metadata and no defaultScenario configured');
        }
        const scenario = this.scenarios.get(scenarioName);
        if (!scenario) {
            throw new LlmConfigurationError(`Mock driver: unknown scenario "${scenarioName}"`);
        }
        if (scenario.match && !scenario.match(request)) {
            throw new LlmConfigurationError(`Mock driver: scenario "${scenarioName}" predicate did not match`);
        }
        const spec = typeof scenario.respond === 'function'
            ? await scenario.respond(request)
            : scenario.respond;
        return spec;
    }
}
function mergeUsage(partial) {
    return { ...ZERO_USAGE, ...(partial ?? {}) };
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=mock.driver.js.map