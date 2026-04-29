import { RouteTracker, RouteHit } from './tracker';

function makeHit(overrides: Partial<RouteHit> = {}): RouteHit {
  return {
    method: 'GET',
    path: '/api/users',
    statusCode: 200,
    responseTimeMs: 50,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('RouteTracker', () => {
  let tracker: RouteTracker;

  beforeEach(() => {
    tracker = new RouteTracker();
  });

  it('records a single hit correctly', () => {
    tracker.record(makeHit());
    const stats = tracker.getStatsForRoute('GET', '/api/users');
    expect(stats).toBeDefined();
    expect(stats!.hits).toBe(1);
    expect(stats!.avgResponseTimeMs).toBe(50);
    expect(stats!.statusCodes[200]).toBe(1);
  });

  it('accumulates multiple hits and computes average', () => {
    tracker.record(makeHit({ responseTimeMs: 100 }));
    tracker.record(makeHit({ responseTimeMs: 200 }));
    const stats = tracker.getStatsForRoute('GET', '/api/users');
    expect(stats!.hits).toBe(2);
    expect(stats!.avgResponseTimeMs).toBe(150);
    expect(stats!.totalResponseTimeMs).toBe(300);
  });

  it('tracks status codes separately', () => {
    tracker.record(makeHit({ statusCode: 200 }));
    tracker.record(makeHit({ statusCode: 404 }));
    tracker.record(makeHit({ statusCode: 200 }));
    const stats = tracker.getStatsForRoute('GET', '/api/users');
    expect(stats!.statusCodes[200]).toBe(2);
    expect(stats!.statusCodes[404]).toBe(1);
  });

  it('differentiates routes by method and path', () => {
    tracker.record(makeHit({ method: 'GET', path: '/api/users' }));
    tracker.record(makeHit({ method: 'POST', path: '/api/users' }));
    const allStats = tracker.getStats();
    expect(Object.keys(allStats)).toHaveLength(2);
  });

  it('resets all stats', () => {
    tracker.record(makeHit());
    tracker.reset();
    expect(Object.keys(tracker.getStats())).toHaveLength(0);
  });

  it('returns undefined for unknown route', () => {
    expect(tracker.getStatsForRoute('DELETE', '/nonexistent')).toBeUndefined();
  });
});
