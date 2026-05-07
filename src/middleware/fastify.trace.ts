import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { v4 as uuidv4 } from "uuid";
import { TraceHit } from "../tracereport";

export interface FastifyTraceOptions {
  ignore?: string[];
  resolveTraceId?: (req: FastifyRequest) => string;
  onHit?: (hit: TraceHit) => void;
}

const traceHitStore: TraceHit[] = [];

export function getTraceHits(): TraceHit[] {
  return [...traceHitStore];
}

export function clearTraceHitStore(): void {
  traceHitStore.length = 0;
}

const fastifyTracePlugin: FastifyPluginAsync<FastifyTraceOptions> = async (
  fastify,
  options
) => {
  const {
    ignore = [],
    resolveTraceId = (req) =>
      (req.headers["x-trace-id"] as string) || uuidv4(),
    onHit,
  } = options;

  fastify.addHook(
    "onRequest",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const path = req.url.split("?")[0];
      if (ignore.some((p) => path.startsWith(p))) return;

      const traceId = resolveTraceId(req);
      const spanId = uuidv4();
      (req as any).__traceId = traceId;
      (req as any).__spanId = spanId;
      (req as any).__traceStart = Date.now();

      reply.header("x-trace-id", traceId);
      reply.header("x-span-id", spanId);
    }
  );

  fastify.addHook(
    "onResponse",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const traceId = (req as any).__traceId;
      if (!traceId) return;

      const hit: TraceHit = {
        method: req.method,
        route: req.routerPath ?? req.url.split("?")[0],
        traceId,
        spanId: (req as any).__spanId,
        durationMs: Date.now() - (req as any).__traceStart,
        statusCode: reply.statusCode,
        timestamp: Date.now(),
      };

      traceHitStore.push(hit);
      onHit?.(hit);
    }
  );
};

export default fp(fastifyTracePlugin, {
  name: "routewatch-trace",
});
