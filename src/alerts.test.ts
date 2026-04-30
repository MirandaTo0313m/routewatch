import { evaluateAlerts, formatAlertMessage, AlertRule } from './alerts';
import { RouteHit } from './tracker';

const BASE_TIME = new Date('2024-01-01T12:00:00Z');

function makeHit(
  overrides: Partial<RouteHit> = {}
): RouteHit {
  return {
    route: '/api/test',
    method: 'GET',
    statusCode: 200,
    timestamp: BASE_TIME.toISOString(),
    durationMs: 50,
    ...overrides,
  };
}

describe('evaluateAlerts', () => {
  it('triggers count alert when threshold exceeded', () => {
    const hits = Array.from({ length: 10 }, () => makeHit());
    const rules: AlertRule[] = [
      { type: 'count', threshold: 5, windowMs: 60_000 },
    ];
    const events = evaluateAlerts(hits, rules, BASE_TIME);
    expect(events).toHaveLength(1);
    expect(events[0].value).toBe(10);
  });

  it('does not trigger count alert below threshold', () => {
    const hits = Array.from({ length: 3 }, () => makeHit());
    const rules: AlertRule[] = [
      { type: 'count', threshold: 5, windowMs: 60_000 },
    ];
    const events = evaluateAlerts(hits, rules, BASE_TIME);
    expect(events).toHaveLength(0);
  });

  it('triggers errorRate alert', () => {
    const hits = [
      makeHit({ statusCode: 500 }),
      makeHit({ statusCode: 500 }),
      makeHit({ statusCode: 200 }),
      makeHit({ statusCode: 200 }),
    ];
    const rules: AlertRule[] = [
      { type: 'errorRate', threshold: 40, windowMs: 60_000 },
    ];
    const events = evaluateAlerts(hits, rules, BASE_TIME);
    expect(events).toHaveLength(1);
    expect(events[0].value).toBe(50);
  });

  it('triggers latency alert', () => {
    const hits = [
      makeHit({ durationMs: 200 }),
      makeHit({ durationMs: 400 }),
    ];
    const rules: AlertRule[] = [
      { type: 'latency', threshold: 250, windowMs: 60_000 },
    ];
    const events = evaluateAlerts(hits, rules, BASE_TIME);
    expect(events).toHaveLength(1);
    expect(events[0].value).toBe(300);
  });

  it('filters hits outside time window', () => {
    const oldHit = makeHit({
      timestamp: new Date('2024-01-01T11:58:00Z').toISOString(),
    });
    const hits = Array.from({ length: 5 }, () => oldHit);
    const rules: AlertRule[] = [
      { type: 'count', threshold: 3, windowMs: 60_000 },
    ];
    const events = evaluateAlerts(hits, rules, BASE_TIME);
    expect(events).toHaveLength(0);
  });

  it('respects route and method filters', () => {
    const hits = [
      ...Array.from({ length: 6 }, () => makeHit({ route: '/api/users', method: 'POST' })),
      ...Array.from({ length: 6 }, () => makeHit({ route: '/api/items', method: 'GET' })),
    ];
    const rules: AlertRule[] = [
      { route: '/api/users', method: 'POST', type: 'count', threshold: 5, windowMs: 60_000 },
    ];
    const events = evaluateAlerts(hits, rules, BASE_TIME);
    expect(events).toHaveLength(1);
    expect(events[0].route).toBe('/api/users');
  });
});

describe('formatAlertMessage', () => {
  it('formats alert message correctly', () => {
    const event = {
      rule: { type: 'count' as const, threshold: 5, windowMs: 60_000 },
      route: '/api/test',
      method: 'GET',
      value: 10,
      triggeredAt: BASE_TIME,
    };
    const msg = formatAlertMessage(event);
    expect(msg).toContain('[ALERT]');
    expect(msg).toContain('GET /api/test');
    expect(msg).toContain('count=10.00');
    expect(msg).toContain('threshold=5');
  });
});
