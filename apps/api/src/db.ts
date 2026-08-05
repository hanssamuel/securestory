import "dotenv/config";
import fs from "node:fs";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const isRender = Boolean(process.env.RENDER);

function renderSsl() {
  if (!isRender) return undefined;

  const caPath = process.env.PGSSLROOTCERT;
  if (caPath) {
    return { ca: fs.readFileSync(caPath, "utf8") };
  }

  // No CA supplied -- falls back to skipping verification so existing
  // deployments keep working, but this accepts any certificate (no MITM
  // protection). Set PGSSLROOTCERT to Render's CA bundle to fix properly.
  console.warn(
    "PGSSLROOTCERT is not set -- Postgres TLS certificate verification is disabled. " +
      "Set PGSSLROOTCERT to Render's CA bundle path to verify the connection."
  );
  return { rejectUnauthorized: false };
}

export const pool = new Pool({
  connectionString,
  ssl: renderSsl(),
});

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[] }> {
  const res = await pool.query(text, params);
  return { rows: res.rows as T[] };
}
