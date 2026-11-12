import { NextResponse, type NextRequest } from "next/server";
import { PATH_HEADER, SESSION_COOKIE } from "@/lib/prep/auth/session-cookie";

/**
 * Fast redirect to the login page when there is no session cookie at all.
 * This is a convenience only: the real check (is the session valid, is the role allowed)
 * happens on the server in every /prep page, action and route handler.
 * Also passes the path on to server code (used to keep users with a temporary password on their profile page).
 * Scoped to /prep so the public site is untouched.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/prep/login" || req.cookies.has(SESSION_COOKIE)) {
    const headers = new Headers(req.headers);
    headers.set(PATH_HEADER, pathname);
    return NextResponse.next({ request: { headers } });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/prep/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/prep/:path*"],
};
