var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var LlmModule_1;
import { Module, } from '@nestjs/common';
import { LLM } from '../core/port/llm.port.js';
import { MockDriver } from '../adapters/mock/mock.driver.js';
import { OpenAiCompatibleDriver } from '../adapters/openai-compatible/openai-compatible.driver.js';
import { LlmService } from './llm.service.js';
import { LLM_OPTIONS } from './llm.constants.js';
let LlmModule = LlmModule_1 = class LlmModule {
    static forRoot(options) {
        return {
            module: LlmModule_1,
            global: true,
            providers: [
                { provide: LLM_OPTIONS, useValue: options },
                buildLlmProvider(),
                LlmService,
            ],
            exports: [LLM, LlmService],
        };
    }
    static forRootAsync(options) {
        const optionsProvider = {
            provide: LLM_OPTIONS,
            useFactory: options.useFactory,
            inject: (options.inject ?? []),
        };
        return {
            module: LlmModule_1,
            global: true,
            imports: (options.imports ?? []),
            providers: [optionsProvider, buildLlmProvider(), LlmService],
            exports: [LLM, LlmService],
        };
    }
};
LlmModule = LlmModule_1 = __decorate([
    Module({})
], LlmModule);
export { LlmModule };
function buildLlmProvider() {
    return {
        provide: LLM,
        useFactory: (options) => {
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
//# sourceMappingURL=llm.module.js.map