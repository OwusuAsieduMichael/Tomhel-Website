import { importPaper } from "@/lib/prep/admin/question-bank";
import { newUserRow } from "@/lib/prep/admin/people";
import { hashPassword } from "@/lib/prep/auth/password";
import { insert, newId, update, type Store, type WriteOp } from "@/lib/prep/store";
import { ACADEMIC_YEAR, seedAdmin, seedClasses, seedPapers, seedStudents, seedSubjects, seedTeachers } from "./data";

export type SeedSummary = { classes: number; subjects: number; users: number; papers: number; questions: number };

/**
 * Idempotent: re-running updates names/content but never duplicates rows and never resets
 * an existing user's password. Seed papers are approved so students can see them straight away.
 */
export async function seedDatabase(store: Store, opts: { password: string }): Promise<SeedSummary> {
  const passwordHash = await hashPassword(opts.password);
  const now = new Date();
  const existing = await store.read("subjects", "classes", "users", "teacherSubjects");
  const ops: WriteOp[] = [];

  // Subjects
  const subjectIds = new Map<string, string>();
  for (const [sortOrder, s] of seedSubjects.entries()) {
    const found = existing.subjects.find((x) => x.code === s.code);
    const id = found?.id ?? newId();
    const fields = { name: s.name, autoMarkTheory: s.autoMarkTheory, sortOrder };
    ops.push(found ? update("subjects", id, fields) : insert("subjects", [{ id, code: s.code, ...fields }], { unique: ["code"] }));
    subjectIds.set(s.code, id);
  }

  // Classes
  const classIds = new Map<string, string>();
  for (const c of seedClasses) {
    const found = existing.classes.find((x) => x.name === c.name && x.academicYear === ACADEMIC_YEAR);
    if (found) {
      ops.push(update("classes", found.id, { yearGroup: c.yearGroup }));
      classIds.set(c.name, found.id);
    } else {
      const id = newId();
      ops.push(insert("classes", [{ id, name: c.name, yearGroup: c.yearGroup, academicYear: ACADEMIC_YEAR, createdAt: now }]));
      classIds.set(c.name, id);
    }
  }

  // Users (existing users keep their password)
  const userIds = new Map<string, string>();
  for (const u of [seedAdmin, ...seedStudents, ...seedTeachers]) {
    const classId = u.className ? classIds.get(u.className)! : null;
    const found = existing.users.find((x) => x.loginId === u.loginId);
    if (found) {
      ops.push(update("users", found.id, { name: u.name, role: u.role, classId }));
      userIds.set(u.loginId, found.id);
    } else {
      const row = newUserRow({ loginId: u.loginId, name: u.name, role: u.role, classId, passwordHash });
      ops.push(insert("users", [row], { unique: ["loginId"] }));
      userIds.set(u.loginId, row.id);
    }
  }

  // Teacher subject assignments
  for (const t of seedTeachers) {
    const teacherId = userIds.get(t.loginId)!;
    for (const ts of t.subjects) {
      const subjectId = subjectIds.get(ts.code)!;
      const classId = ts.className ? classIds.get(ts.className)! : null;
      const has = existing.teacherSubjects.some((x) => x.teacherId === teacherId && x.subjectId === subjectId && x.classId === classId);
      if (!has) ops.push(insert("teacherSubjects", [{ id: newId(), teacherId, subjectId, classId }]));
    }
  }

  await store.write(ops);

  // Papers go through the importer (same validation as real papers), then get approved.
  let questionCount = 0;
  for (const p of seedPapers) {
    const result = await importPaper(store, p, now);
    if (!result.ok) throw new Error(`Seed paper ${p.subjectCode} ${p.year} P${p.paperNo} is invalid: ${result.problems.join(" ")}`);
    const { questions } = await store.read("questions");
    const drafts = questions.filter((q) => q.paperId === result.paperId && q.status === "draft");
    await store.write(drafts.map((q) => update("questions", q.id, { status: "approved" })));
    questionCount += p.questions.length;
  }

  const after = await store.read("classes", "subjects", "users", "papers");
  return {
    classes: after.classes.length,
    subjects: after.subjects.length,
    users: after.users.length,
    papers: after.papers.length,
    questions: questionCount,
  };
}
