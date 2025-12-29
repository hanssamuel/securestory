import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { query } from "./db";

const Q = z.object({
  project: z.string().optional(),
  days: z.coerce.number().int().min(1).max(365).default(30),
});

const weights: Record<string, number> = {
  critical: 10,
  high: 6,
  medium: 3,
  low: 1,
};

export async function dashboardRoutes(app: FastifyInstance) {
  // Counts by severity for OPEN findings in last N days
  app.get(
    "/dash/severity_counts",
    { preHandler: [(app as any).authenticate] },
    async (req) => {
      const q = Q.parse(req.query);

      const params: any[] = [q.days];
      let projectJoin = "";
      let projectWhere = "";

      if (q.project) {
        params.push(q.project);
        projectJoin = "JOIN projects p ON p.id = f.project_id";
        projectWhere = "AND p.slug = $2";
      }

      const res = await query<{ severity: string; count: string }>(
        `
        SELECT f.severity, COUNT(*)::text as count
        FROM findings f
        ${projectJoin}
        WHERE f.status = 'open'
          AND f.first_seen >= NOW() - ($1::int || ' days')::interval
          ${projectWhere}
        GROUP BY f.severity
        `,
        params
      );

      // Fill missing severities with 0
      const out: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
      for (const r of res.rows) out[r.severity] = Number(r.count);

      return { days: q.days, project: q.project ?? null, counts: out };
    }
  );

  // Risk score over time (daily buckets) for last N days
  app.get(
    "/dash/risk_score",
    { preHandler: [(app as any).authenticate] },
    async (req) => {
      const q = Q.parse(req.query);

      const params: any[] = [q.days];
      let projectJoin = "";
      let projectWhere = "";

      if (q.project) {
        params.push(q.project);
        projectJoin = "JOIN projects p ON p.id = f.project_id";
        projectWhere = "AND p.slug = $2";
      }

      // We count "open findings" by day (based on first_seen day).
      // Simple MVP view: risk score = Σ(count(sev) * weight).
      const res = await query<{ day: string; severity: string; count: string }>(
        `
        SELECT date_trunc('day', f.first_seen) as day, f.severity, COUNT(*)::text as count
        FROM findings f
        ${projectJoin}
        WHERE f.status = 'open'
          AND f.first_seen >= NOW() - ($1::int || ' days')::interval
          ${projectWhere}
        GROUP BY 1, 2
        ORDER BY 1 ASC
        `,
        params
      );

      const byDay = new Map<string, { day: string; risk_score: number; breakdown: Record<string, number> }>();

      for (const r of res.rows) {
        const day = new Date(r.day).toISOString().slice(0, 10);
        const sev = r.severity;
        const c = Number(r.count);

        if (!byDay.has(day)) {
          byDay.set(day, { day, risk_score: 0, breakdown: { critical: 0, high: 0, medium: 0, low: 0 } });
        }

        const row = byDay.get(day)!;
        row.breakdown[sev] = (row.breakdown[sev] ?? 0) + c;
        row.risk_score += c * (weights[sev] ?? 0);
      }

      return {
        days: q.days,
        project: q.project ?? null,
        series: Array.from(byDay.values()),
      };
    }
  );

  // MTTR: mean time to remediate in hours (resolved findings only)
  app.get(
    "/dash/mttr",
    { preHandler: [(app as any).authenticate] },
    async (req) => {
      const q = Q.parse(req.query);

      const params: any[] = [q.days];
      let projectJoin = "";
      let projectWhere = "";

      if (q.project) {
        params.push(q.project);
        projectJoin = "JOIN projects p ON p.id = f.project_id";
        projectWhere = "AND p.slug = $2";
      }

      const res = await query<{ mttr_hours: number | null; resolved_count: string }>(
        `
        SELECT
          AVG(EXTRACT(EPOCH FROM (f.resolved_at - f.first_seen)) / 3600.0) as mttr_hours,
          COUNT(*)::text as resolved_count
        FROM findings f
        ${projectJoin}
        WHERE f.status = 'resolved'
          AND f.resolved_at IS NOT NULL
          AND f.resolved_at >= NOW() - ($1::int || ' days')::interval
          ${projectWhere}
        `,
        params
      );

      return {
        days: q.days,
        project: q.project ?? null,
        resolved_count: Number(res.rows[0]?.resolved_count ?? 0),
        mttr_hours: res.rows[0]?.mttr_hours ?? null,
      };
    }
  );
}
