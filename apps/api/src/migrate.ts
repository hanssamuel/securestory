import fs from "node:fs";
import path from "node:path";
import { pool } from "./db";

type Row = { version: string };

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getApplied(): Promise<Set<string>> {
  const res = await pool.query<Row>("SELECT version FROM schema_migrations");
  return new Set(res.rows.map((r) => r.version));
}

async function apply(version: string, sql: string) {
  await pool.query("BEGIN");
  try {
    await pool.query(sql);
    await pool.query("INSERT INTO schema_migrations(version) VALUES ($1)", [version]);
    await pool.query("COMMIT");
    console.log(`✅ applied ${version}`);
  } catch (e) {
    await pool.query("ROLLBACK");
    throw e;
  }
}

async function main() {
  const dir = path.join(process.cwd(), "migrations");
  if (!fs.existsSync(dir)) {
    console.log("No migrations folder found, skipping.");
    return;
  }

  await ensureMigrationsTable();
  const applied = await getApplied();

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

  for (const f of files) {
    if (applied.has(f)) continue;
    const sql = fs.readFileSync(path.join(dir, f), "utf8");
    await apply(f, sql);
  }

  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
