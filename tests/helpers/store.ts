import { PGlite } from "@electric-sql/pglite";
import { MemoryBackend } from "@/lib/prep/store/backend";
import { databaseSheets, Store } from "@/lib/prep/store";
import { PostgresBackend, RoutingBackend, type SqlClient } from "@/lib/prep/store/postgres-backend";

/** A fresh in-memory store with every tab created. Writes run the Apps Script's own logic. */
export async function createTestStore(): Promise<Store> {
  const store = new Store(new MemoryBackend());
  await store.setup();
  return store;
}

/** PGlite (a real Postgres, in memory) as a SqlClient. */
export function pgliteClient(db = new PGlite()): SqlClient {
  type Q = { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> };
  const wrap = (q: Q) => async (text: string, params: unknown[] = []) => (await q.query(text, params)).rows as Record<string, unknown>[];
  return {
    query: wrap(db),
    transaction: (fn) =>
      db.transaction((tx) =>
        fn({
          query: wrap(tx),
          transaction: () => {
            throw new Error("Nested transactions are not used.");
          },
        }),
      ),
  };
}

/**
 * One PGlite per test file (it takes seconds to start on a busy machine), and a new empty schema for every
 * call, so tests don't see each other's rows. The backend works in the current schema.
 */
let shared: PGlite | undefined;
let schemaCount = 0;
export async function freshPostgres(): Promise<SqlClient> {
  shared ??= new PGlite();
  const name = `t${++schemaCount}`;
  await shared.exec(`create schema ${name}; set search_path to ${name};`);
  return pgliteClient(shared);
}

/** As in production with PREP_DATABASE_URL set: the newer tables in Postgres, the rest in the "Sheet". */
export async function createRoutedTestStore(): Promise<Store> {
  const store = new Store(new RoutingBackend(new MemoryBackend(), new PostgresBackend(await freshPostgres()), databaseSheets()));
  await store.setup();
  return store;
}
