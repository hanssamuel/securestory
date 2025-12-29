import "dotenv/config";
import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

type Role = "admin" | "analyst" | "viewer";

declare module "fastify" {
  interface FastifyRequest {
    authUser?: { id: string; email: string; role: Role };
  }
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is missing in .env");

  await app.register((await import("@fastify/jwt")).default, { secret });

  app.decorate("authenticate", async (req: FastifyRequest) => {
    try {
      const payload = await req.jwtVerify<{ id: string; email: string; role: Role }>();
      req.authUser = payload;
    } catch {
      // Keep message simple (security)
      throw app.httpErrors.unauthorized("Unauthorized");
    }
  });
});

export function requireRole(...roles: Role[]) {
  return async (req: FastifyRequest) => {
    const u = req.authUser;
    if (!u) throw new Error("Missing authUser");
    if (!roles.includes(u.role)) {
      throw (req as any).server.httpErrors.forbidden("Forbidden");
    }
  };
}
