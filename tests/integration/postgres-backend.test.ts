import { describe, expect, it, vi } from "vitest";
import { MemoryBackend, StoreConflictError, StoreNotFoundError, type Backend } from "@/lib/prep/store/backend";
import { PostgresBackend, RoutingBackend } from "@/lib/prep/store/postgres-backend";
import { freshPostgres } from "../helpers/store";

// The first test starts an in-memory Postgres, which can take a while on a busy machine.
vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

const schema = { People: ["id", "loginId", "name"], Links: ["id", "personId"] };

/** Every behaviour the app relies on, run against the Sheet's logic and against Postgres: they must agree. */
describe.each([
  ["the Sheet (Apps Script logic)", async () => new MemoryBackend() as Backend],
  ["Postgres", async () => new PostgresBackend(await freshPostgres()) as Backend],
])("%s", (_name, make) => {
  const fresh = async () => {
    const b = await make();
    await b.setup(schema);
    return b;
  };

  it("keeps rows in the order they were added, with empty text for missing values", async () => {
    const b = await fresh();
    await b.write([{ op: "insert", table: "People", rows: [{ id: "2", loginId: "B" }, { id: "1", loginId: "A", name: "Ama" }] }]);
    expect((await b.read(["People"])).People).toEqual([["id", "loginId", "name"], ["2", "B", ""], ["1", "A", "Ama"]]);
  });

  it("refuses a value already taken in a unique column, ignoring case, and saves nothing of the batch", async () => {
    const b = await fresh();
    await b.write([{ op: "insert", table: "People", rows: [{ id: "1", loginId: "TP11" }] }]);
    const batch = b.write([
      { op: "insert", table: "Links", rows: [{ id: "x", personId: "1" }] },
      { op: "insert", table: "People", rows: [{ id: "2", loginId: "tp11" }], unique: ["loginId"] },
    ]);
    await expect(batch).rejects.toBeInstanceOf(StoreConflictError);
    await expect(batch).rejects.toMatchObject({ table: "People", column: "loginId" });
    expect((await b.read(["Links"])).Links).toHaveLength(1);
  });

  it("catches a duplicate within one batch", async () => {
    const b = await fresh();
    const batch = b.write([{ op: "insert", table: "People", rows: [{ id: "1", loginId: "X" }, { id: "2", loginId: "x" }], unique: ["loginId"] }]);
    await expect(batch).rejects.toBeInstanceOf(StoreConflictError);
    expect((await b.read(["People"])).People).toHaveLength(1);
  });

  it("updates and deletes by id, and reports a missing row", async () => {
    const b = await fresh();
    await b.write([{ op: "insert", table: "People", rows: [{ id: "1", loginId: "A" }, { id: "2", loginId: "B" }] }]);
    await b.write([{ op: "update", table: "People", id: "1", set: { name: "Kofi" } }, { op: "delete", table: "People", ids: ["2"] }]);
    expect((await b.read(["People"])).People).toEqual([["id", "loginId", "name"], ["1", "A", "Kofi"]]);
    await expect(b.write([{ op: "update", table: "People", id: "nope", set: { name: "x" } }])).rejects.toBeInstanceOf(StoreNotFoundError);
  });

  it("refuses unknown columns, and setup only adds", async () => {
    const b = await fresh();
    await expect(b.write([{ op: "insert", table: "People", rows: [{ id: "1", age: "9" }] }])).rejects.toThrow(/no column age/);
    const r = await b.setup({ People: ["id", "loginId", "name", "phone"] });
    expect(r.addedColumns).toEqual({ People: ["phone"] });
    expect((await b.read(["People"])).People[0]).toEqual(["id", "loginId", "name", "phone"]);
  });
});

describe("RoutingBackend", () => {
  it("sends the moved tables to the database and the rest to the Sheet", async () => {
    const sheet = new MemoryBackend();
    const db = new PostgresBackend(await freshPostgres());
    const b = new RoutingBackend(sheet, db, new Set(["Links"]));
    await b.setup(schema);
    await b.write([
      { op: "insert", table: "People", rows: [{ id: "1", loginId: "A" }] },
      { op: "insert", table: "Links", rows: [{ id: "l", personId: "1" }] },
    ]);
    expect((await sheet.read(["People"])).People).toHaveLength(2);
    await expect(sheet.read(["Links"])).rejects.toThrow();
    expect((await db.read(["Links"])).Links).toEqual([["id", "personId"], ["l", "1"]]);
    expect(Object.keys(await b.read(["People", "Links"])).sort()).toEqual(["Links", "People"]);
  });
});

describe("Postgres safety", () => {
  it("switches on row-level security for every table, so Supabase's public web API can't read them", async () => {
    const sql = await freshPostgres();
    await new PostgresBackend(sql).setup(schema);
    const rows = await sql.query(
      "select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = current_schema() and c.relkind = 'r' order by c.relname",
    );
    expect(rows).toEqual([
      { relname: "Links", relrowsecurity: true },
      { relname: "People", relrowsecurity: true },
    ]);
  });
});
