import { FastifyPluginCallback, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { trackHit } from "../tracker";
import { detectRateLimitViolations, formatViolationMessage } from "../ratelimit";
import { shouldIgnore } from "./fastify";

export interface FastifyRateLimitWatchOptions {
  ignore?: string[];
  windowMs?: number;
  maxRequests?: number;
  onViolation?: (message: string) => void;
  blockOnViolation?: boolean;
}

const hitStore: Map<string, { count: number; resetAt: number }> = new Map();

export function clearHitStore(): void {
  hitStore.clear();
}

const rateLimitWatchPlugin: FastifyPluginCallback<FastifyRateLimitWatchOptions> = (
  fastify,
  options,
  done
) => {
  const {
    ignore = [],
    windowMs = 60_000,
    maxRequests = 100,
    onViolation = (msg: string) => console.warn(msg),
    blockOnViolation = false,
  } = options;

  fastify.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    const method = request.method;
    const route = request.routerPath ?? request.url;

    if (shouldIgnore(route, ignore)) return;

    const key = `${method}:${route}`;
    const now = Date.now();
    const entry = hitStore.get(key);

    if (!entry || now > entry.resetAt) {
      hitStore.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      entry.count += 1;
    }

    const current = hitStore.get(key)!;

    const hits = Array.from({ length: current.count }, (_, i) => ({
      method,
      route,
      statusCode: 200,
      durationMs: 0,
      timestamp: now - i,
    }));

    const violations = detectRateLimitViolations(hits, { windowMs, maxRequests });

    if (violations.length > 0) {
      const message = formatViolationMessage(violations[0]);
      onViolation(message);

      if (blockOnViolation) {
        reply.status(429).send({ error: "Too Many Requests", message });
        return;
      }
    }

    trackHit({ method, route, statusCode: 200, durationMs: 0, timestamp: now });
  });

  done();
};

export const fastifyRateLimitWatch = fp(rateLimitWatchPlugin, {
  fastify: "4.x",
  name: "fastify-ratelimit-watch",
});
