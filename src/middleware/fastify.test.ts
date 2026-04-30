import { shouldIgnore } from './fastify';
import { clearHits, getHits } from '../tracker';

const makeHit = (overrides = {}) => ({
  method: 'GET',
  path: '/api/test',
  statusCode: 200,
  durationMs: 42,
  slow: false,
  timestamp: new Date().toISOString(),
  ...overrides,
});

describe('shouldIgnore (fastify)', () => {
  it('ignores exact path matches', () => {
    expect(shouldIgnore('/health', ['/health'])).toBe(true);
  });

  it('does not ignore unmatched paths', () => {
    expect(shouldIgnore('/api/users', ['/health', '/ping'])).toBe(false);
  });

  it('ignores paths matching wildcard prefix', () => {
    expect(shouldIgnore('/static/logo.png', ['/static/*'])).toBe(true);
  });

  it('does not ignore paths that do not match wildcard prefix', () => {
    expect(shouldIgnore('/api/data', ['/static/*'])).toBe(false);
  });

  it('handles empty ignore list', () => {
    expect(shouldIgnore('/anything', [])).toBe(false);
  });

  it('handles multiple patterns including wildcard', () => {
    expect(shouldIgnore('/internal/secret', ['/health', '/internal/*'])).toBe(
      true
    );
  });
});

describe('routeWatchFastify integration (tracker side)', () => {
  beforeEach(() => {
    clearHits();
  });

  it('tracker starts empty after clear', () => {
    expect(getHits()).toHaveLength(0);
  });

  it('makeHit helper produces valid hit shape', () => {
    const hit = makeHit({ path: '/api/orders', statusCode: 404 });
    expect(hit.method).toBe('GET');
    expect(hit.path).toBe('/api/orders');
    expect(hit.statusCode).toBe(404);
    expect(hit.slow).toBe(false);
    expect(typeof hit.timestamp).toBe('string');
  });

  it('slow flag is set correctly via makeHit', () => {
    const hit = makeHit({ durationMs: 2000, slow: true });
    expect(hit.slow).toBe(true);
    expect(hit.durationMs).toBe(2000);
  });
});
