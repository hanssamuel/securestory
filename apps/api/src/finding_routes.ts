import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { query } from "./db";

const FindingSchema = z.object({
  project_slug: z.string(),
  tool: z.string(),
  type: z.string(),
  severity: z.enum(["critical", "high", "medium", "low"]),
  title: z.string().min(2),
});

export async function findingRoutes(app: FastifyInstance) {
  app.post(
    "/findings/ingest",
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
      const body = FindingSchema.parse(req.body);

      const proj = await query<{ id: string }>(
        "SELECT id FROM projects WHERE slug = $1",
        [body.project_slug]
      );
      if (!proj.rows.length) return reply.code(404).send({ error: "Project not found" });

      await query(
        `INSERT INTO findings(project_id, tool, type, severity, title)
         VALUES ($1,$2,$3,$4,$5)`,
        [proj.rows[0].id, body.tool, body.type, body.severity, body.title]
      );

      return reply.code(201).send({ ok: true });
    }
  );

  
  app.post(
    "/findings/:id/resolve",
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
      const id = (req.params as any).id as string;

      const updated = await query(
        `UPDATE findings
         SET status = 'resolved',
             resolved_at = NOW()
         WHERE id = $1
         RETURNING id, status, resolved_at`,
        [id]
      );

      if (!updated.rows.length) return reply.code(404).send({ error: "Finding not found" });

      return reply.send({ finding: updated.rows[0] });
    }
  );

  app.get("/findings", { preHandler: [(app as any).authenticate] }, async () => {
    const res = await query(
      `SELECT f.id, p.slug as project, f.tool, f.type, f.severity, f.title, f.status, f.first_seen
       FROM findings f
       JOIN projects p ON p.id = f.project_id
       ORDER BY f.first_seen DESC`
    );
    return { findings: res.rows };
  });
}
