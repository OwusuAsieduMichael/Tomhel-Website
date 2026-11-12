import { revalidateTag, unstable_cache } from "next/cache";
import { toStoreError, type Backend, type RawOp, type RawTables } from "./backend";

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

type GasResponse = { success: boolean; message?: string; tables?: RawTables; created?: string[]; addedColumns?: Record<string, string[]> };

/** The caching wrapper: Next.js's data cache in the app; tests pass a plain one. */
export type CacheFn = <T>(fn: () => Promise<T>, key: string[], opts: { tags: string[]; revalidate: number }) => () => Promise<T>;

export class GasBackend implements Backend {
  private batch: { sheets: Set<string>; result: Promise<RawTables> } | null = null;
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
      unique.map((s) => this.cacheFn(() => this.fetchSheet(s), ["prep-sheet", s], { tags: [tag(s)], revalidate: CACHE_SECONDS })()),
    );
    return Object.fromEntries(unique.map((s, i) => [s, grids[i]]));
  }

  async write(ops: RawOp[]): Promise<void> {
    if (!ops.length) return;
    try {
      await this.call({ action: "write", ops });
    } finally {
      // Clear even on failure: part of a failed batch may not be what the cache holds.
      if (this.opts.cache) for (const t of new Set(ops.map((o) => o.table))) revalidateTag(tag(t));
    }
  }

  async setup(schema: Record<string, string[]>) {
    const r = await this.call({ action: "setup", schema });
    return { created: r.created ?? [], addedColumns: r.addedColumns ?? {} };
  }
}
