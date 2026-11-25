import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// revalidateTag only works inside Next.js; record the calls instead.
const revalidated: string[] = [];
vi.mock("next/cache", () => ({
  revalidateTag: (t: string) => revalidated.push(t),
  unstable_cache: () => {
    throw new Error("tests pass their own cache");
  },
}));

const { GasBackend, packGrid, unpackGrid } = await import("@/lib/prep/store/gas-backend");
type CacheFn = NonNullable<ConstructorParameters<typeof GasBackend>[0]["cacheFn"]>;

/** A simple stand-in for the Next.js data cache: by key, cleared by tag. */
function memoryCache() {
  const entries = new Map<string, { value: Promise<unknown>; tags: string[] }>();
  const fn: CacheFn = (load, key, opts) => () => {
    const k = key.join("|");
    if (!entries.has(k)) entries.set(k, { value: load(), tags: opts.tags });
    return entries.get(k)!.value as never;
  };
  const clear = (tag: string) => {
    for (const [k, e] of entries) if (e.tags.includes(tag)) entries.delete(k);
  };
  return { fn, clear };
}

let calls: { action: string; tables?: string[] }[];

beforeEach(() => {
  calls = [];
  revalidated.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body);
      calls.push({ action: body.action, tables: body.tables });
      const tables = Object.fromEntries((body.tables ?? []).map((t: string) => [t, [["id"], [`${t}-1`]]]));
      return { status: 200, json: async () => ({ success: true, tables }) };
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

const secret = "x".repeat(40);

describe("reading the Google Sheet", () => {
  it("fetches several tabs in one call, then serves them from the cache", async () => {
    const cache = memoryCache();
    const gas = new GasBackend({ url: "https://example.test/exec", secret, cache: true, cacheFn: cache.fn });
    const first = await gas.read(["Attempts", "Questions", "McqOptions"]);
    expect(first.Questions).toEqual([["id"], ["Questions-1"]]);
    expect(calls).toEqual([{ action: "read", tables: ["Attempts", "Questions", "McqOptions"] }]);

    await gas.read(["Questions", "McqOptions"]);
    expect(calls).toHaveLength(1);
  });

  it("after saving an attempt, fetches only the Attempts tab again", async () => {
    const cache = memoryCache();
    const gas = new GasBackend({ url: "https://example.test/exec", secret, cache: true, cacheFn: cache.fn });
    await gas.read(["Attempts", "Questions", "McqOptions"]);
    await gas.write([{ op: "update", table: "Attempts", id: "a", set: {} }]);
    expect(revalidated).toEqual(["prep-sheet:Attempts"]);
    cache.clear("prep-sheet:Attempts");

    await gas.read(["Attempts", "Questions", "McqOptions"]);
    expect(calls.map((c) => c.tables ?? c.action)).toEqual([["Attempts", "Questions", "McqOptions"], "write", ["Attempts"]]);
  });

  it("joins reads from separate requests that miss the cache at the same moment", async () => {
    const cache = memoryCache();
    const gas = new GasBackend({ url: "https://example.test/exec", secret, cache: true, cacheFn: cache.fn });
    await Promise.all([gas.read(["Users"]), gas.read(["Classes", "Users"])]);
    expect(calls).toEqual([{ action: "read", tables: ["Users", "Classes"] }]);
  });

  it("caches big tabs compressed, well under the 2 MB Next.js limit", () => {
    // Like the Questions tab with every past paper (8,400 rows, ~3.6 MB as JSON).
    const grid = [["id", "code", "paperId", "text", "status"]];
    const paper = crypto.randomUUID();
    for (let i = 0; i < 8_400; i++) grid.push([crypto.randomUUID(), `SOC-2001-P1-${i}`, paper, `Which of the following is a question about topic ${i % 50}? `.repeat(6), "approved"]);
    expect(JSON.stringify(grid).length).toBeGreaterThan(2 * 1024 * 1024);
    const packed = packGrid(grid);
    expect(packed).not.toBeNull();
    expect(packed!.length).toBeLessThan(2 * 1024 * 1024);
    expect(unpackGrid(packed!)).toEqual(grid);
  });

  it("keeps a tab too big for the data cache in memory, and drops it when the site writes to it", async () => {
    const big = Array.from({ length: 60_000 }, () => [crypto.randomUUID() + crypto.randomUUID() + crypto.randomUUID()]);
    expect(packGrid(big)).toBeNull();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { body: string }) => {
        calls.push({ action: JSON.parse(init.body).action });
        return { status: 200, json: async () => ({ success: true, tables: { McqOptions: big } }) };
      }),
    );
    const cache = memoryCache();
    const gas = new GasBackend({ url: "https://example.test/exec", secret, cache: true, cacheFn: cache.fn });
    expect((await gas.read(["McqOptions"])).McqOptions).toHaveLength(60_000);
    expect((await gas.read(["McqOptions"])).McqOptions).toHaveLength(60_000);
    expect(calls).toEqual([{ action: "read" }]);

    await gas.write([{ op: "update", table: "McqOptions", id: "a", set: {} }]);
    expect((await gas.read(["McqOptions"])).McqOptions).toHaveLength(60_000);
    expect(calls).toEqual([{ action: "read" }, { action: "write" }, { action: "read" }]);
  });

  it("reads straight from Google without the cache (scripts)", async () => {
    const gas = new GasBackend({ url: "https://example.test/exec", secret, cache: false });
    await gas.read(["Users"]);
    await gas.read(["Users"]);
    expect(calls).toHaveLength(2);
  });
});
