import { generateDashboardHTML } from './dashboard';
import { RouteHit } from './tracker';

function makeHit(overrides: Partial<RouteHit> = {}): RouteHit {
  return {
    method: 'GET',
    path: '/api/test',
    statusCode: 200,
    durationMs: 42,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('generateDashboardHTML', () => {
  it('returns a valid HTML string', () => {
    const html = generateDashboardHTML([makeHit()]);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  it('includes the default title', () => {
    const html = generateDashboardHTML([]);
    expect(html).toContain('RouteWatch Dashboard');
  });

  it('uses a custom title when provided', () => {
    const html = generateDashboardHTML([], { title: 'My API Monitor' });
    expect(html).toContain('My API Monitor');
  });

  it('shows total hits and unique routes', () => {
    const hits = [
      makeHit({ path: '/users' }),
      makeHit({ path: '/users' }),
      makeHit({ path: '/orders' }),
    ];
    const html = generateDashboardHTML(hits);
    expect(html).toContain('Total hits: <strong>3</strong>');
    expect(html).toContain('Unique routes: <strong>2</strong>');
  });

  it('renders a table row for each unique route', () => {
    const hits = [
      makeHit({ method: 'GET', path: '/ping' }),
      makeHit({ method: 'POST', path: '/data' }),
    ];
    const html = generateDashboardHTML(hits);
    expect(html).toContain('/ping');
    expect(html).toContain('/data');
    expect(html).toContain('POST');
  });

  it('sets the meta refresh interval from options', () => {
    const html = generateDashboardHTML([], { refreshInterval: 10000 });
    expect(html).toContain('content="10"');
  });

  it('displays N/A when durationMs is absent', () => {
    const hit = makeHit({ durationMs: undefined });
    const html = generateDashboardHTML([hit]);
    expect(html).toContain('N/A');
  });
});
