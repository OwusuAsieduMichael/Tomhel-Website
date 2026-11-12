import { createHmac, timingSafeEqual } from "node:crypto";
import type { Store, User } from "@/lib/prep/store";

/**
 * Signed-cookie sessions. The cookie holds the user's ID, their session version and an expiry,
 * signed with PREP_SESSION_SECRET (HMAC-SHA256), so pages don't need a round trip to Google to
 * know who is logged in. Signing out everywhere (password change/reset, account switched off)
 * bumps the user's sessionVersion, which invalidates every cookie issued before.
 */
export { SESSION_COOKIE } from "./session-cookie";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Re-issue the cookie when less than this much time is left (sliding expiry). */
const RENEW_WITHIN_MS = SESSION_TTL_MS / 2;

export type SessionUser = Pick<User, "id" | "role" | "name" | "loginId" | "classId" | "mustChangePassword">;

type Payload = { u: string; v: number; e: number };

const DEV_SECRET = "dev-only-session-secret-do-not-use-in-production!";

function secret(): string {
  const s = process.env.PREP_SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV) {
    throw new Error("PREP_SESSION_SECRET must be set (32+ characters).");
  }
  return DEV_SECRET;
}

const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

export function createSessionToken(user: Pick<User, "id" | "sessionVersion">, now = new Date()) {
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const payload: Payload = { u: user.id, v: user.sessionVersion, e: expiresAt.getTime() };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { token: `${body}.${sign(body)}`, expiresAt };
}

/** Checks the signature and expiry only. */
export function readSessionToken(token: string, now = new Date()): Payload | null {
  const [body, mac, extra] = token.split(".");
  if (!body || !mac || extra !== undefined) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
    if (typeof p.u !== "string" || typeof p.v !== "number" || typeof p.e !== "number") return null;
    return p.e > now.getTime() ? p : null;
  } catch {
    return null;
  }
}

export type ValidatedSession = {
  user: SessionUser;
  /** Set when the session was past half its life: a fresh cookie to store. */
  renewed?: { token: string; expiresAt: Date };
};

export async function validateSessionToken(store: Store, token: string, now = new Date()): Promise<ValidatedSession | null> {
  if (!token) return null;
  const payload = readSessionToken(token, now);
  if (!payload) return null;

  const { users } = await store.read("users");
  const u = users.find((x) => x.id === payload.u);
  if (!u || !u.active || u.sessionVersion !== payload.v) return null;

  const user: SessionUser = {
    id: u.id,
    role: u.role,
    name: u.name,
    loginId: u.loginId,
    classId: u.classId,
    mustChangePassword: u.mustChangePassword,
  };
  const renewed = payload.e - now.getTime() < RENEW_WITHIN_MS ? createSessionToken(u, now) : undefined;
  return { user, renewed };
}
