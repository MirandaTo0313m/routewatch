/**
 * Sampling module for routewatch.
 * Controls what fraction of requests are tracked to reduce overhead.
 */

export interface SamplingConfig {
  /** Rate between 0 and 1. 1 = track all, 0.1 = track 10% */
  rate: number;
  /** Optional per-route overrides, e.g. { 'GET /health': 0 } */
  routeOverrides?: Record<string, number>;
}

const DEFAULT_RATE = 1;

/**
 * Returns true if the given request should be sampled (tracked).
 */
export function shouldSample(
  method: string,
  path: string,
  config: SamplingConfig
): boolean {
  const rate = resolveRate(method, path, config);
  if (rate <= 0) return false;
  if (rate >= 1) return true;
  return Math.random() < rate;
}

/**
 * Resolves the effective sampling rate for a route.
 */
export function resolveRate(
  method: string,
  path: string,
  config: SamplingConfig
): number {
  const key = `${method.toUpperCase()} ${path}`;
  if (config.routeOverrides && key in config.routeOverrides) {
    return clamp(config.routeOverrides[key]);
  }
  return clamp(config.rate ?? DEFAULT_RATE);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Validates a SamplingConfig, throwing if invalid.
 */
export function validateSamplingConfig(config: SamplingConfig): void {
  if (typeof config.rate !== 'number' || isNaN(config.rate)) {
    throw new Error('SamplingConfig.rate must be a number');
  }
  if (config.rate < 0 || config.rate > 1) {
    throw new Error('SamplingConfig.rate must be between 0 and 1');
  }
  if (config.routeOverrides) {
    for (const [key, val] of Object.entries(config.routeOverrides)) {
      if (typeof val !== 'number' || val < 0 || val > 1) {
        throw new Error(`routeOverrides['${key}'] must be a number between 0 and 1`);
      }
    }
  }
}
