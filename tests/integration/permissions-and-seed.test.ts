import { beforeAll, describe, expect, it } from "vitest";
import { verifyPassword } from "@/lib/prep/auth/password";
import { assertCanManageSubject, canManageSubject, teacherSubjectIds } from "@/lib/prep/auth/permissions";
import type { Store } from "@/lib/prep/store";
import { seedDatabase } from "@/lib/prep/seed/seed";
import { createTestStore } from "../helpers/store";

let store: Store;

const userBy = async (loginId: string) => (await store.read("users")).users.find((u) => u.loginId === loginId)!;
const subjectId = async (code: string) => (await store.read("subjects")).subjects.find((s) => s.code === code)!.id;
const classId = async (name: string) => (await store.read("classes")).classes.find((c) => c.name === name)!.id;

beforeAll(async () => {
  store = await createTestStore();
  await seedDatabase(store, { password: "first-password" });
});

describe("seed", () => {
  it("creates the demo data set", async () => {
    const { users, classes, subjects } = await store.read("users", "classes", "subjects");
    expect(users.filter((u) => u.role === "student")).toHaveLength(10);
    expect(users.filter((u) => u.role === "teacher")).toHaveLength(3);
    expect(users.filter((u) => u.role === "admin")).toHaveLength(1);
    expect(classes).toHaveLength(2);
    expect(subjects).toHaveLength(10);
  });

  it("marks French and Twi as not auto-marked", async () => {
    const { subjects } = await store.read("subjects");
    expect(subjects.filter((s) => !s.autoMarkTheory).map((s) => s.code).sort()).toEqual(["FRE", "TWI"]);
  });

  it("gives every MCQ exactly one correct option and every theory question marking points that add up", async () => {
    const { questions, mcqOptions, markingPoints } = await store.read("questions", "mcqOptions", "markingPoints");
    expect(questions).toHaveLength(7);
    for (const q of questions) {
      expect(q.status).toBe("approved");
      if (q.type === "mcq") {
        expect(mcqOptions.filter((o) => o.questionId === q.id && o.isCorrect)).toHaveLength(1);
      } else {
        expect(markingPoints.filter((p) => p.questionId === q.id).reduce((s, p) => s + p.marks, 0)).toBe(q.marks);
      }
    }
  });

  it("is idempotent and does not reset passwords", async () => {
    const before = await store.read("questions", "mcqOptions", "topics");
    const summary = await seedDatabase(store, { password: "second-password" });
    const after = await store.read("questions", "mcqOptions", "teacherSubjects");
    expect(after.questions).toHaveLength(before.questions.length);
    expect(after.mcqOptions).toHaveLength(before.mcqOptions.length);
    expect(summary.users).toBe(14);
    expect(after.teacherSubjects).toHaveLength(7);
    expect(await verifyPassword("first-password", (await userBy("S0001")).passwordHash)).toBe(true);
  });
});

describe("subject permissions", () => {
  it("lets a teacher manage only their own subjects", async () => {
    const t001 = await userBy("T001"); // English, French
    expect(await canManageSubject(store, t001, await subjectId("ENG"))).toBe(true);
    expect(await canManageSubject(store, t001, await subjectId("FRE"))).toBe(true);
    expect(await canManageSubject(store, t001, await subjectId("MATH"))).toBe(false);
    await expect(assertCanManageSubject(store, t001, await subjectId("MATH"))).rejects.toThrow(/permission/);
  });

  it("respects class-scoped assignments", async () => {
    const t002 = await userBy("T002"); // Science for JHS 3B only
    const t003 = await userBy("T003"); // Science for JHS 3A only
    const sci = await subjectId("SCI");
    const a = await classId("JHS 3A");
    const b = await classId("JHS 3B");

    expect(await canManageSubject(store, t002, sci, b)).toBe(true);
    expect(await canManageSubject(store, t002, sci, a)).toBe(false);
    expect(await canManageSubject(store, t003, sci, a)).toBe(true);
    expect(await canManageSubject(store, t003, sci, b)).toBe(false);
    // An all-classes assignment covers any class.
    expect(await canManageSubject(store, t002, await subjectId("MATH"), a)).toBe(true);
  });

  it("lets admins manage everything and students nothing", async () => {
    const eng = await subjectId("ENG");
    expect(await canManageSubject(store, await userBy("A0001"), eng)).toBe(true);
    expect(await canManageSubject(store, await userBy("S0001"), eng)).toBe(false);
  });

  it("lists a teacher's subjects", async () => {
    const ids = await teacherSubjectIds(store, (await userBy("T003")).id);
    expect(ids.sort()).toEqual([await subjectId("SCI"), await subjectId("SOC"), await subjectId("TWI")].sort());
  });
});
