import Fastify, { FastifyInstance } from "fastify";
import { fastifyRateLimitWatch, clearHitStore } from "./fastify.ratelimit";

async function buildApp(
  options: Parameters<typeof fastifyRateLimitWatch>[1] = {}
): Promise<FastifyInstance> {
  const app = Fastify();
  await app.register(fastifyRateLimitWatch, options);
  app.get("/api/data", async () => ({ ok: true }));
  app.get("/health", async () => ({ status: "up" }));
  await app.ready();
  return app;
}

/** Helper to fire `count` requests to `url` on `app` sequentially. */
async function fireRequests(
  app: FastifyInstance,
  url: string,
  count: number
): Promise<void> {
  for (let i = 0; i < count; i++) {
    await app.inject({ method: "GET", url });
  }
}

beforeEach(() => {
  clearHitStore();
});

describe("fastifyRateLimitWatch", () => {
  it("allows requests under the rate limit", async () => {
    const app = await buildApp({ maxRequests: 5, windowMs: 60_000 });
    const res = await app.inject({ method: "GET", url: "/api/data" });
    expect(res.statusCode).toBe(200);
  });

  it("blocks requests when blockOnViolation is true and limit exceeded", async () => {
    const app = await buildApp({
      maxRequests: 2,
      windowMs: 60_000,
      blockOnViolation: true,
    });

    await fireRequests(app, "/api/data", 2);
    const res = await app.inject({ method: "GET", url: "/api/data" });

    expect(res.statusCode).toBe(429);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe("Too Many Requests");
  });

  it("calls onViolation callback when limit exceeded", async () => {
    const violations: string[] = [];
    const app = await buildApp({
      maxRequests: 1,
      windowMs: 60_000,
      blockOnViolation: false,
      onViolation: (msg) => violations.push(msg),
    });

    await fireRequests(app, "/api/data", 2);

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]).toMatch(/GET/);
  });

  it("ignores routes in the ignore list", async () => {
    const violations: string[] = [];
    const app = await buildApp({
      maxRequests: 1,
      windowMs: 60_000,
      ignore: ["/health"],
      onViolation: (msg) => violations.push(msg),
    });

    await fireRequests(app, "/health", 5);

    expect(violations.length).toBe(0);
  });

  it("does not block when blockOnViolation is false", async () => {
    const app = await buildApp({
      maxRequests: 1,
      windowMs: 60_000,
      blockOnViolation: false,
    });

    await fireRequests(app, "/api/data", 1);
    const res = await app.inject({ method: "GET", url: "/api/data" });
    expect(res.statusCode).toBe(200);
  });
});
