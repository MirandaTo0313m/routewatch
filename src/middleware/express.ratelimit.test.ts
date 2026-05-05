import { rateLimitWatch, clearHitStore, defaultKey } from './express.ratelimit';
import { Request, Response, NextFunction } from 'express';

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    path: '/test',
    ip: '127.0.0.1',
    ...overrides,
  } as Request;
}

function makeRes(): Response {
  return {} as Response;
}

function makeNext(): NextFunction {
  return jest.fn();
}

beforeEach(() => {
  clearHitStore();
});

describe('defaultKey', () => {
  it('returns ip:method:path', () => {
    const req = makeReq();
    expect(defaultKey(req)).toBe('127.0.0.1:GET:/test');
  });
});

describe('rateLimitWatch', () => {
  it('calls next() when under the limit', () => {
    const middleware = rateLimitWatch({ windowMs: 1000, maxRequests: 5 });
    const req = makeReq();
    const res = makeRes();
    const next = makeNext();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('blocks request when limit is exceeded', () => {
    const middleware = rateLimitWatch({ windowMs: 60000, maxRequests: 2 });
    const req = makeReq();
    const res = makeRes() as any;
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn().mockReturnThis();
    const next = makeNext();

    middleware(req, res, next);
    middleware(req, res, next);
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('resets count after windowMs', async () => {
    const middleware = rateLimitWatch({ windowMs: 50, maxRequests: 1 });
    const req = makeReq();
    const res = makeRes() as any;
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn().mockReturnThis();
    const next = makeNext();

    middleware(req, res, next);
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    await new Promise((r) => setTimeout(r, 60));
    clearHitStore();

    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('uses custom key function', () => {
    const middleware = rateLimitWatch({
      windowMs: 60000,
      maxRequests: 1,
      keyFn: () => 'global',
    });
    const req1 = makeReq({ ip: '1.1.1.1' } as any);
    const req2 = makeReq({ ip: '2.2.2.2' } as any);
    const res = makeRes() as any;
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn().mockReturnThis();
    const next = makeNext();

    middleware(req1, res, next);
    middleware(req2, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
