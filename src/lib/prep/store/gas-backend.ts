import { gunzipSync, gzipSync } from "node:zlib";
import { revalidateTag, unstable_cache } from "next/cache";
import { FILE_ID, PICTURE_TYPES, toStoreError, type Backend, type RawOp, type RawTables, type StoredFile } from "./backend";

/**
 * The Google Sheet, through the Apps Script web app. Server-side only: the URL and secret never reach browsers.
 *
 * With `cache: true` (inside Next.js), each tab is kept in the Next.js data cache on its own, and every write
 * through the website clears only the tabs it touched. So saving a student's attempt doesn't throw away the
 * cached questions: the next page only fetches the Attempts tab again. Tabs that do need fetching at the same
 * moment are fetched together in one call, because each call to Google takes a second or more.
 * Edits made by hand in the sheet show up within CACHE_SECONDS.
 */
const CACHE_SECONDS = 60;
/** How long to wait for other tabs to join a fetch. Cache lookups for one read finish within this. */
const BATCH_WINDOW_MS = 5;
const tag = (sheet: string) => `prep-sheet:${sheet}`;
/**
 * Next.js refuses to cache an item over 2 MB, and when it refuses it keeps serving the older copy it already
 * has. The Questions and McqOptions tabs grew past that with the past papers, so students got questions without
 * their options. Tabs are cached gzipped (Questions: 3.6 MB -> 0.8 MB). McqOptions is mostly random ids and stays
 * near 2 MB even compressed, so a tab still too big is kept in server memory instead (see `memory`).
 * The key changed with the format, so the old frozen copies are never read again.
 */
const CACHE_KEY = "prep-sheet-gz";
const MAX_CACHED_CHARS = 1_800_000;

export function packGrid(grid: string[][]): string | null {
  const packed = gzipSync(JSON.stringify(grid)).toString("base64");
  return packed.length > MAX_CACHED_CHARS ? null : packed;
}

export function unpackGrid(packed: string): string[][] {
  return JSON.parse(gunzipSync(Buffer.from(packed, "base64")).toString("utf8"));
}

type GasResponse = {
  success: boolean;
  message?: string;
  tables?: RawTables;
  created?: string[];
  addedColumns?: Record<string, string[]>;
  id?: string;
  mimeType?: string;
  data?: string;
};

/** The caching wrapper: Next.js's data cache in the app; tests pass a plain one. */
export type CacheFn = <T>(fn: () => Promise<T>, key: string[], opts: { tags: string[]; revalidate: number }) => () => Promise<T>;

export class GasBackend implements Backend {
  private batch: { sheets: Set<string>; result: Promise<RawTables> } | null = null;
  /** Tabs too big for the data cache, kept per server instance. Other instances' writes show within CACHE_SECONDS. */
  private memory = new Map<string, { grid: string[][]; at: number }>();
  private cacheFn: CacheFn;

  constructor(private opts: { url: string; secret: string; cache: boolean; cacheFn?: CacheFn }) {
    if (opts.secret.length < 32) throw new Error("PREP_GAS_SECRET must be at least 32 characters.");
    this.cacheFn = opts.cacheFn ?? (unstable_cache as unknown as CacheFn);
  }

  private async call(body: Record<string, unknown>): Promise<GasResponse> {
    const res = await fetch(this.opts.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, secret: this.opts.secret }),
      cache: "no-store",
      redirect: "follow",
    });
    let data: GasResponse;
    try {
      data = (await res.json()) as GasResponse;
    } catch {
      throw new Error(`The BECE Prep data service returned an unreadable response (HTTP ${res.status}).`);
    }
    if (!data.success) throw toStoreError(data.message ?? "The BECE Prep data service failed.");
    return data;
  }

  private async fetchTables(sheets: string[]): Promise<RawTables> {
    return (await this.call({ action: "read", tables: sheets })).tables ?? {};
  }

  /** Fetches one tab, joining any other tabs asked for in the same moment into a single call. */
  private fetchSheet(sheet: string): Promise<string[][]> {
    if (!this.batch) {
      const sheets = new Set<string>();
      const result = new Promise<RawTables>((resolve, reject) => {
        setTimeout(() => {
          this.batch = null;
          this.fetchTables([...sheets]).then(resolve, reject);
        }, BATCH_WINDOW_MS);
      });
      this.batch = { sheets, result };
    }
    const batch = this.batch;
    batch.sheets.add(sheet);
    return batch.result.then((tables) => {
      const grid = tables[sheet];
      if (!grid) throw new Error(`Sheet "${sheet}" not found. Run npm run prep:setup.`);
      return grid;
    });
  }

  async read(sheets: string[]): Promise<RawTables> {
    if (!this.opts.cache) return this.fetchTables(sheets);
    const unique = [...new Set(sheets)];
    const grids = await Promise.all(
      unique.map(async (s) => {
        let fetched: string[][] | undefined;
        const packed = await this.cacheFn(async () => packGrid((fetched = await this.fetchSheet(s))), [CACHE_KEY, s], {
          tags: [tag(s)],
          revalidate: CACHE_SECONDS,
        })();
        if (packed !== null) return unpackGrid(packed);
        // Too big for the data cache even compressed: keep it in this server's memory for the same time instead.
        if (fetched) this.memory.set(s, { grid: fetched, at: Date.now() });
        const kept = this.memory.get(s);
        if (kept && Date.now() - kept.at < CACHE_SECONDS * 1000) return kept.grid;
        const grid = await this.fetchSheet(s);
        this.memory.set(s, { grid, at: Date.now() });
        return grid;
      }),
    );
    return Object.fromEntries(unique.map((s, i) => [s, grids[i]]));
  }

  async write(ops: RawOp[]): Promise<void> {
    if (!ops.length) return;
    try {
      await this.call({ action: "write", ops });
    } finally {
      // Clear even on failure: part of a failed batch may not be what the cache holds.
      if (this.opts.cache) {
        for (const t of new Set(ops.map((o) => o.table))) {
          this.memory.delete(t);
          revalidateTag(tag(t));
        }
      }
    }
  }

  async setup(schema: Record<string, string[]>) {
    const r = await this.call({ action: "setup", schema });
    return { created: r.created ?? [], addedColumns: r.addedColumns ?? {} };
  }

  /** Pictures live in a private Drive folder that only this script reads; see Code.gs. */
  async putFile(file: StoredFile & { name: string }) {
    if (!PICTURE_TYPES.includes(file.mimeType)) throw new Error("Only PNG, JPEG, GIF or WebP pictures.");
    const r = await this.call({ action: "putFile", name: file.name, mimeType: file.mimeType, data: file.data.toString("base64") });
    if (!r.id) throw new Error("The BECE Prep data service did not return a picture id.");
    return r.id;
  }

  async getFile(id: string): Promise<StoredFile | null> {
    if (!FILE_ID.test(id)) return null;
    try {
      const r = await this.call({ action: "getFile", id });
      return r.data && r.mimeType ? { mimeType: r.mimeType, data: Buffer.from(r.data, "base64") } : null;
    } catch (e) {
      // Drive answers an unknown id with "No item with the given ID could be found"; the script with "Not found."
      if (e instanceof Error && /not found|no item with the given id/i.test(e.message)) return null;
      throw e;
    }
  }
}
