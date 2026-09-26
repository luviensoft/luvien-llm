# @luvien/llm

Provider-agnostic LLM inference infrastructure for the Luvien ecosystem.

`@luvien/llm` provides NestJS applications with a stable API for communicating with LLM providers. The same application code can run against a deterministic Mock driver or a real OpenAI-compatible endpoint without changing application logic.

The library is **infrastructure, not an agent framework**.

It transports messages, normalizes provider responses, and exposes common LLM capabilities. It does not own prompts, memory, tool execution, business logic, or conversation state.

## Features

* `Llm` port with `chat`, `responses`, and `stream`
* First-class deterministic Mock driver
* OpenAI-compatible driver
* Streaming via `AsyncIterable<LlmStreamEvent>`
* Tool calling protocol
* Structured output
* Normalized usage and errors
* Capability declaration per driver
* NestJS `LlmModule` with synchronous and asynchronous registration
* Provider SDKs are not exposed through the public API
* No direct `process.env` access inside the library
* Native `fetch` for the OpenAI-compatible driver
* No required runtime dependencies

## Architecture

```text
APPLICATION / AGENT RUNTIME
│
├── Prompt construction
├── Conversation history
├── Domain context
├── Business rules
├── Tool registry
├── Tool execution
├── Agent loop
├── Memory
├── RAG
└── Workflows
        │
        ▼
@luvien/llm
│
├── Chat
├── Responses
├── Streaming
├── Tool protocol
├── Structured output
├── Model
├── Capabilities
├── Usage
├── Provider adaptation
├── Error normalization
├── Mock
└── Replay
        │
        ▼
PROVIDERS
│
├── OpenAI
├── Ollama
├── vLLM
├── LM Studio
├── OpenRouter
└── Other OpenAI-compatible APIs
```

The library transports. It does not interpret.

A useful boundary rule:

> If code knows what `"invoice"`, `"customer"`, or another business concept means, that code belongs to the application, not `@luvien/llm`.

## Supported Capabilities

Each driver declares its supported capabilities through `LlmCapabilities`.

| Capability         | Mock | OpenAI-compatible  |
| ------------------ | ---- | ------------------ |
| `chat`             | Yes  | Yes                |
| `responses`        | Yes  | Yes                |
| `streaming`        | Yes  | Yes                |
| `toolCalling`      | Yes  | Yes                |
| `structuredOutput` | Yes  | Yes                |
| `vision`           | No   | Provider-dependent |
| `reasoning`        | No   | Provider-dependent |

Capabilities are descriptive. The library does not assume that every provider or model supports every capability.

## Installation

```bash
bun add github:luviensoft/luvien-llm
```

`@nestjs/common`, `@nestjs/core`, and `reflect-metadata` are peer dependencies.

## Quick Start

### 1. Register the module

```typescript
import { Module } from '@nestjs/common';
import { LlmModule } from '@luvien/llm';

@Module({
  imports: [
    LlmModule.forRoot({
      driver: {
        type: 'openai-compatible',
        baseUrl: 'http://localhost:11434/v1',
        defaultModel: 'qwen2.5:7b',
      },
    }),
  ],
})
export class AppModule {}
```

### 2. Inject the service

```typescript
import { Injectable } from '@nestjs/common';
import { LlmService } from '@luvien/llm';

@Injectable()
export class InvoiceService {
  constructor(private readonly llm: LlmService) {}

  async extract(text: string) {
    const res = await this.llm.chat({
      messages: [
        { role: 'system', content: 'Extract invoice fields as JSON.' },
        { role: 'user', content: text },
      ],
      responseFormat: {
        type: 'json_schema',
        name: 'invoice',
        schema: {
          type: 'object',
          properties: {
            invoiceNumber: { type: 'string' },
            total: { type: 'number' },
          },
          required: ['invoiceNumber', 'total'],
        },
      },
    });

    if (res.type !== 'structured') throw new Error('unexpected response');
    return res.data;
  }
}
```

### 3. Switch drivers by configuration

Change the application configuration:

```env
LLM_DRIVER=mock
```

Restart the application. No application code changes are required.

## Configuration

The library defines the LLM configuration contract. The application owns environment variables, configuration composition, and secrets.

### Driver Configuration

```typescript
type LlmDriverConfig =
  | ({ type: 'mock' } & MockConfig)
  | ({ type: 'openai-compatible' } & OpenAiCompatibleConfig);

interface MockConfig {
  defaultModel?: string;
  scenarios?: MockScenario[];
  defaultScenario?: string;
}

interface OpenAiCompatibleConfig {
  baseUrl: string;
  apiKey?: string;
  defaultModel: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  capabilities?: Partial<LlmCapabilities>;
}
```

The OpenAI-compatible `baseUrl` should not have a trailing slash.

### Async Configuration

```typescript
LlmModule.forRootAsync({
  inject: [APPLICATION_CONFIG],
  useFactory: (cfg: ApplicationConfig) => cfg.llm,
});
```

The library never reads `process.env`.

The application resolves configuration, typically through `@luvien/config`, and passes a typed `LlmModuleOptions`.

## Drivers

### Mock

The Mock driver is a deterministic, in-process driver.

It is **not a test-only helper**. Applications can run entirely against Mock during development without contacting an external provider.

Mock scenarios are selected through request metadata:

```typescript
metadata: {
  scenario: 'invoice.extract',
}
```

The library treats the scenario name as an opaque identifier. It does not know what the scenario represents.

Mock behavior must remain:

* deterministic
* explicit
* inspectable
* application-configurable

Unknown scenarios result in `LlmConfigurationError`. The driver never generates random fallback responses.

### OpenAI-Compatible

The OpenAI-compatible driver provides one adapter for providers exposing the OpenAI request/response protocol.

| Provider   | `baseUrl`                      | `apiKey`     |
| ---------- | ------------------------------ | ------------ |
| OpenAI     | `https://api.openai.com/v1`    | Required     |
| Ollama     | `http://localhost:11434/v1`    | Not required |
| vLLM       | `http://localhost:8000/v1`     | Not required |
| LM Studio  | `http://localhost:1234/v1`     | Not required |
| OpenRouter | `https://openrouter.ai/api/v1` | Required     |

The adapter translates:

```text
Luvien request
      ↓
OpenAI-compatible request
      ↓
Provider
      ↓
OpenAI-compatible response
      ↓
Luvien response
```

Provider SDK types never escape the adapter boundary.

The driver uses native `fetch`.

### Replay

Replay is planned for v0.2.

It will record real provider responses and replay them locally for regression testing and debugging.

Replay is intentionally separate from Mock:

```text
Mock
= application-defined deterministic behavior

Replay
= previously recorded real provider behavior
```

## Mock Scenarios

Scenarios should be defined separately from application configuration.

Recommended location:

```text
src/llm/mock-scenarios.ts
```

The existing v0.1 scenario examples remain unchanged.

### Scenario Contract

```typescript
interface MockScenario {
  name: string;

  match?(request: ChatRequest): boolean;

  respond:
    | MockResponseSpec
    | ((request: ChatRequest) =>
        MockResponseSpec | Promise<MockResponseSpec>);
}
```

Supported response specifications include:

```text
text
structured
tool_calls
error
```

Scenario rules:

* Scenario names are opaque to the library.
* Responses are deterministic.
* Unknown scenarios produce `LlmConfigurationError`.
* Predicate mismatches produce `LlmConfigurationError`.
* There is no random response fallback.
* Mock must not require an external provider.

When the scenario collection becomes large, split scenarios by domain into separate files and re-export them from a single barrel.

## Streaming

The existing v0.1 streaming example remains unchanged.

Provider-specific streaming chunks never reach application code. Drivers normalize provider events into `LlmStreamEvent`.

Mock streaming follows the same event contract as real providers, allowing application code to remain unchanged when switching between Mock and a real provider.

## Tool Calling

The existing v0.1 tool-calling example remains unchanged.

The library owns the **tool protocol**, not tool execution.

The library:

* sends tool definitions to the provider
* parses tool calls
* returns normalized `LlmToolCall` values
* accepts tool results through `role: 'tool'` messages

The application owns:

* tool registry
* tool execution
* tool argument validation
* tool execution retry policy
* the agent/tool loop

Tool IDs are opaque and must be preserved by the application when sending tool results back.

## Structured Output

The existing v0.1 structured-output example remains unchanged.

Structured output is represented as a first-class response format:

```text
json_schema
json_object
```

The library transports the requested format and parses the provider response.

The application remains responsible for domain-level validation of the resulting data.

For example, if the application requires strict business validation, it should validate the returned structure using its own schema.

## Errors

The library exposes provider-neutral errors:

```text
LlmError
├── LlmConfigurationError
├── LlmConnectionError
├── LlmTimeoutError
├── LlmRateLimitError
├── LlmAuthenticationError
├── LlmInvalidRequestError
├── LlmCapabilityError
├── LlmProviderError
└── LlmSerializationError
```

The OpenAI-compatible adapter maps provider failures into these errors.

| HTTP / Failure  | Error                    |
| --------------- | ------------------------ |
| `401`, `403`    | `LlmAuthenticationError` |
| `429`           | `LlmRateLimitError`      |
| `4xx`           | `LlmInvalidRequestError` |
| `5xx`           | `LlmProviderError`       |
| Fetch failure   | `LlmConnectionError`     |
| Abort / timeout | `LlmTimeoutError`        |

Original provider errors may be preserved as `cause` for diagnostics.

They must not be exposed directly to API clients.

Applications should map `LlmError` to their own HTTP or transport-level error model.

The library does not log API keys, authorization headers, or prompt content by default.

## Testing

The Mock driver allows application and library tests to run without an external LLM provider.

A test can instantiate the driver directly and select a deterministic scenario.

The existing v0.1 testing example remains unchanged.

The testing strategy includes:

* Mock driver tests
* request/response normalization tests
* streaming tests
* tool-calling tests
* structured-output tests
* error mapping tests
* provider integration tests where applicable

### Real Provider Integration

Real-provider integration should use a local OpenAI-compatible provider where possible.

Ollama is suitable for local development because it does not require a paid API.

## Adding a New Driver

A new provider-specific driver is appropriate when the provider does not expose a sufficiently compatible OpenAI API.

Recommended structure:

```text
src/adapters/<provider>/
```

The driver must implement the Luvien LLM contract.

Implementation responsibilities:

1. Translate `ChatRequest` into the provider request format.
2. Translate provider responses into Luvien responses.
3. Normalize streaming events.
4. Map provider errors into `LlmError` subclasses.
5. Declare supported capabilities.
6. Register the driver in the NestJS module.
7. Add the corresponding driver configuration.
8. Add unit, contract, and integration tests as appropriate.

Do not:

* leak provider SDK types
* add provider-specific methods to `Llm`
* put business logic in the driver
* create a separate driver when the provider already supports the OpenAI-compatible protocol

## Boundaries

`@luvien/llm` does **not** own:

* Agent runtime
* Reasoning loops
* Planning
* Tool execution
* Prompt management
* Prompt templates
* Prompt versioning
* Conversation memory
* RAG
* Embeddings pipelines
* Vector databases
* Retrieval
* Business workflows
* Domain schemas
* Provider pricing
* Cost policy
* Provider-specific observability backends
* Business-aware model routing
* Multi-provider fan-out

The library transports and normalizes LLM inference.

The application decides what the messages mean and what to do with the results.

## Non-Goals

The following are intentionally outside the package boundary:

* Dedicated adapters for every LLM vendor
* Wrapping a provider SDK without a protocol reason
* Random Mock responses
* Treating Mock as only a testing utility
* Hiding provider failures behind generic errors
* Database or Redis dependencies for Mock/Replay
* Making the core depend on NestJS
* Building an agent framework
* Building a prompt management system
* Building a RAG framework

## Development Workflow

The intended development workflow is:

```text
~90% development
    ↓
Mock / Replay

~10% development
    ↓
Real provider
```

Mock and Replay should be preferred for normal development and regression testing.

Real providers should be used for:

* provider-specific verification
* model behavior verification
* integration testing
* final end-to-end validation

Switching between development modes should not require changes to application business logic.

## Roadmap

v0.1 establishes the core inference boundary and the initial drivers.

| Delivery                     | Status    | Scope                                                    |
| ---------------------------- | --------- | -------------------------------------------------------- |
| 1 — Core contracts           | ✅ Shipped | `Llm`, `LlmDriver`, domain types, errors                 |
| 2 — Mock driver              | ✅ Shipped | Scenarios, streaming, structured output, tools, errors   |
| 3 — OpenAI-compatible driver | ✅ Shipped | HTTP, streaming, tools, structured output, usage, errors |
| 4 — NestJS integration       | ✅ Shipped | `LlmModule.forRoot`, `forRootAsync`, `LlmService`        |
| 5 — Replay driver            | ⏳ v0.2    | Fixture store, recording, deterministic matching         |
| 6 — Routing / Hybrid         | ⏳ v0.2    | Mock / Replay / Real selection                           |
| 7 — Resilience               | ⏳ v0.2    | Retry, timeout, fallback                                 |
| 8 — Observability            | ⏳ v0.2    | Lifecycle hooks                                          |
| 9 — Contract tests           | ⏳ v0.2    | Shared driver contract                                   |
| 10 — Example application     | ⏳ v0.2    | `examples/llm/` and local provider setup                 |

Future deliveries must preserve the core boundary established in v0.1.

## Status

🚧 **Work in progress**

### v0.1

The following are functional:

* Core LLM contract
* Mock driver
* OpenAI-compatible driver
* NestJS integration
* Non-streaming chat
* Streaming
* Structured output
* Tool calling
* Usage normalization
* Provider/model metadata
* Provider error normalization

The API may change before the first stable release.

## License

PolyForm Shield 1.0.0
