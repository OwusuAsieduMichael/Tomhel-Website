import { revalidateTag, unstable_cache } from "next/cache";
import { toStoreError, type Backend, type RawOp, type RawTables } from "./backend";

/**
 * The Google Sheet, through the Apps Script web app. Server-side only: the URL and secret never reach browsers.
 *
 * With `cache: true` (inside Next.js), reads are kept in the Next.js data cache, tagged per tab, and every
 * write through the website clears the tags it touched, so users see their changes immediately.
 * Edits made by hand in the sheet show up within CACHE_SECONDS.
 */
const CACHE_SECONDS = 60;
const tag = (sheet: string) => `prep-sheet:${sheet}`;

type GasResponse = { success: boolean; message?: string; tables?: RawTables; created?: string[]; addedColumns?: Record<string, string[]> };

export class GasBackend implements Backend {
  constructor(private opts: { url: string; secret: string; cache: boolean }) {
    if (opts.secret.length < 32) throw new Error("PREP_GAS_SECRET must be at least 32 characters.");
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

  async read(sheets: string[]): Promise<RawTables> {
    if (!this.opts.cache) return this.fetchTables(sheets);
    const key = [...sheets].sort();
    return unstable_cache(() => this.fetchTables(key), ["prep-sheets", ...key], {
      tags: key.map(tag),
      revalidate: CACHE_SECONDS,
    })();
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
