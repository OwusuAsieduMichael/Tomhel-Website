import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// revalidateTag only works inside Next.js; record the calls instead.
const revalidated: string[] = [];
vi.mock("next/cache", () => ({
  revalidateTag: (t: string) => revalidated.push(t),
  unstable_cache: () => {
    throw new Error("tests pass their own cache");
  },
}));

const { GasBackend } = await import("@/lib/prep/store/gas-backend");
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

  it("reads straight from Google without the cache (scripts)", async () => {
    const gas = new GasBackend({ url: "https://example.test/exec", secret, cache: false });
    await gas.read(["Users"]);
    await gas.read(["Users"]);
    expect(calls).toHaveLength(2);
  });
});
