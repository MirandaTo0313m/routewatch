import { sampledRouteWatch } from './express.sampling';
import type { SampledRouteWatchOptions } from './express.sampling';

function makeReq(method = 'GET', path = '/api/test') {
  return { method, path } as any;
}

function makeRes() {
  const res: any = {};
  res.on = jest.fn();
  return res;
}

describe('sampledRouteWatch', () => {
  it('throws when sampling config is invalid', () => {
    expect(() =>
      sampledRouteWatch({ sampling: { rate: 2 } } as SampledRouteWatchOptions)
    ).toThrow();
  });

  it('always calls next (skipping tracking) when rate is 0', () => {
    const mw = sampledRouteWatch({
      sampling: { rate: 0 },
    } as SampledRouteWatchOptions);

    const next = jest.fn();
    mw(makeReq(), makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('passes through to inner middleware when rate is 1', () => {
    const innerNext = jest.fn();
    const mw = sampledRouteWatch({
      sampling: { rate: 1 },
    } as SampledRouteWatchOptions);

    const res = makeRes();
    mw(makeReq(), res, innerNext);
    // res.on is called by routeWatch to listen for finish event
    expect(res.on).toHaveBeenCalled();
  });

  it('respects route override to skip a specific route', () => {
    const mw = sampledRouteWatch({
      sampling: {
        rate: 1,
        routeOverrides: { 'GET /health': 0 },
      },
    } as SampledRouteWatchOptions);

    const next = jest.fn();
    const res = makeRes();
    mw(makeReq('GET', '/health'), res, next);

    // Should skip tracking (next called, res.on not called)
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.on).not.toHaveBeenCalled();
  });

  it('tracks non-overridden routes at full rate', () => {
    const mw = sampledRouteWatch({
      sampling: {
        rate: 1,
        routeOverrides: { 'GET /health': 0 },
      },
    } as SampledRouteWatchOptions);

    const next = jest.fn();
    const res = makeRes();
    mw(makeReq('POST', '/api/data'), res, next);

    expect(res.on).toHaveBeenCalled();
  });
});
