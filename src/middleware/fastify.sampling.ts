import { FastifyPluginCallback, FastifyRequest, FastifyReply } from 'fastify';
import { trackHit } from '../tracker';
import { shouldSample, validateSamplingConfig, SamplingConfig } from '../sampling';
import { shouldIgnore } from './fastify';

export interface SampledFastifyRouteWatchOptions {
  sampling: SamplingConfig;
  ignore?: string[];
}

export const sampledFastifyRouteWatch: FastifyPluginCallback<SampledFastifyRouteWatchOptions> = (
  fastify,
  options,
  done
) => {
  const { sampling, ignore = [] } = options;

  const configError = validateSamplingConfig(sampling);
  if (configError) {
    throw new Error(`[routewatch] Invalid sampling config: ${configError}`);
  }

  fastify.addHook('onRequest', async (request: FastifyRequest, _reply: FastifyReply) => {
    const method = request.method;
    const url = request.url.split('?')[0];

    if (shouldIgnore(url, ignore)) return;
    if (!shouldSample(sampling)) return;

    request.routewatchStart = Date.now();
  });

  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.routewatchStart === undefined) return;

    const method = request.method;
    const url = request.url.split('?')[0];
    const statusCode = reply.statusCode;
    const duration = Date.now() - request.routewatchStart;

    trackHit({ method, url, statusCode, duration, timestamp: Date.now() });
  });

  done();
};

declare module 'fastify' {
  interface FastifyRequest {
    routewatchStart?: number;
  }
}
