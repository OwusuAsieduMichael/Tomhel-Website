import { tables, type RowOf, type TableName } from "./schema";

/** Converts typed rows to and from the plain-text cells stored in the sheet. */

type AnyCol = { type: string; nullable?: boolean; values?: readonly string[]; default?: string };
const columnsOf = (t: TableName) => tables[t].columns as unknown as Record<string, AnyCol>;

export class StoreDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoreDataError";
  }
}

function encodeValue(col: AnyCol, v: unknown): string {
  if (v === null || v === undefined) return "";
  switch (col.type) {
    case "boolean":
      return v ? "TRUE" : "FALSE";
    case "date":
      return (v as Date).toISOString();
    case "list":
    case "json":
      return JSON.stringify(v);
    default:
      return String(v);
  }
}

function decodeValue(table: TableName, name: string, col: AnyCol, raw: string | undefined): unknown {
  // Strings keep their exact text; every other type ignores surrounding spaces.
  const s = col.type === "string" ? (raw ?? "") : (raw ?? "").trim();
  const bad = () => new StoreDataError(`Sheet ${tables[table].sheet}, column ${name}: can't read "${raw}".`);
  switch (col.type) {
    case "string":
      return col.nullable && s === "" ? null : s;
    case "number": {
      if (s === "") {
        if (col.nullable) return null;
        throw bad();
      }
      const n = Number(s);
      if (!Number.isFinite(n)) throw bad();
      return n;
    }
    case "boolean": {
      const u = s.trim().toUpperCase();
      if (u === "TRUE" || u === "YES" || u === "1") return true;
      if (u === "FALSE" || u === "NO" || u === "0" || u === "") return false;
      throw bad();
    }
    case "date": {
      if (s === "") {
        if (col.nullable) return null;
        throw bad();
      }
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) throw bad();
      return d;
    }
    case "list": {
      if (s === "") return [];
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {}
      throw bad();
    }
    case "json": {
      if (s === "") return null;
      try {
        return JSON.parse(s);
      } catch {
        throw bad();
      }
    }
    case "enum":
      // A column added later is empty on older rows: those read as the column's default.
      if (s.trim() === "" && col.default !== undefined) return col.default;
      if (!col.values!.includes(s.trim())) throw bad();
      return s.trim();
    default:
      throw bad();
  }
}

export function encodeRow<T extends TableName>(table: T, row: Partial<RowOf<T>>): Record<string, string> {
  const cols = columnsOf(table);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined) continue;
    const col = cols[k];
    if (!col) throw new StoreDataError(`Table ${table} has no column ${k}.`);
    out[k] = encodeValue(col, v);
  }
  return out;
}

/** Turns a sheet (header row + rows) into typed rows. Blank rows are skipped. */
export function decodeSheet<T extends TableName>(table: T, data: string[][]): RowOf<T>[] {
  const [header = [], ...rows] = data;
  const cols = columnsOf(table);
  const index: Record<string, number> = {};
  for (const name of Object.keys(cols)) {
    const i = header.indexOf(name);
    // A column with a default can be read before setup has added it (every row gets the default).
    if (i === -1 && cols[name].default !== undefined) {
      index[name] = -1;
      continue;
    }
    if (i === -1) throw new StoreDataError(`Sheet ${tables[table].sheet} is missing the column "${name}". Run npm run prep:setup.`);
    index[name] = i;
  }
  return rows
    .filter((r) => r.some((c) => String(c).trim() !== ""))
    .map((r) => {
      const row: Record<string, unknown> = {};
      for (const [name, col] of Object.entries(cols)) row[name] = decodeValue(table, name, col, index[name] === -1 ? undefined : r[index[name]]);
      return row as RowOf<T>;
    });
}

/** Column names per sheet tab, for the setup step. */
export function sheetSchema(): Record<string, string[]> {
  return Object.fromEntries(Object.values(tables).map((t) => [t.sheet, Object.keys(t.columns)]));
}
