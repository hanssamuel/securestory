import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { z } from "zod";
import { query } from "./db";

type Role = "admin" | "analyst" | "viewer";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "analyst", "viewer"]).default("viewer"),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
    // TEMP: seed admin user (REMOVE AFTER USE)
      await query(
      `INSERT INTO users(email, password_hash, role)
       VALUES ($1,$2,'admin')
       ON CONFLICT (email)
       DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [email, password_hash]
    );

    return reply.send({ ok: true, email });
  });

  // DEV MODE: allow first user creation without auth if no users exist
  app.post("/auth/register", async (req, reply) => {
    const body = RegisterSchema.parse(req.body);

    const existing = await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [body.email]);
    if (existing.rows.length) return reply.code(409).send({ error: "Email already exists" });

    const count = await query<{ c: string }>("SELECT COUNT(*)::text as c FROM users");
    const userCount = int(count.rows[0].c);

    // If users already exist, require admin
    if (userCount > 0) {
      await (app as any).authenticate(req);
      if (req.authUser?.role !== "admin") return reply.code(403).send({ error: "Forbidden" });
    }

    const password_hash = await bcrypt.hash(body.password, 12);

    const inserted = await query<{ id: string; email: string; role: Role }>(
      "INSERT INTO users(email, password_hash, role) VALUES ($1,$2,$3) RETURNING id, email, role",
      [body.email.toLowerCase(), password_hash, body.role]
    );

    return reply.code(201).send({ user: inserted.rows[0] });
  });

  app.post("/auth/login", async (req, reply) => {
    const body = LoginSchema.parse(req.body);

    const res = await query<{ id: string; email: string; password_hash: string; role: Role }>(
      "SELECT id, email, password_hash, role FROM users WHERE email = $1",
      [body.email.toLowerCase()]
    );

    if (!res.rows.length) return reply.code(401).send({ error: "Invalid credentials" });

    const user = res.rows[0];
    const ok = await bcrypt.compare(body.password, user.password_hash);
    if (!ok) return reply.code(401).send({ error: "Invalid credentials" });

    const token = await reply.jwtSign({ id: user.id, email: user.email, role: user.role });

    return reply.send({ token, user: { id: user.id, email: user.email, role: user.role } });
  });

  app.get("/me", { preHandler: [(app as any).authenticate] }, async (req) => {
    return { user: req.authUser };
  });
}

function int(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
