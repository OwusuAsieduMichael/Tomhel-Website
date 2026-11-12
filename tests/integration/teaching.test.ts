import { beforeAll, describe, expect, it } from "vitest";
import { createAccount } from "@/lib/prep/admin/people";
import { addClass, assignTeacher, listTeachingAssignments, TeachingError, unassignTeacher, yearGroupOf } from "@/lib/prep/admin/teaching";
import { getAssignmentFormOptions } from "@/lib/prep/assignments";
import type { Store } from "@/lib/prep/store";
import { seedDatabase } from "@/lib/prep/seed/seed";
import { createTestStore } from "../helpers/store";

let store: Store;
let teacherId: string;
let subjectId: string;
let c3A: string;

beforeAll(async () => {
  store = await createTestStore();
  await seedDatabase(store, { password: "password-123" });
  ({ id: teacherId } = await createAccount(store, { loginId: "TS99", name: "New Teacher", role: "teacher" }));
  const { subjects, classes } = await store.read("subjects", "classes");
  subjectId = subjects.find((s) => s.code === "SCI")!.id;
  c3A = classes.find((c) => c.name === "JHS 3A")!.id;
});

describe("assigning teachers", () => {
  it("gives a new teacher a subject for one class, then for every class", async () => {
    const actor = { id: teacherId, role: "teacher" as const };
    expect(await getAssignmentFormOptions(store, actor)).toEqual([]);

    await assignTeacher(store, { teacherId, subjectId, classId: c3A });
    expect((await getAssignmentFormOptions(store, actor)).map((s) => [s.name, s.classes.map((c) => c.name)])).toEqual([["Integrated Science", ["JHS 3A"]]]);
    await expect(assignTeacher(store, { teacherId, subjectId, classId: c3A })).rejects.toThrow(/already has this/);

    // "All classes" replaces the single-class row.
    await assignTeacher(store, { teacherId, subjectId, classId: null });
    const mine = (await listTeachingAssignments(store)).filter((a) => a.teacherLoginId === "TS99");
    expect(mine).toEqual([expect.objectContaining({ subject: "Integrated Science", className: "All classes" })]);
    await expect(assignTeacher(store, { teacherId, subjectId, classId: c3A })).rejects.toThrow(/every class/);

    await unassignTeacher(store, mine[0].id);
    expect((await listTeachingAssignments(store)).some((a) => a.teacherLoginId === "TS99")).toBe(false);
  });

  it("only assigns teachers", async () => {
    const { users } = await store.read("users");
    const student = users.find((u) => u.role === "student")!;
    await expect(assignTeacher(store, { teacherId: student.id, subjectId, classId: null })).rejects.toThrow(TeachingError);
  });
});

describe("adding classes", () => {
  it("adds a class, works out its year group and refuses duplicates", async () => {
    expect(yearGroupOf("JHS 2B")).toBe(2);
    expect(yearGroupOf("Basic 6")).toBeNull();
    await addClass(store, { name: "  jhs 2b ", academicYear: "2026/2027" });
    const { classes } = await store.read("classes");
    expect(classes.find((c) => c.name === "jhs 2b")).toMatchObject({ yearGroup: 2, academicYear: "2026/2027" });
    await expect(addClass(store, { name: "JHS 2B", academicYear: "2026/2027" })).rejects.toThrow(/already exists/);
    await expect(addClass(store, { name: "Primary 4", academicYear: "2026/2027" })).rejects.toThrow(/JHS 1/);
    await expect(addClass(store, { name: "JHS 1C", academicYear: "26/27" })).rejects.toThrow(/2026\/2027/);
  });
});
