import { generateReport, formatReportText } from './reporter';
import { RouteHit } from './tracker';

function makeHit(overrides: Partial<RouteHit> = {}): RouteHit {
  return {
    method: 'GET',
    route: '/api/test',
    statusCode: 200,
    timestamp: new Date('2024-01-01T00:00:00Z'),
    durationMs: 50,
    ...overrides,
  };
}

describe('generateReport', () => {
  it('returns empty routes for no hits', () => {
    const report = generateReport([]);
    expect(report.totalRequests).toBe(0);
    expect(report.routes).toHaveLength(0);
  });

  it('aggregates hits for the same route and method', () => {
    const hits = [
      makeHit({ durationMs: 100 }),
      makeHit({ durationMs: 200 }),
      makeHit({ durationMs: 300 }),
    ];
    const report = generateReport(hits);
    expect(report.totalRequests).toBe(3);
    expect(report.routes).toHaveLength(1);

    const stats = report.routes[0];
    expect(stats.count).toBe(3);
    expect(stats.avgDurationMs).toBeCloseTo(200, 1);
    expect(stats.minDurationMs).toBe(100);
    expect(stats.maxDurationMs).toBe(300);
  });

  it('separates hits by method', () => {
    const hits = [
      makeHit({ method: 'GET' }),
      makeHit({ method: 'POST' }),
    ];
    const report = generateReport(hits);
    expect(report.routes).toHaveLength(2);
  });

  it('separates hits by route', () => {
    const hits = [
      makeHit({ route: '/api/users' }),
      makeHit({ route: '/api/posts' }),
    ];
    const report = generateReport(hits);
    expect(report.routes).toHaveLength(2);
  });

  it('sorts routes by count descending', () => {
    const hits = [
      makeHit({ route: '/rare' }),
      makeHit({ route: '/popular' }),
      makeHit({ route: '/popular' }),
      makeHit({ route: '/popular' }),
    ];
    const report = generateReport(hits);
    expect(report.routes[0].route).toBe('/popular');
    expect(report.routes[1].route).toBe('/rare');
  });

  it('tracks lastHitAt correctly', () => {
    const early = new Date('2024-01-01T00:00:00Z');
    const late = new Date('2024-01-02T00:00:00Z');
    const hits = [
      makeHit({ timestamp: early }),
      makeHit({ timestamp: late }),
    ];
    const report = generateReport(hits);
    expect(report.routes[0].lastHitAt).toEqual(late);
  });
});

describe('formatReportText', () => {
  it('includes total requests in output', () => {
    const report = generateReport([makeHit()]);
    const text = formatReportText(report);
    expect(text).toContain('Total Requests: 1');
  });

  it('includes route and method in output', () => {
    const report = generateReport([makeHit({ method: 'POST', route: '/api/login' })]);
    const text = formatReportText(report);
    expect(text).toContain('POST');
    expect(text).toContain('/api/login');
  });
});
