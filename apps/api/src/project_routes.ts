import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { query } from "./db";

const ProjectSchema = z.object({
  slug: z.string().min(2),
  name: z.string().min(2),
});

export async function projectRoutes(app: FastifyInstance) {
  app.get("/projects", { preHandler: [(app as any).authenticate] }, async () => {
    const res = await query(
      "SELECT id, slug, name, created_at FROM projects ORDER BY created_at DESC"
    );
    return { projects: res.rows };
  });

  app.post(
    "/projects",
    {
      preHandler: [
        (app as any).authenticate,
        async (req) => {
          if (!["admin", "analyst"].includes(req.authUser!.role)) {
            throw app.httpErrors.forbidden();
          }
        },
      ],
    },
    async (req, reply) => {
      const body = ProjectSchema.parse(req.body);

      const existing = await query("SELECT id FROM projects WHERE slug = $1", [body.slug]);
      if (existing.rows.length) return reply.code(409).send({ error: "Project already exists" });

      const inserted = await query(
        "INSERT INTO projects(slug, name) VALUES ($1,$2) RETURNING id, slug, name, created_at",
        [body.slug, body.name]
      );

      return reply.code(201).send({ project: inserted.rows[0] });
    }
  );
}
