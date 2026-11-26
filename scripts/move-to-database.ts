/**
 * Copies the newer features' tables (DATABASE_TABLES: parent accounts and their links, for now) from the
 * Google Sheet into the Postgres database at PREP_DATABASE_URL (Supabase).
 * Usage: npm run prep:move-to-database
 *
 * Run it once, when PREP_DATABASE_URL is first set, before the website uses the database. Safe to re-run:
 * rows already in the database are skipped. The Sheet's tabs are left as they are, as a backup.
 */
import { config } from "dotenv";
import { databaseSheets, mainBackendFromEnv, sheetSchema } from "../src/lib/prep/store";
import type { RawOp } from "../src/lib/prep/store/backend";
import { PostgresBackend } from "../src/lib/prep/store/postgres-backend";
import { postgresClient } from "../src/lib/prep/store/postgres-client";

config({ path: ".env.local", quiet: true });

async function main() {
  const url = process.env.PREP_DATABASE_URL;
  if (!url) throw new Error("Set PREP_DATABASE_URL in .env.local first (Supabase: Connect > Transaction pooler).");
  const sheet = mainBackendFromEnv({ cache: false });
  const db = new PostgresBackend(postgresClient(url));
  const sheets: string[] = [...databaseSheets()];

  const schema = Object.fromEntries(Object.entries(sheetSchema()).filter(([s]) => sheets.includes(s)));
  const { created } = await db.setup(schema);
  if (created.length) console.log(`Created in the database: ${created.join(", ")}`);

  const ops: RawOp[] = [];
  for (const s of sheets) {
    let grid: string[][];
    try {
      grid = (await sheet.read([s]))[s];
    } catch {
      console.log(`${s}: not in the Sheet, nothing to copy.`);
      continue;
    }
    const [header, ...rows] = grid;
    const have = new Set((await db.read([s]))[s].slice(1).map((r) => r[0]));
    const idCol = header.indexOf("id");
    const todo = rows.filter((r) => r[idCol] && !have.has(r[idCol]));
    console.log(`${s}: ${rows.length} in the Sheet, ${todo.length} to copy.`);
    if (todo.length) ops.push({ op: "insert", table: s, rows: todo.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""]))) });
  }
  await db.write(ops);
  for (const s of sheets) console.log(`${s}: ${(await db.read([s]))[s].length - 1} in the database.`);
  console.log("Done. Add PREP_DATABASE_URL to Vercel (Production) and deploy, so the website uses the database.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
