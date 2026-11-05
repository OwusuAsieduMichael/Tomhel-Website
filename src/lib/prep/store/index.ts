import { randomUUID } from "node:crypto";
import path from "node:path";
import { LocalFileBackend, type Backend, type RawOp } from "./backend";
import { decodeSheet, encodeRow, sheetSchema } from "./codec";
import { GasBackend } from "./gas-backend";
import { tables, type RowOf, type TableName } from "./schema";

export { StoreConflictError, StoreNotFoundError } from "./backend";
export * from "./schema";

/** One change in a write batch. Build with insert / update / remove. */
export type WriteOp = { __brand: "WriteOp"; raw: RawOp };

export const newId = () => randomUUID();

export function insert<T extends TableName>(table: T, rows: RowOf<T>[], opts: { unique?: (keyof RowOf<T> & string)[] } = {}): WriteOp {
  return {
    __brand: "WriteOp",
    raw: { op: "insert", table: tables[table].sheet, rows: rows.map((r) => encodeRow(table, r)), unique: opts.unique },
  };
}

export function update<T extends TableName>(table: T, id: string, set: Partial<RowOf<T>>): WriteOp {
  return { __brand: "WriteOp", raw: { op: "update", table: tables[table].sheet, id, set: encodeRow(table, set) } };
}

export function remove<T extends TableName>(table: T, ids: string[]): WriteOp {
  return { __brand: "WriteOp", raw: { op: "delete", table: tables[table].sheet, ids } };
}

/**
 * Typed access to the BECE Prep sheet. Reads return whole tables (a school's data is small);
 * filtering happens in code. A write batch is applied together: if any op fails, nothing is saved.
 */
export class Store {
  constructor(readonly backend: Backend) {}

  async read<K extends TableName>(...names: K[]): Promise<{ [P in K]: RowOf<P>[] }> {
    const raw = await this.backend.read(names.map((n) => tables[n].sheet));
    return Object.fromEntries(names.map((n) => [n, decodeSheet(n, raw[tables[n].sheet])])) as { [P in K]: RowOf<P>[] };
  }

  async write(ops: WriteOp[]): Promise<void> {
    const raw = ops.map((o) => o.raw).filter((o) => o.op !== "delete" || o.ids.length > 0);
    if (raw.length) await this.backend.write(raw);
  }

  /** Creates missing tabs and columns. Safe to run any time. */
  setup() {
    return this.backend.setup(sheetSchema());
  }
}

export const LOCAL_DATA_FILE = path.join(process.cwd(), ".prep-local", "data.json");

/** Picks the backend from the environment. Used by scripts (no Next.js cache) and by getStore. */
export function storeFromEnv(opts: { cache: boolean }): Store {
  const url = process.env.PREP_GAS_URL;
  if (url) return new Store(new GasBackend({ url, secret: process.env.PREP_GAS_SECRET ?? "", cache: opts.cache }));
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV) {
    throw new Error("PREP_GAS_URL is not set. See docs/PREP_APPS_SCRIPT_SETUP.md.");
  }
  return new Store(new LocalFileBackend(LOCAL_DATA_FILE));
}

const globalForStore = globalThis as unknown as { __prepStore?: Store };

/**
 * The app's store: the Google Sheet when PREP_GAS_URL is set, otherwise (development only)
 * a local JSON file so the portal can be run and demoed without any Google setup.
 */
export function getStore(): Store {
  globalForStore.__prepStore ??= storeFromEnv({ cache: true });
  return globalForStore.__prepStore;
}

/** Tests only. */
export function setStoreForTesting(store: Store | undefined) {
  globalForStore.__prepStore = store;
}
