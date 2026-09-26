// Nest
export { LlmModule } from './nest/llm.module.js';
export { LlmService } from './nest/llm.service.js';
export type {
  LlmModuleOptions,
  LlmModuleAsyncOptions,
  LlmDriverConfig,
} from './nest/llm.module.js';

// Ports and tokens
export type { Llm } from './core/port/llm.port.js';
export { LLM } from './core/port/llm.port.js';
export type { LlmDriver } from './core/port/llm-driver.port.js';
export { LLM_DRIVER } from './core/port/llm-driver.port.js';

// Domain types
export type { LlmMessage, LlmRole } from './core/domain/message.js';
export type {
  LlmTool,
  LlmToolCall,
  LlmToolChoice,
} from './core/domain/tool.js';
export type { LlmUsage } from './core/domain/usage.js';
export type { LlmCapabilities, LlmModel } from './core/domain/capability.js';
export { FULL_CAPABILITIES } from './core/domain/capability.js';
export type { LlmResponseFormat } from './core/domain/structured-output.js';
export type { ChatRequest, ResponsesRequest } from './core/domain/request.js';
export type {
  ChatResponse,
  ResponsesResponse,
  TextChatResponse,
  StructuredChatResponse,
  ToolCallsChatResponse,
} from './core/domain/response.js';
export type { LlmStreamEvent } from './core/domain/stream.js';

// Errors
export {
  LlmError,
  LlmConfigurationError,
  LlmConnectionError,
  LlmTimeoutError,
  LlmRateLimitError,
  LlmAuthenticationError,
  LlmInvalidRequestError,
  LlmCapabilityError,
  LlmProviderError,
  LlmSerializationError,
} from './core/domain/errors.js';

// Drivers
export { MockDriver } from './adapters/mock/mock.driver.js';
export type { MockConfig } from './adapters/mock/mock.config.js';
export type {
  MockScenario,
  MockResponseSpec,
} from './adapters/mock/mock.scenario.js';
export { OpenAiCompatibleDriver } from './adapters/openai-compatible/openai-compatible.driver.js';
export type { OpenAiCompatibleConfig } from './adapters/openai-compatible/openai-compatible.config.js';
