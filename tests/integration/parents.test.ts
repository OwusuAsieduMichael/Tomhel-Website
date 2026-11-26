import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountError, createAccount, importAccounts, resetPassword, setAccountActive } from "@/lib/prep/admin/people";
import { authenticate } from "@/lib/prep/auth/login";
import { validateSessionToken } from "@/lib/prep/auth/session";
import {
  childOf,
  childrenOf,
  ensureParents,
  listParents,
  moveChildToParent,
  ParentError,
  parentLoginIdFor,
  studentsWithoutParents,
} from "@/lib/prep/parents";
import { insert, newId, type Store } from "@/lib/prep/store";
import { createRoutedTestStore } from "../helpers/store";

// The first test starts an in-memory Postgres, which can take a while on a busy machine.
vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

let store: Store;
let classId: string;

beforeEach(async () => {
  // Parents live in Postgres here, students in the "Sheet": as in production with PREP_DATABASE_URL set.
  store = await createRoutedTestStore();
  classId = newId();
  await store.write([insert("classes", [{ id: classId, name: "JHS 3", yearGroup: 3, academicYear: "2026/2027", createdAt: new Date() }])]);
});

const addStudent = (loginId: string, name: string) => createAccount(store, { loginId, name, role: "student", classId });

describe("Parent IDs", () => {
  it("follow the Student ID: TMH11 -> TP11", () => {
    expect(parentLoginIdFor("TMH11")).toBe("TP11");
    expect(parentLoginIdFor("tmh011")).toBe("TP011");
    expect(parentLoginIdFor("ABC")).toBe("TP-ABC");
  });
});

describe("parent accounts", () => {
  it("are made with each new student, with their own temporary password", async () => {
    const s = await addStudent("TMH11", "Ama Owusu");
    expect(s.parent).toMatchObject({ loginId: "TP11", studentLoginId: "TMH11" });
    expect(s.parent!.tempPassword).not.toBe(s.tempPassword);

    const login = await authenticate(store, "tp11", s.parent!.tempPassword);
    expect(login).toMatchObject({ ok: true, role: "parent" });
    // The student's password does not open the parent account, nor the other way round.
    expect(await authenticate(store, "TP11", s.tempPassword)).toMatchObject({ ok: false });
    expect(await authenticate(store, "TMH11", s.parent!.tempPassword)).toMatchObject({ ok: false });

    const session = await validateSessionToken(store, login.ok ? login.token : "");
    expect(session?.user).toMatchObject({ role: "parent", loginId: "TP11", name: "Parent of Ama Owusu", classId: null, mustChangePassword: true });
    expect((await childrenOf(store, session!.user.id)).map((c) => c.loginId)).toEqual(["TMH11"]);
  });

  it("aren't made for staff", async () => {
    const t = await createAccount(store, { loginId: "T001", name: "Mr Mensah", role: "teacher" });
    expect(t.parent).toBeUndefined();
    expect(await listParents(store)).toEqual([]);
  });

  it("come with every student of an imported class list, in the result", async () => {
    const r = await importAccounts(store, ["Student ID,Name,Class", "TMH20,Kofi Boateng,JHS 3", "TMH21,Akos Boateng,JHS 3"].join("\n"), "student");
    expect(r.problems).toEqual([]);
    expect(r.created.map((c) => c.parent?.loginId)).toEqual(["TP20", "TP21"]);
    // Re-importing the same list makes no second parent.
    const again = await importAccounts(store, ["Student ID,Name,Class", "TMH20,Kofi Boateng,JHS 3"].join("\n"), "student");
    expect(again.created).toEqual([]);
    expect(await listParents(store)).toHaveLength(2);
  });

  it("get -2 when two Student IDs give the same Parent ID", async () => {
    await addStudent("TMH11", "Ama");
    const other = await addStudent("ABC11", "Yaw");
    expect(other.parent?.loginId).toBe("TP11-2");
  });

  it("can be made for students who have none (existing students), safely repeated", async () => {
    // A student from before parent accounts existed.
    await store.write([
      insert("users", [
        { id: newId(), loginId: "TMH30", name: "Old Student", role: "student", classId, passwordHash: "x", active: true, mustChangePassword: false, failedLoginCount: 0, lockedUntil: null, lastLoginAt: null, sessionVersion: 1, createdAt: new Date() },
      ]),
    ]);
    const missing = await studentsWithoutParents(store);
    expect(missing.map((s) => s.loginId)).toEqual(["TMH30"]);
    const made = await ensureParents(store, missing.map((s) => s.id), () => "temp-pass");
    expect(made.map((m) => m.loginId)).toEqual(["TP30"]);
    expect(await ensureParents(store, missing.map((s) => s.id), () => "temp-pass")).toEqual([]);
    expect(await studentsWithoutParents(store)).toEqual([]);
  });

  it("keep their IDs to themselves: a student or staff ID can't be a parent's", async () => {
    await addStudent("TMH11", "Ama");
    await expect(createAccount(store, { loginId: "tp11", name: "X", role: "teacher" })).rejects.toThrow(AccountError);
    const r = await importAccounts(store, ["Staff ID,Name", "TP11,Someone"].join("\n"), "teacher");
    expect(r.problems[0].message).toMatch(/parent's ID/);
  });

  it("can have their password reset and be switched off, like any account", async () => {
    const s = await addStudent("TMH11", "Ama");
    const [p] = await listParents(store);
    const reset = await resetPassword(store, p.id);
    expect(reset.loginId).toBe("TP11");
    expect(await authenticate(store, "TP11", s.parent!.tempPassword)).toMatchObject({ ok: false });
    expect(await authenticate(store, "TP11", reset.tempPassword)).toMatchObject({ ok: true });

    await setAccountActive(store, "admin-id", p.id, false);
    expect(await authenticate(store, "TP11", reset.tempPassword)).toMatchObject({ ok: false, reason: "inactive" });
  });
});

describe("siblings", () => {
  it("can share one parent account; the sibling's own empty account is removed", async () => {
    await addStudent("TMH11", "Ama Boateng");
    await addStudent("TMH12", "Kojo Boateng");
    const tp11 = (await listParents(store)).find((p) => p.loginId === "TP11")!;

    const r = await moveChildToParent(store, "tmh12", tp11.id);
    expect(r.removedParent).toBe("TP12");
    const parents = await listParents(store);
    expect(parents.map((p) => [p.loginId, p.children.map((c) => c.loginId)])).toEqual([["TP11", ["TMH11", "TMH12"]]]);
    await expect(moveChildToParent(store, "TMH12", tp11.id)).rejects.toThrow(/already/);
  });
});

describe("what a parent can see", () => {
  it("only their own children", async () => {
    const a = await addStudent("TMH11", "Ama");
    const b = await addStudent("TMH12", "Kojo");
    const [pa] = (await listParents(store)).filter((p) => p.loginId === "TP11");
    expect((await childOf(store, pa.id, a.id)).loginId).toBe("TMH11");
    await expect(childOf(store, pa.id, b.id)).rejects.toBeInstanceOf(ParentError);
  });
});
