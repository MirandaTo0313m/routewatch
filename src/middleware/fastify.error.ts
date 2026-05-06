import { FastifyPluginCallback, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { trackHit, RouteHit } from "../tracker";

export interface FastifyErrorWatchOptions {
  ignore?: string[];
  onError?: (hit: RouteHit) => void;
}

const fastifyErrorWatch: FastifyPluginCallback<FastifyErrorWatchOptions> = (
  fastify,
  options,
  done
) => {
  const { ignore = [], onError } = options;

  fastify.addHook(
    "onResponse",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const path = request.routerPath ?? request.url;

      if (ignore.some((p) => path.startsWith(p))) {
        return;
      }

      const hit: RouteHit = {
        route: path,
        method: request.method,
        statusCode: reply.statusCode,
        duration: Math.round(reply.getResponseTime()),
        timestamp: Date.now(),
      };

      trackHit(hit);

      if (reply.statusCode >= 400 && onError) {
        onError(hit);
      }
    }
  );

  done();
};

export default fp(fastifyErrorWatch, {
  fastify: "4.x",
  name: "fastify-error-watch",
});
