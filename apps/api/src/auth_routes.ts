import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { z } from "zod";
import crypto from "node:crypto";
import { sendResetEmail } from "./mailer";
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
  // Request reset email (always returns 200 to avoid user enumeration)
app.post("/auth/forgot_password", async (req, reply) => {
  const body = req.body as { email?: string };
  const email = (body?.email ?? "").toLowerCase().trim();

  // Always say OK
  if (!email) return reply.send({ ok: true });

  const userRes = await query<{ id: string }>(
    "SELECT id FROM users WHERE email = $1",
    [email]
  );

  if (!userRes.rows.length) return reply.send({ ok: true });

  const userId = userRes.rows[0].id;

  // Create token + store only hash
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  // expire in 30 minutes
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  // optional: invalidate older tokens for this user
  await query("DELETE FROM password_resets WHERE user_id = $1", [userId]);

  await query(
    "INSERT INTO password_resets(user_id, token_hash, expires_at) VALUES ($1,$2,$3)",
    [userId, tokenHash, expiresAt]
  );

  const appBase = process.env.APP_BASE_URL ?? "http://localhost:5173";
  const resetUrl = `${appBase}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

  // send email (if SMTP misconfigured, log but still return ok)
  try {
    await sendResetEmail(email, resetUrl);
  } catch (e) {
    app.log.error(e);
  }

  return reply.send({ ok: true });
});

app.post("/auth/reset_password", async (req, reply) => {
  const body = req.body as { email?: string; token?: string; password?: string };
  const email = (body?.email ?? "").toLowerCase().trim();
  const token = (body?.token ?? "").trim();
  const password = body?.password ?? "";

  if (!email || !token || password.length < 8) {
    return reply.code(400).send({ error: "Invalid payload" });
  }

  const userRes = await query<{ id: string }>(
    "SELECT id FROM users WHERE email = $1",
    [email]
  );
  if (!userRes.rows.length) return reply.code(400).send({ error: "Invalid token" });

  const userId = userRes.rows[0].id;

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const resetRes = await query<{ id: string; expires_at: string; used_at: string | null }>(
    `SELECT id, expires_at::text, used_at::text
     FROM password_resets
     WHERE user_id = $1 AND token_hash = $2
     LIMIT 1`,
    [userId, tokenHash]
  );

  if (!resetRes.rows.length) return reply.code(400).send({ error: "Invalid token" });

  const row = resetRes.rows[0];
  if (row.used_at) return reply.code(400).send({ error: "Token already used" });

  const exp = new Date(row.expires_at).getTime();
  if (!Number.isFinite(exp) || Date.now() > exp) {
    return reply.code(400).send({ error: "Token expired" });
  }

  const password_hash = await bcrypt.hash(password, 12);

  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [password_hash, userId]);
  await query("UPDATE password_resets SET used_at = NOW() WHERE id = $1", [row.id]);

  return reply.send({ ok: true });
});


  // DEV MODE: allow first user creation without auth if no users exist
  app.post("/auth/register", async (req, reply) => {
    const body = RegisterSchema.parse(req.body);

    const existing = await query<{ id: string }>(
      "SELECT id FROM users WHERE email = $1",
      [body.email.toLowerCase()]
    );
    if (existing.rows.length) return reply.code(409).send({ error: "Email already exists" });

    const count = await query<{ c: string }>("SELECT COUNT(*)::text as c FROM users");
    const userCount = int(count.rows[0]?.c ?? "0");

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
