import type { MockScenario } from './mock.scenario.js';

export interface MockConfig {
  /** Default model name reported in responses. */
  defaultModel?: string;
  /** Scenarios keyed by name for O(1) lookup. */
  scenarios?: MockScenario[];
  /**
   * Scenario name used when `metadata.scenario` is absent or unknown.
   * If not set and no default is provided, the driver throws.
   */
  defaultScenario?: string;
}
