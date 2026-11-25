import { beforeAll, describe, expect, it } from "vitest";
import {
  AccountError,
  createAccount,
  generateTempPassword,
  importAccounts,
  importStudents,
  parseCsv,
  parseAccountCsv,
  parseStudentCsv,
  resetPassword,
  setAccountActive,
} from "@/lib/prep/admin/people";
import { authenticate } from "@/lib/prep/auth/login";
import { validateSessionToken } from "@/lib/prep/auth/session";
import { update, type Store } from "@/lib/prep/store";
import { seedDatabase } from "@/lib/prep/seed/seed";
import { createTestStore } from "../helpers/store";

const PASSWORD = "seed-password-1";
let store: Store;

const user = async (loginId: string) => (await store.read("users")).users.find((u) => u.loginId === loginId);
const classId = async (name: string) => (await store.read("classes")).classes.find((c) => c.name === name)!.id;

beforeAll(async () => {
  store = await createTestStore();
  await seedDatabase(store, { password: PASSWORD });
});

describe("temporary passwords", () => {
  it("are 9 characters, avoid look-alike characters, and differ each time", () => {
    const a = generateTempPassword();
    expect(a).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}$/);
    expect(a).not.toMatch(/[01ilo]/);
    expect(new Set(Array.from({ length: 50 }, generateTempPassword)).size).toBe(50);
  });
});

describe("createAccount", () => {
  it("creates a student who can log in with the temp password and must change it", async () => {
    const { tempPassword } = await createAccount(store, {
      loginId: " s0100 ",
      name: "  Ama   Serwaa ",
      role: "student",
      classId: await classId("JHS 3A"),
    });
    expect(await user("S0100")).toMatchObject({ name: "Ama Serwaa", role: "student", mustChangePassword: true });
    expect((await authenticate(store, "S0100", tempPassword)).ok).toBe(true);
  });

  it("refuses duplicate IDs (any case), bad IDs, and students without a class", async () => {
    const a = await classId("JHS 3A");
    await expect(createAccount(store, { loginId: "s0001", name: "X", role: "student", classId: a })).rejects.toThrow("already in use");
    await expect(createAccount(store, { loginId: "S 01", name: "X", role: "teacher" })).rejects.toBeInstanceOf(AccountError);
    await expect(createAccount(store, { loginId: "S0200", name: "X", role: "student" })).rejects.toThrow("Choose a class");
  });

  it("never gives staff a class", async () => {
    await createAccount(store, { loginId: "T100", name: "New Teacher", role: "teacher", classId: await classId("JHS 3A") });
    expect((await user("T100"))!.classId).toBeNull();
  });
});

describe("resetPassword and setAccountActive", () => {
  it("reset replaces the password, clears lockout, and signs the user out", async () => {
    const login = await authenticate(store, "S0002", PASSWORD);
    expect(login.ok).toBe(true);
    const u = (await user("S0002"))!;
    await store.write([update("users", u.id, { failedLoginCount: 3, lockedUntil: new Date(Date.now() + 60_000) })]);

    const { tempPassword } = await resetPassword(store, u.id);
    if (login.ok) expect(await validateSessionToken(store, login.token)).toBeNull();
    expect((await authenticate(store, "S0002", PASSWORD)).ok).toBe(false);
    expect((await authenticate(store, "S0002", tempPassword)).ok).toBe(true);
    expect((await user("S0002"))!.mustChangePassword).toBe(true);
  });

  it("switching off signs the user out; admins can't switch themselves off", async () => {
    const admin = (await user("A0001"))!;
    const s = (await user("S0003"))!;
    const login = await authenticate(store, "S0003", PASSWORD);
    await setAccountActive(store, admin.id, s.id, false);
    if (login.ok) expect(await validateSessionToken(store, login.token)).toBeNull();
    expect(await authenticate(store, "S0003", PASSWORD)).toEqual({ ok: false, reason: "inactive" });

    await setAccountActive(store, admin.id, s.id, true);
    expect((await authenticate(store, "S0003", PASSWORD)).ok).toBe(true);

    await expect(setAccountActive(store, admin.id, admin.id, false)).rejects.toThrow("your own account");
  });
});

describe("CSV parsing", () => {
  it("handles quotes, embedded commas, CRLF and a BOM", () => {
    expect(parseCsv('﻿a,"b, c","say ""hi"""\r\n1,2,3')).toEqual([
      ["a", "b, c", 'say "hi"'],
      ["1", "2", "3"],
    ]);
  });

  it("finds columns by header name in any order and reports bad lines", () => {
    const { rows, problems } = parseStudentCsv(
      ["Class,Name,Student ID,Phone", "JHS 3A,Kofi Mensah,s0300,024", "", "JHS 3A,,S0301,", "JHS 3B,Esi,S0300,", "JHS 3B,Bad Id,S 9,"].join("\n"),
    );
    expect(rows).toEqual([{ line: 2, loginId: "S0300", name: "Kofi Mensah", className: "JHS 3A" }]);
    expect(problems.map((p) => p.line)).toEqual([4, 5, 6]);
    expect(problems[1].message).toContain("also on line 2");
  });

  it("explains a missing header column", () => {
    expect(parseStudentCsv("Name,Class\nA,JHS 3A").problems[0].message).toContain("Student ID");
  });
});

describe("importStudents", () => {
  it("creates new students, updates moved ones, leaves passwords alone", async () => {
    const result = await importStudents(
      store,
      ["Student ID,Name,Class", "S0400,Nana Yaa,jhs 3b", "S0006,Yaw Frimpong,JHS 3A", "S0007,Adwoa Sarpong,JHS 3B"].join("\n"),
    );
    expect(result.problems).toEqual([]);
    expect(result.created).toEqual([expect.objectContaining({ loginId: "S0400", name: "Nana Yaa" })]);
    expect(result.updated).toBe(1);
    expect(result.unchanged).toBe(1);

    expect((await user("S0400"))!.classId).toBe(await classId("JHS 3B"));
    expect((await user("S0006"))!.classId).toBe(await classId("JHS 3A"));
    expect((await authenticate(store, "S0006", PASSWORD)).ok).toBe(true); // password untouched
    expect((await authenticate(store, "S0400", result.created[0].tempPassword)).ok).toBe(true);
  });

  it("saves nothing if any row is wrong", async () => {
    const result = await importStudents(store, ["Student ID,Name,Class", "S0500,Good Row,JHS 3A", "S0501,Bad Class,JHS 9Z", "T001,Staff,JHS 3A"].join("\n"));
    expect(result.created).toEqual([]);
    expect(result.problems.map((p) => p.line)).toEqual([3, 4]);
    expect(await user("S0500")).toBeUndefined();
  });
});

describe("importAccounts for staff", () => {
  it("creates teachers from a staff list (no class), renames existing ones, keeps passwords", async () => {
    const result = await importAccounts(store, ["Staff ID,Name", "T090,Kofi Mensah", "T001,Ama Mensah-Owusu"].join("\n"), "teacher");
    expect(result.problems).toEqual([]);
    expect(result.role).toBe("teacher");
    expect(result.created).toEqual([expect.objectContaining({ loginId: "T090", name: "Kofi Mensah", className: "" })]);
    expect(result.updated).toBe(1);

    const t090 = (await user("T090"))!;
    expect(t090).toMatchObject({ role: "teacher", classId: null, mustChangePassword: true });
    expect((await user("T001"))!.name).toBe("Ama Mensah-Owusu");
    expect((await authenticate(store, "T001", PASSWORD)).ok).toBe(true); // password untouched
    expect((await authenticate(store, "T090", result.created[0].tempPassword)).ok).toBe(true);
  });

  it("creates admins too", async () => {
    const result = await importAccounts(store, "Staff ID,Name\nA0090,Deputy Head\n", "admin");
    expect(result.problems).toEqual([]);
    expect((await user("A0090"))!.role).toBe("admin");
  });

  it("refuses an ID that belongs to another role, and names the missing columns", async () => {
    const clash = await importAccounts(store, "Staff ID,Name\nS0006,Not A Teacher\n", "teacher");
    expect(clash.problems).toEqual([{ line: 2, message: "S0006 belongs to a student account." }]);
    expect((await user("S0006"))!.role).toBe("student");

    const asStudents = await importAccounts(store, "Student ID,Name,Class\nT090,Kofi Mensah,JHS 3A\n", "student");
    expect(asStudents.problems[0].message).toContain("staff account");

    expect(parseAccountCsv("Name\nKofi", "teacher").problems[0].message).toBe("The header row needs these columns: Staff ID.");
    expect(parseAccountCsv("Staff ID,Name\n", "admin").problems[0].message).toBe("No admins found under the header row.");
  });
});
