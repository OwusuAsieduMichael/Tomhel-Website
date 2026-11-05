import type { Role, Store } from "@/lib/prep/store";

/** Where each role lands after logging in. */
export const roleHome: Record<Role, string> = {
  student: "/prep/student",
  teacher: "/prep/teacher",
  admin: "/prep/admin",
};

type Actor = { id: string; role: Role };

/** Subject IDs a teacher is assigned to (any class). */
export async function teacherSubjectIds(store: Store, teacherId: string): Promise<string[]> {
  const { teacherSubjects } = await store.read("teacherSubjects");
  return [...new Set(teacherSubjects.filter((ts) => ts.teacherId === teacherId).map((ts) => ts.subjectId))];
}

/**
 * Can this user manage (create work for, review, override marks in) the subject?
 * Admins: always. Teachers: only subjects assigned to them, optionally for a specific class.
 * Students: never. Students *practise* every subject, but practising is not managing.
 */
export async function canManageSubject(store: Store, actor: Actor, subjectId: string, classId?: string): Promise<boolean> {
  if (actor.role === "admin") return true;
  if (actor.role !== "teacher") return false;
  const { teacherSubjects } = await store.read("teacherSubjects");
  return teacherSubjects.some(
    (ts) => ts.teacherId === actor.id && ts.subjectId === subjectId && (!classId || ts.classId === null || ts.classId === classId),
  );
}

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Throwing variant for server actions and route handlers. */
export async function assertCanManageSubject(store: Store, actor: Actor, subjectId: string, classId?: string) {
  if (!(await canManageSubject(store, actor, subjectId, classId))) throw new ForbiddenError();
}
