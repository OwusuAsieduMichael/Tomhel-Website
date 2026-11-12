import { describe, expect, it } from "vitest";
import { decodeSheet } from "@/lib/prep/store/codec";
import { loadAppsScript, MemoryBackend } from "@/lib/prep/store/backend";
import { insert, newId, remove, Store, StoreConflictError, StoreNotFoundError, update } from "@/lib/prep/store";
import { createTestStore } from "../helpers/store";

const subject = (code: string) => ({ id: newId(), name: `Subject ${code}`, code, autoMarkTheory: true, sortOrder: 0 });

describe("store round trip", () => {
  it("keeps types: numbers, booleans, dates, nulls, lists and text that looks like numbers", async () => {
    const store = await createTestStore();
    const id = newId();
    const created = new Date("2026-11-05T10:30:00.000Z");
    await store.write([
      insert("questions", [
        {
          id,
          code: "0012",
          paperId: null,
          subjectId: "s",
          topicId: null,
          numberLabel: "3(b)(ii)",
          position: 0,
          type: "theory",
          text: '=HYPERLINK("x") and "quotes", commas\nnew lines',
          imageUrls: ["https://example.com/a.png"],
          marks: 2.5,
          status: "draft",
          createdAt: created,
          updatedAt: created,
        },
      ]),
    ]);
    const [q] = (await store.read("questions")).questions;
    expect(q).toMatchObject({ code: "0012", paperId: null, marks: 2.5, imageUrls: ["https://example.com/a.png"], createdAt: created });
    expect(q.text).toContain("=HYPERLINK");
  });

  it("explains a sheet with a missing column or an unreadable cell", () => {
    expect(() => decodeSheet("subjects", [["id", "name"]])).toThrow(/missing the column "code"/);
    expect(() =>
      decodeSheet("subjects", [
        ["id", "name", "code", "autoMarkTheory", "sortOrder"],
        ["1", "Maths", "MATH", "maybe", "0"],
      ]),
    ).toThrow(/autoMarkTheory/);
  });

  it("skips blank rows and accepts hand-typed TRUE/FALSE, extra columns, and spaces", () => {
    const rows = decodeSheet("subjects", [
      ["notes", "id", "name", "code", "autoMarkTheory", "sortOrder"],
      ["hi", "1", "Maths", "MATH", " yes ", " 2 "],
      ["", "", "", "", "", ""],
    ]);
    expect(rows).toEqual([{ id: "1", name: "Maths", code: "MATH", autoMarkTheory: true, sortOrder: 2 }]);
  });
});

describe("write batches (Apps Script logic)", () => {
  it("rejects a duplicate unique value, case-insensitively, including within one batch", async () => {
    const store = await createTestStore();
    await store.write([insert("subjects", [subject("MATH")], { unique: ["code"] })]);
    await expect(store.write([insert("subjects", [subject("math")], { unique: ["code"] })])).rejects.toBeInstanceOf(StoreConflictError);
    await expect(store.write([insert("subjects", [subject("SCI"), subject("SCI")], { unique: ["code"] })])).rejects.toMatchObject({
      column: "code",
      value: "SCI",
    });
  });

  it("is all-or-nothing: a failing op leaves every table untouched", async () => {
    const store = await createTestStore();
    const s = subject("ENG");
    await store.write([insert("subjects", [s])]);
    await expect(
      store.write([update("subjects", s.id, { name: "Changed" }), insert("subjects", [subject("FRE")]), update("subjects", "nope", { name: "x" })]),
    ).rejects.toBeInstanceOf(StoreNotFoundError);
    const { subjects } = await store.read("subjects");
    expect(subjects).toEqual([s]);
  });

  it("deletes by id and ignores empty deletes", async () => {
    const store = await createTestStore();
    const a = subject("A1");
    const b = subject("B1");
    await store.write([insert("subjects", [a, b])]);
    await store.write([remove("subjects", [a.id]), remove("subjects", [])]);
    expect((await store.read("subjects")).subjects.map((s) => s.code)).toEqual(["B1"]);
  });

  it("refuses to read a tab that doesn't exist yet", async () => {
    await expect(new Store(new MemoryBackend()).read("users")).rejects.toThrow(/prep:setup/);
  });
});

describe("Apps Script helpers", () => {
  const gas = loadAppsScript();

  it("stops cells being read as formulas", () => {
    expect(gas.protectCellPure_("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(gas.protectCellPure_("+233 24")).toBe("'+233 24");
    expect(gas.protectCellPure_("Akosua")).toBe("Akosua");
  });

  it("compares secrets without short-circuiting", () => {
    expect(gas.constantTimeEqualPure_("abc", "abc")).toBe(true);
    expect(gas.constantTimeEqualPure_("abc", "abd")).toBe(false);
    expect(gas.constantTimeEqualPure_("abc", "abcd")).toBe(false);
  });
});

describe("columns added later", () => {
  it("reads a missing column that has a default before setup adds it", async () => {
    const { decodeSheet } = await import("@/lib/prep/store/codec");
    const { tables } = await import("@/lib/prep/store");
    const header = Object.keys(tables.assignments.columns).filter((c) => c !== "category");
    expect(decodeSheet("assignments", [header])).toEqual([]);
    const without = Object.keys(tables.users.columns).filter((c) => c !== "role");
    expect(() => decodeSheet("users", [without])).toThrow(/missing the column "role"/);
  });
});
