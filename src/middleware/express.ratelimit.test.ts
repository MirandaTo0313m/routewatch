import { clearHitStore, rateLimitWatch } from './express.ratelimit';
import type { Request, Response, NextFunction } from 'express';

function makeReq(method = 'GET', path = '/api/test', ip = '127.0.0.1'): Partial<Request> {
  return { method, path, ip };
}

function makeRes(statusCode = 200): Partial<Response> {
  const res: Partial<Response> = { statusCode };
  return res;
}

function makeNext(): NextFunction {
  return jest.fn();
}

describe('rateLimitWatch middleware', () => {
  beforeEach(() => {
    clearHitStore();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls next() for requests under the limit', () => {
    const middleware = rateLimitWatch({ maxRequests: 5, windowMs: 60000 });
    const req = makeReq();
    const res = makeRes();
    const next = makeNext();

    middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('tracks multiple requests from the same IP', () => {
    const middleware = rateLimitWatch({ maxRequests: 3, windowMs: 60000 });
    const req = makeReq('GET', '/api/data', '10.0.0.1');
    const res = makeRes();

    for (let i = 0; i < 3; i++) {
      const next = makeNext();
      middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledTimes(1);
    }
  });

  it('blocks requests exceeding the limit', () => {
    const onViolation = jest.fn();
    const middleware = rateLimitWatch({ maxRequests: 2, windowMs: 60000, onViolation });
    const req = makeReq('POST', '/api/submit', '192.168.1.1');
    const res = makeRes();

    for (let i = 0; i < 3; i++) {
      middleware(req as Request, res as Response, makeNext());
    }

    expect(onViolation).toHaveBeenCalledTimes(1);
    expect(onViolation).toHaveBeenCalledWith(
      expect.objectContaining({ ip: '192.168.1.1', count: 3 })
    );
  });

  it('resets counts after the window expires', () => {
    const middleware = rateLimitWatch({ maxRequests: 2, windowMs: 5000 });
    const req = makeReq('GET', '/api/reset', '172.16.0.1');
    const res = makeRes();

    middleware(req as Request, res as Response, makeNext());
    middleware(req as Request, res as Response, makeNext());

    jest.advanceTimersByTime(6000);

    const next = makeNext();
    middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('treats different IPs independently', () => {
    const onViolation = jest.fn();
    const middleware = rateLimitWatch({ maxRequests: 1, windowMs: 60000, onViolation });
    const res = makeRes();

    middleware(makeReq('GET', '/api/x', '1.1.1.1') as Request, res as Response, makeNext());
    middleware(makeReq('GET', '/api/x', '2.2.2.2') as Request, res as Response, makeNext());

    expect(onViolation).not.toHaveBeenCalled();
  });
});
