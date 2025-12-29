import "dotenv/config";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const isRender = Boolean(process.env.RENDER);

export const pool = new Pool({
  connectionString,
  ssl: isRender ? { rejectUnauthorized: false } : undefined,
});

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[] }> {
  const res = await pool.query(text, params);
  return { rows: res.rows as T[] };
}
