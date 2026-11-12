import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getStore, type Role } from "@/lib/prep/store";
import { roleHome } from "./permissions";
import { SESSION_COOKIE, validateSessionToken, type SessionUser } from "./session";
import { PATH_HEADER } from "./session-cookie";

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

/**
 * The logged-in user for this request, or null. Cached per request.
 * Every page, server action and route handler in /prep must go through this (or requireRole);
 * middleware only checks that a cookie exists.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const result = await validateSessionToken(getStore(), token);
  if (!result) return null;

  if (result.renewed) {
    // Cookies can only be written from server actions / route handlers; ignore in server components.
    try {
      jar.set(SESSION_COOKIE, result.renewed.token, sessionCookieOptions(result.renewed.expiresAt));
    } catch {}
  }
  return result.user;
});

export const profilePath = (role: Role) => `${roleHome[role]}/profile`;

/**
 * Require a logged-in user with one of `roles`. Sends others to login or to their own area.
 * Users on a temporary password (new account or admin reset) are kept on their profile page
 * until they choose their own password.
 */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/prep/login");
  if (!roles.includes(user.role)) redirect(roleHome[user.role]);
  if (user.mustChangePassword) {
    const path = (await headers()).get(PATH_HEADER);
    if (path !== profilePath(user.role)) redirect(profilePath(user.role));
  }
  return user;
}
