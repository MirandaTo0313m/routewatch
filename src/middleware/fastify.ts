import { FastifyPluginCallback, FastifyRequest, FastifyReply } from 'fastify';
import { trackHit } from '../tracker';

export interface RouteWatchFastifyOptions {
  ignore?: string[];
  slowThresholdMs?: number;
}

const defaultIgnore = ['/health', '/ping', '/favicon.ico'];

export function shouldIgnore(path: string, ignore: string[]): boolean {
  return ignore.some((pattern) => {
    if (pattern.endsWith('*')) {
      return path.startsWith(pattern.slice(0, -1));
    }
    return path === pattern;
  });
}

export const routeWatchFastify = (
  options: RouteWatchFastifyOptions = {}
): FastifyPluginCallback => {
  const ignore = [...defaultIgnore, ...(options.ignore ?? [])];
  const slowThresholdMs = options.slowThresholdMs ?? 1000;

  return (fastify, _opts, done) => {
    fastify.addHook(
      'onRequest',
      (request: FastifyRequest, _reply: FastifyReply, hookDone) => {
        (request as any)._routeWatchStart = Date.now();
        hookDone();
      }
    );

    fastify.addHook(
      'onResponse',
      (request: FastifyRequest, reply: FastifyReply, hookDone) => {
        const path = request.routerPath ?? request.url;
        const method = request.method;

        if (!shouldIgnore(path, ignore)) {
          const start = (request as any)._routeWatchStart ?? Date.now();
          const durationMs = Date.now() - start;
          const slow = durationMs >= slowThresholdMs;

          trackHit({
            method,
            path,
            statusCode: reply.statusCode,
            durationMs,
            slow,
            timestamp: new Date().toISOString(),
          });
        }

        hookDone();
      }
    );

    done();
  };
};
