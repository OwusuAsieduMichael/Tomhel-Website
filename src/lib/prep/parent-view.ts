import { listStudentAssignments } from "@/lib/prep/assignments";
import { listStudentAttempts } from "@/lib/prep/practice/attempts";
import type { Store, User } from "@/lib/prep/store";

/**
 * What a parent sees of one child: the same records the child sees, read-only.
 * Self-practice (BECE past papers) and set work (quizzes, assignments) are kept apart.
 */
export async function childOverview(store: Store, child: Pick<User, "id" | "classId">, now = new Date()) {
  const [attempts, work] = await Promise.all([listStudentAttempts(store, child.id), listStudentAssignments(store, child, now)]);
  const practice = attempts.filter((a) => !a.assigned);
  return { practice, work, summary: summarise(attempts) };
}

type Scored = { status: string; score: number | null; maxScore: number | null; pendingMarks: number | null };

/** Marked share of a finished attempt (0-100), or null while every mark is still with a teacher. */
export function percent(a: Scored): number | null {
  const marked = (a.maxScore ?? 0) - (a.pendingMarks ?? 0);
  return a.status === "submitted" && marked > 0 ? Math.round(((a.score ?? 0) / marked) * 100) : null;
}

/** Papers finished and the average score, counting only what has been marked (as on the child's Progress page). */
export function summarise(attempts: Scored[]) {
  const finished = attempts.filter((a) => a.status === "submitted");
  const scored = finished.map(percent).filter((p): p is number => p !== null);
  return { finished: finished.length, average: scored.length ? Math.round(scored.reduce((s, p) => s + p, 0) / scored.length) : null };
}
