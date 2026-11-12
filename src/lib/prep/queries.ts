import type { Store } from "@/lib/prep/store";

/** Read models for /prep pages. The sheet is small, so each query loads whole tables and filters in code. */

const bySortOrder = <T extends { sortOrder: number }>(a: T, b: T) => a.sortOrder - b.sortOrder;

/** Subjects with the past papers students can open (only papers that have approved questions). */
export async function getPracticePapersBySubject(store: Store) {
  const { subjects, papers, questions } = await store.read("subjects", "papers", "questions");
  const approved = new Map<string, number>();
  for (const q of questions) if (q.paperId && q.status === "approved") approved.set(q.paperId, (approved.get(q.paperId) ?? 0) + 1);

  return [...subjects].sort(bySortOrder).map((s) => ({
    ...s,
    papers: papers
      .filter((p) => p.subjectId === s.id && approved.has(p.id))
      .sort((a, b) => b.year - a.year || a.paperNo - b.paperNo)
      .map((p) => ({ id: p.id, subjectId: p.subjectId, year: p.year, paperNo: p.paperNo, questionCount: approved.get(p.id)! })),
  }));
}

export async function getTeacherSubjectsWithClasses(store: Store, teacherId: string) {
  const { teacherSubjects, subjects, classes } = await store.read("teacherSubjects", "subjects", "classes");
  return teacherSubjects
    .filter((ts) => ts.teacherId === teacherId)
    .flatMap((ts) => {
      const s = subjects.find((x) => x.id === ts.subjectId);
      if (!s) return [];
      const c = ts.classId ? classes.find((x) => x.id === ts.classId) : undefined;
      return [{ subjectId: s.id, subjectName: s.name, autoMarkTheory: s.autoMarkTheory, sortOrder: s.sortOrder, className: c?.name ?? null }];
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || (a.className ?? "").localeCompare(b.className ?? ""))
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ sortOrder, ...r }) => r);
}

export async function getStudentClass(store: Store, classId: string | null) {
  if (!classId) return null;
  const { classes } = await store.read("classes");
  return classes.find((c) => c.id === classId) ?? null;
}

export async function getAdminCounts(store: Store) {
  const { users, classes, papers, questions } = await store.read("users", "classes", "papers", "questions");
  const roleCount = (r: string) => users.filter((u) => u.role === r).length;
  return {
    students: roleCount("student"),
    teachers: roleCount("teacher"),
    admins: roleCount("admin"),
    classes: classes.length,
    papers: papers.length,
    approvedQuestions: questions.filter((q) => q.status === "approved").length,
    draftQuestions: questions.filter((q) => q.status === "draft").length,
  };
}

const roleOrder = { student: 0, teacher: 1, admin: 2 } as const;

export async function listPeople(store: Store) {
  const { users, classes } = await store.read("users", "classes");
  return users
    .map((u) => ({
      id: u.id,
      name: u.name,
      loginId: u.loginId,
      role: u.role,
      active: u.active,
      mustChangePassword: u.mustChangePassword,
      className: classes.find((c) => c.id === u.classId)?.name ?? null,
      lastLoginAt: u.lastLoginAt,
    }))
    .sort((a, b) => roleOrder[a.role] - roleOrder[b.role] || a.loginId.localeCompare(b.loginId));
}

export async function listClassesWithCounts(store: Store) {
  const { classes, users } = await store.read("classes", "users");
  return classes
    .map((c) => ({
      id: c.id,
      name: c.name,
      yearGroup: c.yearGroup,
      academicYear: c.academicYear,
      students: users.filter((u) => u.role === "student" && u.classId === c.id).length,
    }))
    .sort((a, b) => a.yearGroup - b.yearGroup || a.name.localeCompare(b.name));
}

export async function listSubjectsWithTeachers(store: Store) {
  const { subjects, teacherSubjects, users, classes } = await store.read("subjects", "teacherSubjects", "users", "classes");
  return [...subjects].sort(bySortOrder).map((s) => ({
    ...s,
    teachers: teacherSubjects
      .filter((ts) => ts.subjectId === s.id)
      .map((ts) => {
        const teacher = users.find((u) => u.id === ts.teacherId)?.name ?? "Unknown teacher";
        const className = ts.classId ? classes.find((c) => c.id === ts.classId)?.name : undefined;
        return className ? `${teacher} (${className})` : teacher;
      }),
  }));
}

export async function listPapersWithCounts(store: Store) {
  const { papers, subjects, questions } = await store.read("papers", "subjects", "questions");
  return papers
    .map((p) => {
      const s = subjects.find((x) => x.id === p.subjectId);
      const qs = questions.filter((q) => q.paperId === p.id);
      return {
        id: p.id,
        subject: s?.name ?? "Unknown subject",
        sortOrder: s?.sortOrder ?? 999,
        year: p.year,
        paperNo: p.paperNo,
        questions: qs.length,
        approved: qs.filter((q) => q.status === "approved").length,
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || b.year - a.year || a.paperNo - b.paperNo);
}
