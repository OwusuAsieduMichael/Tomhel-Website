import { update, type Store, type User } from "@/lib/prep/store";
import { findAccountByLoginId, type SessionRole } from "./accounts";
import { hashPassword, verifyPassword } from "./password";
import { createSessionToken } from "./session";

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

/** Student / Staff / Parent IDs are case-insensitive and stored upper-cased. */
export function normaliseLoginId(raw: string): string {
  return raw.normalize("NFC").trim().toUpperCase();
}

export type LoginResult =
  | { ok: true; token: string; expiresAt: Date; userId: string; role: SessionRole }
  | { ok: false; reason: "invalid" | "locked" | "inactive" };

// Used to spend the same time on unknown IDs as on wrong passwords, so IDs can't be probed by timing.
let dummyHash: Promise<string> | undefined;

/** A school account (student, teacher, admin) by login ID. Parents are found by findAccountByLoginId. */
export async function findUserByLoginId(store: Store, loginId: string): Promise<User | undefined> {
  const { users } = await store.read("users");
  const wanted = normaliseLoginId(loginId);
  return users.find((u) => u.loginId.toUpperCase() === wanted);
}

export async function authenticate(store: Store, rawLoginId: string, password: string, now = new Date()): Promise<LoginResult> {
  const account = await findAccountByLoginId(store, rawLoginId);
  if (!account) {
    dummyHash ??= hashPassword("not-a-real-password");
    await verifyPassword(password, await dummyHash);
    return { ok: false, reason: "invalid" };
  }
  const user = account.row;
  if (user.lockedUntil && user.lockedUntil.getTime() > now.getTime()) {
    return { ok: false, reason: "locked" };
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const failed = user.failedLoginCount + 1;
    const lock = failed >= MAX_FAILED_LOGINS;
    await store.write([
      update(account.table, user.id, {
        failedLoginCount: lock ? 0 : failed,
        lockedUntil: lock ? new Date(now.getTime() + LOCKOUT_MS) : user.lockedUntil,
      }),
    ]);
    return { ok: false, reason: lock ? "locked" : "invalid" };
  }
  if (!user.active) return { ok: false, reason: "inactive" };
  await store.write([update(account.table, user.id, { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now })]);
  const { token, expiresAt } = createSessionToken(user, now);
  return { ok: true, token, expiresAt, userId: user.id, role: account.role };
}

export const loginErrorMessages: Record<"invalid" | "locked" | "inactive", string> = {
  invalid: "That ID and password don't match. Check your ID and try again.",
  locked: "Too many attempts. Wait 15 minutes, or ask the school office to reset your password.",
  inactive: "This account has been switched off. Please see the school office.",
};
