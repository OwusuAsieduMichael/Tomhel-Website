import { StoreConflictError, StoreNotFoundError, type Backend, type RawOp, type RawTables, type StoredFile } from "./backend";

/**
 * A Postgres database (Supabase in production) with the same behaviour as the Google Sheet:
 * one table per tab, every column text, empty text for "no value", writes applied together or not at all,
 * and the same duplicate / not-found errors. So a table can move from the Sheet to Postgres without the
 * rest of the code noticing. Which tables live here is decided by RoutingBackend.
 *
 * Writers lock the tables they touch for the length of the transaction, like the Apps Script's write lock,
 * so two admins can't both take the same login ID.
 */

/** The little the backend needs from a Postgres client. postgres.js (production) and PGlite (tests) both fit. */
export interface SqlClient {
  query(text: string, params?: unknown[]): Promise<Record<string, unknown>[]>;
  transaction<T>(fn: (tx: SqlClient) => Promise<T>): Promise<T>;
}

const ident = (name: string) => {
  if (!/^[A-Za-z][A-Za-z0-9_]{0,62}$/.test(name)) throw new Error(`Not a valid table or column name: ${name}`);
  return `"${name}"`;
};

export class PostgresBackend implements Backend {
  private columns = new Map<string, string[]>();

  constructor(private sql: SqlClient) {}

  /** Column names of a table in their order, or null if the table doesn't exist. */
  private async columnsOf(db: SqlClient, table: string): Promise<string[] | null> {
    const cached = this.columns.get(table);
    if (cached) return cached;
    const rows = await db.query(
      "select column_name from information_schema.columns where table_schema = current_schema() and table_name = $1 order by ordinal_position",
      [table],
    );
    if (!rows.length) return null;
    const cols = rows.map((r) => String(r.column_name));
    this.columns.set(table, cols);
    return cols;
  }

  async read(sheets: string[]): Promise<RawTables> {
    const out: RawTables = {};
    for (const s of sheets) {
      const all = await this.columnsOf(this.sql, s);
      if (!all) throw new Error(`Table "${s}" not found. Run npm run prep:setup.`);
      const cols = all.filter((c) => c !== "_seq");
      const rows = await this.sql.query(`select ${cols.map(ident).join(", ")} from ${ident(s)} order by "_seq"`);
      out[s] = [cols, ...rows.map((r) => cols.map((c) => String(r[c] ?? "")))];
    }
    return out;
  }

  async write(ops: RawOp[]): Promise<void> {
    if (!ops.length) return;
    await this.sql.transaction(async (tx) => {
      for (const t of [...new Set(ops.map((o) => o.table))].sort()) {
        if (!(await this.columnsOf(tx, t))) throw new Error(`Unknown table ${t}.`);
        await tx.query(`lock table ${ident(t)} in share row exclusive mode`);
      }
      for (const op of ops) {
        const cols = (await this.columnsOf(tx, op.table))!.filter((c) => c !== "_seq");
        const known = (key: string) => {
          if (!cols.includes(key)) throw new Error(`Table ${op.table} has no column ${key}. Run the setup step.`);
        };
        if (op.op === "insert") {
          for (const u of op.unique ?? []) known(u);
          for (const rec of op.rows) {
            if (!rec.id) throw new Error("Every new row needs an id.");
            Object.keys(rec).forEach(known);
            for (const c of ["id", ...(op.unique ?? [])]) {
              const value = rec[c] ?? "";
              const hit = await tx.query(`select 1 from ${ident(op.table)} where upper(${ident(c)}) = upper($1) limit 1`, [value]);
              if (hit.length) throw new StoreConflictError(op.table, c, value);
            }
            await tx.query(
              `insert into ${ident(op.table)} (${cols.map(ident).join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")})`,
              cols.map((c) => rec[c] ?? ""),
            );
          }
        } else if (op.op === "update") {
          const keys = Object.keys(op.set);
          keys.forEach(known);
          if (keys.includes("id")) throw new Error("Row ids can't be changed.");
          const hit = await tx.query(`select 1 from ${ident(op.table)} where "id" = $1`, [op.id]);
          if (!hit.length) throw new StoreNotFoundError(op.table, op.id);
          if (keys.length) {
            await tx.query(
              `update ${ident(op.table)} set ${keys.map((k, i) => `${ident(k)} = $${i + 2}`).join(", ")} where "id" = $1`,
              [op.id, ...keys.map((k) => op.set[k] ?? "")],
            );
          }
        } else if (op.op === "delete") {
          if (op.ids.length) await tx.query(`delete from ${ident(op.table)} where "id" = any($1::text[])`, [op.ids]);
        } else {
          throw new Error(`Unknown op ${(op as { op: string }).op}.`);
        }
      }
    });
  }

  /** Creates missing tables and adds missing columns. Never removes anything. */
  async setup(schema: Record<string, string[]>) {
    const created: string[] = [];
    const addedColumns: Record<string, string[]> = {};
    for (const [table, cols] of Object.entries(schema)) {
      this.columns.delete(table);
      const existing = await this.columnsOf(this.sql, table);
      if (!existing) {
        // _seq keeps rows in the order they were added, as in the Sheet.
        await this.sql.query(
          `create table ${ident(table)} ("_seq" bigint generated always as identity, ${cols.map((c) => `${ident(c)} text not null default ''`).join(", ")}, primary key ("id"))`,
        );
        created.push(table);
      } else {
        const missing = cols.filter((c) => !existing.includes(c));
        for (const c of missing) await this.sql.query(`alter table ${ident(table)} add column ${ident(c)} text not null default ''`);
        if (missing.length) addedColumns[table] = missing;
      }
      this.columns.delete(table);
    }
    return { created, addedColumns };
  }

  async putFile(): Promise<string> {
    throw new Error("Pictures are kept by the main store, not the database.");
  }

  async getFile(): Promise<StoredFile | null> {
    return null;
  }
}

/**
 * Sends each table to the backend that holds it: the tables named in `moved` to `db`, the rest to `main`.
 * A write that touches both is applied to the main store first, then the database. The two are not one
 * transaction, so callers that write to both must be safe to repeat (creating a missing parent account is).
 */
export class RoutingBackend implements Backend {
  constructor(
    private main: Backend,
    private db: Backend,
    private moved: Set<string>,
  ) {}

  private split<T>(items: T[], table: (t: T) => string) {
    return { main: items.filter((x) => !this.moved.has(table(x))), db: items.filter((x) => this.moved.has(table(x))) };
  }

  async read(sheets: string[]): Promise<RawTables> {
    const s = this.split(sheets, (x) => x);
    const [a, b] = await Promise.all([s.main.length ? this.main.read(s.main) : {}, s.db.length ? this.db.read(s.db) : {}]);
    return { ...a, ...b };
  }

  async write(ops: RawOp[]) {
    const s = this.split(ops, (o) => o.table);
    if (s.main.length) await this.main.write(s.main);
    if (s.db.length) await this.db.write(s.db);
  }

  async setup(schema: Record<string, string[]>) {
    const entries = Object.entries(schema);
    const s = this.split(entries, ([t]) => t);
    const [a, b] = await Promise.all([this.main.setup(Object.fromEntries(s.main)), this.db.setup(Object.fromEntries(s.db))]);
    return { created: [...a.created, ...b.created], addedColumns: { ...a.addedColumns, ...b.addedColumns } };
  }

  putFile(file: StoredFile & { name: string }) {
    return this.main.putFile(file);
  }

  getFile(id: string) {
    return this.main.getFile(id);
  }
}
