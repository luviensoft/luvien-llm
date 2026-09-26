import {
  DynamicModule,
  Module,
  type InjectionToken,
  type OptionalFactoryDependency,
  type Provider,
} from '@nestjs/common';

import { LLM, type Llm } from '../core/port/llm.port.js';
import type { LlmCapabilities } from '../core/domain/capability.js';
import { FULL_CAPABILITIES } from '../core/domain/capability.js';

import { MockDriver } from '../adapters/mock/mock.driver.js';
import type { MockConfig } from '../adapters/mock/mock.config.js';
import { OpenAiCompatibleDriver } from '../adapters/openai-compatible/openai-compatible.driver.js';
import type { OpenAiCompatibleConfig } from '../adapters/openai-compatible/openai-compatible.config.js';

import { LlmService } from './llm.service.js';
import { LLM_OPTIONS } from './llm.constants.js';

export type LlmDriverConfig =
  | ({ type: 'mock' } & MockConfig)
  | ({ type: 'openai-compatible' } & OpenAiCompatibleConfig);

export interface LlmModuleOptions {
  driver: LlmDriverConfig;
  /**
   * Optional capability override applied on top of the driver's declared
   * capabilities. Useful in dev when a local model lacks features.
   */
  capabilities?: Partial<LlmCapabilities>;
}

export interface LlmModuleAsyncOptions<TArgs extends unknown[] = any[]> {
  imports?: unknown[];
  inject?: Array<InjectionToken | OptionalFactoryDependency>;
  useFactory: (...args: TArgs) => Promise<LlmModuleOptions> | LlmModuleOptions;
}

@Module({})
export class LlmModule {
  static forRoot(options: LlmModuleOptions): DynamicModule {
    return {
      module: LlmModule,
      global: true,
      providers: [
        { provide: LLM_OPTIONS, useValue: options },
        buildLlmProvider(),
        LlmService,
      ],
      exports: [LLM, LlmService],
    };
  }

  static forRootAsync<TArgs extends unknown[]>(
    options: LlmModuleAsyncOptions<TArgs>,
  ): DynamicModule {
    const optionsProvider: Provider = {
      provide: LLM_OPTIONS,
      useFactory: options.useFactory as (...args: unknown[]) => unknown,
      inject: (options.inject ?? []) as never[],
    };

    return {
      module: LlmModule,
      global: true,
      imports: (options.imports ?? []) as never[],
      providers: [optionsProvider, buildLlmProvider(), LlmService],
      exports: [LLM, LlmService],
    };
  }
}

function buildLlmProvider(): Provider {
  return {
    provide: LLM,
    useFactory: (options: LlmModuleOptions): Llm => {
      switch (options.driver.type) {
        case 'mock': {
          const { type: _type, ...mockConfig } = options.driver;
          return new MockDriver(mockConfig);
        }
        case 'openai-compatible': {
          const { type: _type, ...config } = options.driver;
          return new OpenAiCompatibleDriver(config);
        }
      }
    },
    inject: [LLM_OPTIONS],
  };
}
