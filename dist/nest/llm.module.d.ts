import { DynamicModule, type InjectionToken, type OptionalFactoryDependency } from '@nestjs/common';
import type { LlmCapabilities } from '../core/domain/capability.js';
import type { MockConfig } from '../adapters/mock/mock.config.js';
import type { OpenAiCompatibleConfig } from '../adapters/openai-compatible/openai-compatible.config.js';
export type LlmDriverConfig = ({
    type: 'mock';
} & MockConfig) | ({
    type: 'openai-compatible';
} & OpenAiCompatibleConfig);
export interface LlmModuleOptions {
    driver: LlmDriverConfig;
    capabilities?: Partial<LlmCapabilities>;
}
export interface LlmModuleAsyncOptions<TArgs extends unknown[] = any[]> {
    imports?: unknown[];
    inject?: Array<InjectionToken | OptionalFactoryDependency>;
    useFactory: (...args: TArgs) => Promise<LlmModuleOptions> | LlmModuleOptions;
}
export declare class LlmModule {
    static forRoot(options: LlmModuleOptions): DynamicModule;
    static forRootAsync<TArgs extends unknown[]>(options: LlmModuleAsyncOptions<TArgs>): DynamicModule;
}
//# sourceMappingURL=llm.module.d.ts.map