/**
 * Express middleware that integrates sampling with routeWatch.
 * Wraps the core routeWatch middleware to apply sampling before tracking.
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { routeWatch } from './express';
import { shouldSample, SamplingConfig, validateSamplingConfig } from '../sampling';
import type { RouteWatchOptions } from './express';

export interface SampledRouteWatchOptions extends RouteWatchOptions {
  sampling: SamplingConfig;
}

/**
 * Returns an Express middleware that only tracks requests passing the
 * sampling filter, then delegates to the standard routeWatch middleware.
 *
 * @param options - RouteWatch options extended with a `sampling` configuration.
 *   The `sampling` field must be a valid {@link SamplingConfig}; an error is
 *   thrown at setup time if the config is invalid so misconfiguration is caught
 *   early rather than at request time.
 * @returns An Express {@link RequestHandler} that skips tracking for requests
 *   excluded by the sampler and forwards all others to the inner routeWatch
 *   middleware.
 *
 * @example
 * app.use(
 *   sampledRouteWatch({
 *     sampling: { rate: 0.1, excludePaths: ['/healthz'] },
 *   })
 * );
 */
export function sampledRouteWatch(
  options: SampledRouteWatchOptions
): RequestHandler {
  validateSamplingConfig(options.sampling);

  const inner = routeWatch(options);

  return function routeWatchSampled(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const method = req.method ?? 'GET';
    const path = req.path ?? '/';

    if (!shouldSample(method, path, options.sampling)) {
      return next();
    }

    inner(req, res, next);
  };
}
