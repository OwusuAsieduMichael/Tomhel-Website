import { beforeAll, describe, expect, it } from "vitest";
import {
  getAdminCounts,
  getPracticePapersBySubject,
  getTeacherSubjectsWithClasses,
  listClassesWithCounts,
  listPapersWithCounts,
  listPeople,
  listSubjectsWithTeachers,
} from "@/lib/prep/queries";
import type { Store } from "@/lib/prep/store";
import { seedDatabase } from "@/lib/prep/seed/seed";
import { createTestStore } from "../helpers/store";

let store: Store;

beforeAll(async () => {
  store = await createTestStore();
  await seedDatabase(store, { password: "password-123" });
});

describe("page queries", () => {
  it("lists all 10 subjects for practice, with the two sample papers", async () => {
    const subjects = await getPracticePapersBySubject(store);
    expect(subjects).toHaveLength(10);
    expect(subjects.find((s) => s.code === "MATH")!.papers).toEqual([expect.objectContaining({ year: 2023, paperNo: 1, questionCount: 5 })]);
    expect(subjects.find((s) => s.code === "SCI")!.papers).toEqual([expect.objectContaining({ year: 2023, paperNo: 2, questionCount: 2 })]);
  });

  it("shows a teacher only their own subjects", async () => {
    const t002 = (await store.read("users")).users.find((u) => u.loginId === "T002")!;
    const rows = await getTeacherSubjectsWithClasses(store, t002.id);
    expect(rows.map((r) => [r.subjectName, r.className])).toEqual([
      ["Mathematics", null],
      ["Integrated Science", "JHS 3B"],
    ]);
  });

  it("counts people, classes and questions for the admin", async () => {
    expect(await getAdminCounts(store)).toEqual({
      students: 10,
      teachers: 3,
      admins: 1,
      classes: 2,
      papers: 2,
      approvedQuestions: 7,
      draftQuestions: 0,
    });
    const people = await listPeople(store);
    expect(people).toHaveLength(14);
    expect(people.map((p) => p.role)).toEqual([...Array(10).fill("student"), ...Array(3).fill("teacher"), "admin"]);
    expect((await listClassesWithCounts(store)).map((c) => [c.name, c.students])).toEqual([
      ["JHS 3A", 5],
      ["JHS 3B", 5],
    ]);
    const sci = (await listSubjectsWithTeachers(store)).find((s) => s.code === "SCI")!;
    expect(sci.teachers.sort()).toEqual(["Kwame Boateng (JHS 3B)", "Yaw Owusu (JHS 3A)"]);
    expect(await listPapersWithCounts(store)).toHaveLength(2);
  });
});
