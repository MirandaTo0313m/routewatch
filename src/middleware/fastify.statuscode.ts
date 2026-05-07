import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { StatusCodeHit, getStatusCodeHits, clearStatusCodeHitStore } from "./express.statuscode";
import { recordHit } from "../tracker";

const statusCodeHitStoreFastify: StatusCodeHit[] = [];

export { getStatusCodeHits, clearStatusCodeHitStore };

export interface FastifyStatusCodeOptions {
  ignore?: string[];
}

async function statusCodePlugin(
  fastify: FastifyInstance,
  options: FastifyStatusCodeOptions
): Promise<void> {
  const ignore = options.ignore ?? ["/health", "/favicon.ico"];

  fastify.addHook("onRequest", async (request: FastifyRequest, _reply: FastifyReply) => {
    (request as any)._statusCodeStart = Date.now();
  });

  fastify.addHook("onResponse", async (request: FastifyRequest, reply: FastifyReply) => {
    const url = request.url.split("?")[0];
    if (ignore.some((p) => url.startsWith(p))) return;

    const start = (request as any)._statusCodeStart ?? Date.now();
    const durationMs = Date.now() - start;
    const route = (request.routerPath as string) ?? url;
    const hit: StatusCodeHit = {
      route,
      method: request.method,
      statusCode: reply.statusCode,
      timestamp: Date.now(),
      durationMs,
    };
    statusCodeHitStoreFastify.push(hit);
    recordHit({ route, method: request.method, statusCode: reply.statusCode, durationMs, timestamp: hit.timestamp });
  });
}

export const fastifyStatusCodeWatch = fp(statusCodePlugin, {
  fastify: "4.x",
  name: "routewatch-statuscode",
});
