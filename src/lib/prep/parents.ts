import { hashPassword } from "@/lib/prep/auth/password";
import { insert, newId, remove, StoreConflictError, type Parent, type Store, type User } from "@/lib/prep/store";

/**
 * Parent / guardian accounts. Each student gets one, made when the student is added:
 * Parent ID from the Student ID (TMH11 -> TP11), a temporary password of its own, and view-only access to
 * the child's work. Siblings can be put on one parent account. Parents never see other children.
 */

export class ParentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParentError";
  }
}

/** TMH11 -> TP11. An ID without a number at the end gets the whole ID: ABC -> TP-ABC. */
export function parentLoginIdFor(studentLoginId: string): string {
  const id = studentLoginId.trim().toUpperCase();
  const digits = /(\d+)$/.exec(id)?.[1];
  return digits ? `TP${digits}` : `TP-${id}`.slice(0, 32);
}

const parentName = (student: Pick<User, "name">) => `Parent of ${student.name}`;

function newParentRow(loginId: string, name: string, passwordHash: string): Parent {
  return {
    id: newId(),
    loginId,
    name,
    passwordHash,
    active: true,
    mustChangePassword: true,
    failedLoginCount: 0,
    lockedUntil: null,
    lastLoginAt: null,
    sessionVersion: 1,
    createdAt: new Date(),
  };
}

export type NewParent = { studentId: string; studentLoginId: string; studentName: string; loginId: string; tempPassword: string };

/**
 * Makes a parent account for each of these students that has none. Safe to repeat: a student who already has a
 * parent is skipped. When the usual Parent ID is taken (TMH11 and ABC11 both give TP11), "-2", "-3" ... is added.
 * Returns the new accounts with their temporary passwords, to hand out once.
 */
export async function ensureParents(store: Store, studentIds: string[], tempPassword: () => string): Promise<NewParent[]> {
  const { users, parents, parentLinks } = await store.read("users", "parents", "parentLinks");
  const linked = new Set(parentLinks.map((l) => l.studentId));
  const taken = new Set([...users, ...parents].map((a) => a.loginId.toUpperCase()));
  const students = users.filter((u) => studentIds.includes(u.id) && u.role === "student" && !linked.has(u.id));
  if (!students.length) return [];

  const made: (NewParent & { row: Parent })[] = [];
  for (const s of students) {
    const base = parentLoginIdFor(s.loginId);
    let loginId = base;
    for (let n = 2; taken.has(loginId); n++) loginId = `${base}-${n}`;
    taken.add(loginId);
    const password = tempPassword();
    made.push({
      studentId: s.id,
      studentLoginId: s.loginId,
      studentName: s.name,
      loginId,
      tempPassword: password,
      row: newParentRow(loginId, parentName(s), await hashPassword(password)),
    });
  }
  const now = new Date();
  try {
    await store.write([
      insert("parents", made.map((m) => m.row), { unique: ["loginId"] }),
      insert("parentLinks", made.map((m) => ({ id: newId(), parentId: m.row.id, studentId: m.studentId, createdAt: now }))),
    ]);
  } catch (e) {
    if (e instanceof StoreConflictError) throw new ParentError(`${e.value} was taken by someone else just now. Try again.`);
    throw e;
  }
  return made.map((m) => ({ studentId: m.studentId, studentLoginId: m.studentLoginId, studentName: m.studentName, loginId: m.loginId, tempPassword: m.tempPassword }));
}

/** Students with no parent account yet. */
export async function studentsWithoutParents(store: Store): Promise<User[]> {
  const { users, parentLinks } = await store.read("users", "parentLinks");
  const linked = new Set(parentLinks.map((l) => l.studentId));
  return users.filter((u) => u.role === "student" && !linked.has(u.id));
}

export type ParentSummary = {
  id: string;
  loginId: string;
  name: string;
  active: boolean;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  children: { id: string; loginId: string; name: string; classId: string | null }[];
};

/** Every parent account with its children, by Parent ID. */
export async function listParents(store: Store): Promise<ParentSummary[]> {
  const { users, parents, parentLinks } = await store.read("users", "parents", "parentLinks");
  const byId = new Map(users.map((u) => [u.id, u]));
  return parents
    .map((p) => ({
      id: p.id,
      loginId: p.loginId,
      name: p.name,
      active: p.active,
      mustChangePassword: p.mustChangePassword,
      lastLoginAt: p.lastLoginAt,
      children: parentLinks
        .filter((l) => l.parentId === p.id)
        .map((l) => byId.get(l.studentId))
        .filter((u): u is User => !!u)
        .map((u) => ({ id: u.id, loginId: u.loginId, name: u.name, classId: u.classId })),
    }))
    .sort((a, b) => a.loginId.localeCompare(b.loginId, undefined, { numeric: true }));
}

/** The children a parent may see: the student accounts linked to them (a switched-off child still shows their history). */
export async function childrenOf(store: Store, parentId: string): Promise<User[]> {
  const { users, parentLinks } = await store.read("users", "parentLinks");
  const ids = new Set(parentLinks.filter((l) => l.parentId === parentId).map((l) => l.studentId));
  return users.filter((u) => ids.has(u.id) && u.role === "student").sort((a, b) => a.name.localeCompare(b.name));
}

/** The child, if this parent may see them; otherwise a ParentError. */
export async function childOf(store: Store, parentId: string, studentId: string): Promise<User> {
  const child = (await childrenOf(store, parentId)).find((c) => c.id === studentId);
  if (!child) throw new ParentError("That child isn't linked to your account.");
  return child;
}

/**
 * Puts a student on another parent's account (siblings sharing one login). The student's old parent account
 * is removed if it has no other children left; the result says which, so the admin can tell the family.
 */
export async function moveChildToParent(store: Store, studentLoginId: string, parentId: string): Promise<{ removedParent: string | null }> {
  const { users, parents, parentLinks } = await store.read("users", "parents", "parentLinks");
  const student = users.find((u) => u.role === "student" && u.loginId.toUpperCase() === studentLoginId.trim().toUpperCase());
  if (!student) throw new ParentError(`There is no student with the ID ${studentLoginId.trim().toUpperCase()}.`);
  const target = parents.find((p) => p.id === parentId);
  if (!target) throw new ParentError("That parent account no longer exists.");
  const current = parentLinks.filter((l) => l.studentId === student.id);
  if (current.some((l) => l.parentId === parentId)) throw new ParentError(`${student.name} is already on this account.`);

  const emptied = [...new Set(current.map((l) => l.parentId))].filter(
    (pid) => !parentLinks.some((l) => l.parentId === pid && l.studentId !== student.id),
  );
  await store.write([
    remove("parentLinks", current.map((l) => l.id)),
    insert("parentLinks", [{ id: newId(), parentId, studentId: student.id, createdAt: new Date() }]),
    remove("parents", emptied),
  ]);
  return { removedParent: parents.find((p) => emptied.includes(p.id))?.loginId ?? null };
}
