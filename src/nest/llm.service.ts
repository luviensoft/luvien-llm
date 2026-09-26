import { Inject, Injectable } from '@nestjs/common';
import { LLM, type Llm } from '../core/port/llm.port.js';
import type { ChatRequest, ResponsesRequest } from '../core/domain/request.js';
import type {
  ChatResponse,
  ResponsesResponse,
} from '../core/domain/response.js';
import type { LlmStreamEvent } from '../core/domain/stream.js';

@Injectable()
export class LlmService implements Llm {
  constructor(@Inject(LLM) private readonly llm: Llm) {}

  chat(request: ChatRequest): Promise<ChatResponse> {
    return this.llm.chat(request);
  }

  responses(request: ResponsesRequest): Promise<ResponsesResponse> {
    return this.llm.responses(request);
  }

  stream(request: ChatRequest): AsyncIterable<LlmStreamEvent> {
    return this.llm.stream(request);
  }
}
