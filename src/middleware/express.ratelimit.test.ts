import { rateLimitWatch, clearHitStore, defaultKey } from './express.ratelimit';
import { Request, Response, NextFunction } from 'express';

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    path: '/api/test',
    ip: '127.0.0.1',
    ...overrides,
  } as unknown as Request;
}

function makeRes(statusCode = 200): Response {
  return { statusCode } as unknown as Response;
}

function makeNext(): NextFunction {
  return jest.fn() as unknown as NextFunction;
}

beforeEach(() => {
  clearHitStore();
});

describe('defaultKey', () => {
  it('returns a composite key from ip, method, and path', () => {
    const req = makeReq();
    expect(defaultKey(req)).toBe('127.0.0.1:GET:/api/test');
  });
});

describe('rateLimitWatch middleware', () => {
  it('calls next for normal requests', () => {
    const middleware = rateLimitWatch({ maxRequests: 5 });
    const next = makeNext();
    middleware(makeReq(), makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('ignores paths matching ignore list', () => {
    const middleware = rateLimitWatch({ ignore: ['/health'] });
    const next = makeNext();
    middleware(makeReq({ path: '/health' } as Partial<Request>), makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('triggers onViolation when requests exceed maxRequests', () => {
    const onViolation = jest.fn();
    const middleware = rateLimitWatch({ maxRequests: 2, windowMs: 60_000, onViolation });
    const req = makeReq();
    const res = makeRes();

    middleware(req, res, makeNext());
    middleware(req, res, makeNext());
    middleware(req, res, makeNext()); // 3rd — should trigger

    expect(onViolation).toHaveBeenCalled();
  });

  it('does not trigger onViolation within limit', () => {
    const onViolation = jest.fn();
    const middleware = rateLimitWatch({ maxRequests: 10, onViolation });
    const req = makeReq();
    const res = makeRes();

    for (let i = 0; i < 5; i++) {
      middleware(req, res, makeNext());
    }

    expect(onViolation).not.toHaveBeenCalled();
  });

  it('resets count after window expires', () => {
    jest.useFakeTimers();
    const onViolation = jest.fn();
    const middleware = rateLimitWatch({ maxRequests: 2, windowMs: 1000, onViolation });
    const req = makeReq();
    const res = makeRes();

    middleware(req, res, makeNext());
    middleware(req, res, makeNext());
    middleware(req, res, makeNext()); // triggers

    jest.advanceTimersByTime(2000);
    clearHitStore();

    middleware(req, res, makeNext()); // new window, no violation
    expect(onViolation).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
