import postgres from "postgres";
import type { SqlClient } from "./postgres-backend";

/**
 * PREP_DATABASE_URL as a SqlClient, through postgres.js. For Supabase use the "Transaction pooler" connection
 * string (port 6543): serverless functions open many short connections, which the pooler is for. Prepared
 * statements are off because the transaction pooler doesn't keep them between requests.
 */
export function postgresClient(url: string): SqlClient {
  const sql = postgres(url, { prepare: false, max: 5, idle_timeout: 20, connect_timeout: 15 });
  type Runner = { unsafe: (text: string, params?: never[]) => Promise<Record<string, unknown>[]> };
  const wrap = (s: Runner): Omit<SqlClient, "transaction"> => ({
    query: async (text, params = []) => [...(await s.unsafe(text, params as never[]))],
  });
  return {
    ...wrap(sql as unknown as Runner),
    transaction: async <T,>(fn: (tx: SqlClient) => Promise<T>) =>
      (await sql.begin((tx) =>
        fn({
          ...wrap(tx as unknown as Runner),
          transaction: () => {
            throw new Error("Nested transactions are not used.");
          },
        }),
      )) as T,
  };
}
