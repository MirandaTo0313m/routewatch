import Fastify from 'fastify';
import { sampledFastifyRouteWatch } from './fastify.sampling';
import { getHits, clearHits } from '../tracker';

beforeEach(() => {
  clearHits();
});

function buildApp(options: Parameters<typeof sampledFastifyRouteWatch>[1]) {
  const app = Fastify();
  app.register(sampledFastifyRouteWatch, options);
  app.get('/api/test', async (_req, _reply) => ({ ok: true }));
  app.get('/health', async (_req, _reply) => ({ status: 'up' }));
  return app;
}

describe('sampledFastifyRouteWatch', () => {
  it('tracks hits when sample rate is 1', async () => {
    const app = buildApp({ sampling: { rate: 1 } });
    await app.inject({ method: 'GET', url: '/api/test' });
    await app.inject({ method: 'GET', url: '/api/test' });
    expect(getHits().length).toBe(2);
  });

  it('tracks no hits when sample rate is 0', async () => {
    const app = buildApp({ sampling: { rate: 0 } });
    await app.inject({ method: 'GET', url: '/api/test' });
    await app.inject({ method: 'GET', url: '/api/test' });
    expect(getHits().length).toBe(0);
  });

  it('ignores specified routes', async () => {
    const app = buildApp({ sampling: { rate: 1 }, ignore: ['/health'] });
    await app.inject({ method: 'GET', url: '/health' });
    await app.inject({ method: 'GET', url: '/api/test' });
    const hits = getHits();
    expect(hits.length).toBe(1);
    expect(hits[0].url).toBe('/api/test');
  });

  it('throws on invalid sampling config', () => {
    expect(() =>
      buildApp({ sampling: { rate: 2 } })
    ).toThrow('[routewatch] Invalid sampling config');
  });

  it('records correct method and status code', async () => {
    const app = buildApp({ sampling: { rate: 1 } });
    await app.inject({ method: 'GET', url: '/api/test' });
    const hits = getHits();
    expect(hits[0].method).toBe('GET');
    expect(hits[0].statusCode).toBe(200);
  });

  it('records duration as a non-negative number', async () => {
    const app = buildApp({ sampling: { rate: 1 } });
    await app.inject({ method: 'GET', url: '/api/test' });
    const hits = getHits();
    expect(hits[0].duration).toBeGreaterThanOrEqual(0);
  });

  it('strips query strings from tracked url', async () => {
    const app = buildApp({ sampling: { rate: 1 } });
    await app.inject({ method: 'GET', url: '/api/test?foo=bar' });
    const hits = getHits();
    expect(hits[0].url).toBe('/api/test');
  });
});
