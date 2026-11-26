import type { Parent, Role, Store, User } from "@/lib/prep/store";

/**
 * Everyone who can log in: school accounts (students, teachers, admins) in Users, and parents in Parents.
 * Both tables have the same login columns, so login, sessions and password changes treat them alike.
 */
export type SessionRole = Role | "parent";

export type Account =
  | { table: "users"; role: Role; row: User }
  | { table: "parents"; role: "parent"; row: Parent };

const normalise = (raw: string) => raw.normalize("NFC").trim().toUpperCase();

function accounts(users: User[], parents: Parent[]): Account[] {
  return [
    ...users.map((row): Account => ({ table: "users", role: row.role, row })),
    ...parents.map((row): Account => ({ table: "parents", role: "parent", row })),
  ];
}

/** The account with this login ID (any case), school accounts first. */
export async function findAccountByLoginId(store: Store, loginId: string): Promise<Account | undefined> {
  const { users, parents } = await store.read("users", "parents");
  const wanted = normalise(loginId);
  return accounts(users, parents).find((a) => a.row.loginId.toUpperCase() === wanted);
}

export async function findAccountById(store: Store, id: string): Promise<Account | undefined> {
  const { users, parents } = await store.read("users", "parents");
  return accounts(users, parents).find((a) => a.row.id === id);
}

/** Is this login ID taken by any account, school or parent? */
export async function loginIdTaken(store: Store, loginId: string): Promise<boolean> {
  return !!(await findAccountByLoginId(store, loginId));
}
