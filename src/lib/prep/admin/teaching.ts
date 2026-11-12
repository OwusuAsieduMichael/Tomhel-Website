import { insert, newId, remove, type Store } from "@/lib/prep/store";

/**
 * Who teaches what, and the school's classes. Admin only (the callers check the role).
 *
 * A teacher assigned a subject with no class takes it for every class; with a class, only for that class.
 * This is what lets a teacher set work, see the review queue and change marks (see assignments.ts scopeOf).
 */

export class TeachingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeachingError";
  }
}

export async function assignTeacher(store: Store, input: { teacherId: string; subjectId: string; classId: string | null }) {
  const { users, subjects, classes, teacherSubjects } = await store.read("users", "subjects", "classes", "teacherSubjects");
  const teacher = users.find((u) => u.id === input.teacherId);
  if (!teacher || teacher.role !== "teacher") throw new TeachingError("Choose a teacher.");
  if (!subjects.some((s) => s.id === input.subjectId)) throw new TeachingError("Choose a subject.");
  if (input.classId && !classes.some((c) => c.id === input.classId)) throw new TeachingError("Choose a class.");

  const mine = teacherSubjects.filter((ts) => ts.teacherId === teacher.id && ts.subjectId === input.subjectId);
  if (mine.some((ts) => ts.classId === input.classId)) throw new TeachingError(`${teacher.name} already has this.`);
  if (mine.some((ts) => ts.classId === null)) throw new TeachingError(`${teacher.name} already takes this subject for every class.`);

  await store.write([
    insert("teacherSubjects", [{ id: newId(), teacherId: teacher.id, subjectId: input.subjectId, classId: input.classId }]),
    // "Every class" covers the single-class rows, so they go.
    ...(input.classId === null ? [remove("teacherSubjects", mine.map((ts) => ts.id))] : []),
  ]);
}

export async function unassignTeacher(store: Store, assignmentId: string) {
  const { teacherSubjects } = await store.read("teacherSubjects");
  if (!teacherSubjects.some((ts) => ts.id === assignmentId)) throw new TeachingError("That assignment no longer exists.");
  await store.write([remove("teacherSubjects", [assignmentId])]);
}

export async function listTeachingAssignments(store: Store) {
  const { teacherSubjects, users, subjects, classes } = await store.read("teacherSubjects", "users", "subjects", "classes");
  return teacherSubjects
    .map((ts) => {
      const s = subjects.find((x) => x.id === ts.subjectId);
      return {
        id: ts.id,
        teacher: users.find((u) => u.id === ts.teacherId)?.name ?? "Unknown teacher",
        teacherLoginId: users.find((u) => u.id === ts.teacherId)?.loginId ?? "",
        subject: s?.name ?? "Unknown subject",
        sortOrder: s?.sortOrder ?? 999,
        className: ts.classId ? (classes.find((c) => c.id === ts.classId)?.name ?? "Removed class") : "All classes",
      };
    })
    .sort((a, b) => a.teacher.localeCompare(b.teacher) || a.sortOrder - b.sortOrder || a.className.localeCompare(b.className));
}

/** Year group from the name: "JHS 2B" is year 2. */
export function yearGroupOf(name: string): number | null {
  const n = Number(/^JHS\s*([123])/i.exec(name.trim())?.[1]);
  return n || null;
}

export async function addClass(store: Store, input: { name: string; academicYear: string }, now = new Date()) {
  const name = input.name.trim().replace(/\s+/g, " ");
  const yearGroup = yearGroupOf(name);
  if (!yearGroup) throw new TeachingError('Class names start with JHS 1, JHS 2 or JHS 3, e.g. "JHS 2B".');
  if (!/^\d{4}\/\d{4}$/.test(input.academicYear)) throw new TeachingError('The academic year looks like "2026/2027".');
  const { classes } = await store.read("classes");
  if (classes.some((c) => c.name.toUpperCase() === name.toUpperCase() && c.academicYear === input.academicYear)) {
    throw new TeachingError(`${name} already exists for ${input.academicYear}.`);
  }
  await store.write([insert("classes", [{ id: newId(), name, yearGroup, academicYear: input.academicYear, createdAt: now }])]);
}
