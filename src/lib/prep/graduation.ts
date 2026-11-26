import { insert, newId, remove, type Graduation, type Store } from "@/lib/prep/store";

/**
 * Graduation. When the final-year class finishes, an admin graduates the class: every student in it gets a
 * graduation row with the date and a message. From that date on, the student's home page and their parents'
 * home page show the congratulations. Students keep their accounts; nothing else changes.
 */

export const FINAL_YEAR_GROUP = 3;

export const DEFAULT_GRADUATION_MESSAGE =
  "Congratulations on completing your Junior High School education at Tomhel Preparatory School. We are proud of you, and we wish you every success in your future endeavours. God bless you.";

export class GraduationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GraduationError";
  }
}

/** Graduates every student in the class who hasn't graduated yet. Returns how many were added. */
export async function graduateClass(store: Store, adminId: string, classId: string, input: { graduatedOn: Date; message: string }) {
  const message = input.message.trim() || DEFAULT_GRADUATION_MESSAGE;
  if (message.length > 600) throw new GraduationError("Keep the message under 600 characters.");
  if (Number.isNaN(input.graduatedOn.getTime())) throw new GraduationError("Choose the graduation date.");
  const { classes, users, graduations } = await store.read("classes", "users", "graduations");
  const schoolClass = classes.find((c) => c.id === classId);
  if (!schoolClass) throw new GraduationError("That class no longer exists.");
  const done = new Set(graduations.map((g) => g.studentId));
  const students = users.filter((u) => u.role === "student" && u.classId === classId && !done.has(u.id));
  if (!students.length) throw new GraduationError(`Every student in ${schoolClass.name} has already graduated, or the class is empty.`);
  const now = new Date();
  await store.write([
    insert(
      "graduations",
      students.map(
        (s): Graduation => ({
          id: newId(),
          studentId: s.id,
          classId,
          className: schoolClass.name,
          academicYear: schoolClass.academicYear,
          graduatedOn: input.graduatedOn,
          message,
          createdBy: adminId,
          createdAt: now,
        }),
      ),
    ),
  ]);
  return { added: students.length };
}

/** Takes back a class's graduation (for example, the wrong class was chosen). */
export async function undoGraduation(store: Store, classId: string) {
  const { graduations } = await store.read("graduations");
  const ids = graduations.filter((g) => g.classId === classId).map((g) => g.id);
  await store.write([remove("graduations", ids)]);
  return { removed: ids.length };
}

/** The student's graduation, once its date has come. */
export async function graduationOf(store: Store, studentId: string, now = new Date()): Promise<Graduation | null> {
  const { graduations } = await store.read("graduations");
  return graduations.find((g) => g.studentId === studentId && g.graduatedOn.getTime() <= now.getTime()) ?? null;
}

/** Final-year classes for the admin, with how many students have graduated and when. */
export async function finalYearClasses(store: Store) {
  const { classes, users, graduations } = await store.read("classes", "users", "graduations");
  return classes
    .filter((c) => c.yearGroup === FINAL_YEAR_GROUP)
    .sort((a, b) => b.academicYear.localeCompare(a.academicYear) || a.name.localeCompare(b.name))
    .map((c) => {
      const students = users.filter((u) => u.role === "student" && u.classId === c.id);
      const done = graduations.filter((g) => g.classId === c.id);
      return {
        id: c.id,
        name: c.name,
        academicYear: c.academicYear,
        students: students.length,
        graduated: done.length,
        graduatedOn: done[0]?.graduatedOn ?? null,
        message: done[0]?.message ?? null,
      };
    });
}

/** "Class of 2026" from an academic year such as "2025/2026". */
export function classOf(academicYear: string): string {
  const year = /(\d{4})\s*$/.exec(academicYear)?.[1];
  return year ? `Class of ${year}` : "";
}
