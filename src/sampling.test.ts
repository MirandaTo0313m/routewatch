import { shouldSample, resolveRate, validateSamplingConfig, SamplingConfig } from './sampling';

describe('resolveRate', () => {
  it('returns global rate when no overrides match', () => {
    const config: SamplingConfig = { rate: 0.5 };
    expect(resolveRate('GET', '/api/users', config)).toBe(0.5);
  });

  it('returns override rate when key matches', () => {
    const config: SamplingConfig = {
      rate: 1,
      routeOverrides: { 'GET /health': 0 },
    };
    expect(resolveRate('GET', '/health', config)).toBe(0);
  });

  it('is case-insensitive for method', () => {
    const config: SamplingConfig = {
      rate: 1,
      routeOverrides: { 'POST /submit': 0.2 },
    };
    expect(resolveRate('post', '/submit', config)).toBe(0.2);
  });

  it('clamps rate above 1 to 1', () => {
    const config: SamplingConfig = { rate: 5 };
    expect(resolveRate('GET', '/x', config)).toBe(1);
  });

  it('clamps rate below 0 to 0', () => {
    const config: SamplingConfig = { rate: -1 };
    expect(resolveRate('GET', '/x', config)).toBe(0);
  });
});

describe('shouldSample', () => {
  it('always samples when rate is 1', () => {
    const config: SamplingConfig = { rate: 1 };
    for (let i = 0; i < 20; i++) {
      expect(shouldSample('GET', '/api', config)).toBe(true);
    }
  });

  it('never samples when rate is 0', () => {
    const config: SamplingConfig = { rate: 0 };
    for (let i = 0; i < 20; i++) {
      expect(shouldSample('GET', '/api', config)).toBe(false);
    }
  });

  it('respects route override of 0', () => {
    const config: SamplingConfig = {
      rate: 1,
      routeOverrides: { 'GET /health': 0 },
    };
    expect(shouldSample('GET', '/health', config)).toBe(false);
  });

  it('samples approximately at given rate', () => {
    const config: SamplingConfig = { rate: 0.5 };
    let hits = 0;
    const iterations = 10000;
    for (let i = 0; i < iterations; i++) {
      if (shouldSample('GET', '/api', config)) hits++;
    }
    // Allow ±5% tolerance
    expect(hits / iterations).toBeGreaterThan(0.45);
    expect(hits / iterations).toBeLessThan(0.55);
  });
});

describe('validateSamplingConfig', () => {
  it('accepts valid config', () => {
    expect(() => validateSamplingConfig({ rate: 0.5 })).not.toThrow();
  });

  it('throws when rate is NaN', () => {
    expect(() => validateSamplingConfig({ rate: NaN })).toThrow();
  });

  it('throws when rate is out of range', () => {
    expect(() => validateSamplingConfig({ rate: 1.5 })).toThrow();
    expect(() => validateSamplingConfig({ rate: -0.1 })).toThrow();
  });

  it('throws when override value is invalid', () => {
    expect(() =>
      validateSamplingConfig({ rate: 1, routeOverrides: { 'GET /x': 2 } })
    ).toThrow();
  });
});
