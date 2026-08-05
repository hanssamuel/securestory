import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import { authPlugin } from "./auth";
import { authRoutes } from "./auth_routes";
import { projectRoutes } from "./project_routes";
import { findingRoutes } from "./finding_routes";
import { dashboardRoutes } from "./dashboard_routes";

const app = Fastify({ logger: true });

async function start() {
  // ALLOWED_ORIGINS is a comma-separated allowlist (e.g. the deployed
  // frontend's URL). Falls back to reflecting any origin if unset, so this
  // doesn't break the live deployment before that env var exists there --
  // but it should be set in production.
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean);
  if (!allowedOrigins?.length) {
    app.log.warn("ALLOWED_ORIGINS is not set -- CORS is reflecting any origin. Set it in production.");
  }
  await app.register(cors, { origin: allowedOrigins?.length ? allowedOrigins : true });
  await app.register(rateLimit, { max: 200, timeWindow: "1 minute" });

  await app.register(sensible);
  await app.register(authPlugin);
  await authRoutes(app);
  await projectRoutes(app);
  await findingRoutes(app);
  await dashboardRoutes(app);


    app.get("/health", async () => ({
    ok: true,
    service: "securestory-api",
    ts: new Date().toISOString(),
  }));

  app.get("/version", async () => ({
    ok: true,
    service: "securestory-api",
    git_sha: process.env.GIT_SHA ?? null,
  }));

  const port = Number(process.env.PORT ?? 8001);
  const host = "0.0.0.0";

  await app.listen({ port, host });
}

start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});