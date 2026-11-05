import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

/**
 * Raw sheet access: tabs as text grids (header row first). Three implementations:
 * - GasBackend: the real Google Sheet, via the Apps Script web app (production and staging).
 * - LocalFileBackend: a JSON file on disk (local development and demos, no Google setup needed).
 * - MemoryBackend: in memory (tests).
 * The local and memory backends run the Apps Script's own write logic, so all three behave the same.
 */

export type RawTables = Record<string, string[][]>;
export type RawOp =
  | { op: "insert"; table: string; rows: Record<string, string>[]; unique?: string[] }
  | { op: "update"; table: string; id: string; set: Record<string, string> }
  | { op: "delete"; table: string; ids: string[] };

export interface Backend {
  read(sheets: string[]): Promise<RawTables>;
  write(ops: RawOp[]): Promise<void>;
  /** Creates missing tabs and adds missing columns. Never removes anything. */
  setup(schema: Record<string, string[]>): Promise<{ created: string[]; addedColumns: Record<string, string[]> }>;
}

/** A unique column (e.g. loginId) already has this value. */
export class StoreConflictError extends Error {
  constructor(
    public table: string,
    public column: string,
    public value: string,
  ) {
    super(`${table}.${column} already has the value ${value}.`);
    this.name = "StoreConflictError";
  }
}

export class StoreNotFoundError extends Error {
  constructor(
    public table: string,
    public id: string,
  ) {
    super(`${table} has no row ${id}.`);
    this.name = "StoreNotFoundError";
  }
}

/** Maps the Apps Script's coded error messages to typed errors. */
export function toStoreError(message: string): Error {
  const dup = /^DUPLICATE:([^.]+)\.([^:]+):(.*)$/.exec(message);
  if (dup) return new StoreConflictError(dup[1], dup[2], dup[3]);
  const missing = /^NOT_FOUND:([^:]+):(.*)$/.exec(message);
  if (missing) return new StoreNotFoundError(missing[1], missing[2]);
  return new Error(message);
}

// ---------------------------------------------------------------------------
// The Apps Script's pure functions, loaded from the .gs file itself.
// ---------------------------------------------------------------------------

type GasPure = {
  applyOpsPure_(data: RawTables, ops: RawOp[]): string[];
  touchedTablesPure_(ops: RawOp[]): string[];
  protectCellPure_(value: string): string;
  constantTimeEqualPure_(a: string, b: string): boolean;
};

let gasPure: GasPure | undefined;

export function loadAppsScript(): GasPure {
  if (gasPure) return gasPure;
  const file = path.join(process.cwd(), "google-apps-script", "prep", "Code.gs");
  const context: Record<string, unknown> = {};
  vm.runInNewContext(readFileSync(file, "utf8"), context, { filename: file });
  gasPure = context as unknown as GasPure;
  return gasPure;
}

const clone = (t: string[][]) => t.map((r) => [...r]);

export class MemoryBackend implements Backend {
  constructor(protected data: RawTables = {}) {}

  protected load(): RawTables {
    return this.data;
  }

  protected save(data: RawTables) {
    this.data = data;
  }

  async read(sheets: string[]) {
    const data = this.load();
    const out: RawTables = {};
    for (const s of sheets) {
      if (!data[s]) throw new Error(`Sheet "${s}" not found. Run npm run prep:setup.`);
      out[s] = clone(data[s]);
    }
    return out;
  }

  async write(ops: RawOp[]) {
    const data = this.load();
    const gas = loadAppsScript();
    const working: RawTables = {};
    for (const t of gas.touchedTablesPure_(ops)) if (data[t]) working[t] = clone(data[t]);
    try {
      gas.applyOpsPure_(working, ops);
    } catch (e) {
      // Errors from the vm context aren't `instanceof Error` here, so read the message directly.
      throw toStoreError(String((e as { message?: unknown })?.message ?? e));
    }
    this.save({ ...data, ...working });
  }

  async setup(schema: Record<string, string[]>) {
    const data = { ...this.load() };
    const created: string[] = [];
    const addedColumns: Record<string, string[]> = {};
    for (const [sheet, columns] of Object.entries(schema)) {
      if (!data[sheet]) {
        data[sheet] = [[]];
        created.push(sheet);
      }
      const table = clone(data[sheet]);
      const missing = columns.filter((c) => !table[0].includes(c));
      if (missing.length) {
        table[0].push(...missing);
        for (const row of table.slice(1)) row.push(...missing.map(() => ""));
        addedColumns[sheet] = missing;
      }
      data[sheet] = table;
    }
    this.save(data);
    return { created, addedColumns };
  }
}

/** Development/demo store in a JSON file (git-ignored). Re-read on every call so all dev workers agree. */
export class LocalFileBackend extends MemoryBackend {
  constructor(private file: string) {
    super();
  }

  protected load(): RawTables {
    return existsSync(this.file) ? (JSON.parse(readFileSync(this.file, "utf8")) as RawTables) : {};
  }

  protected save(data: RawTables) {
    mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(data));
    renameSync(tmp, this.file);
  }
}
