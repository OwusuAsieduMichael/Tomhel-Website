import { beforeAll, describe, expect, it } from "vitest";
import { authenticate, LOCKOUT_MS, MAX_FAILED_LOGINS } from "@/lib/prep/auth/login";
import { roleHome } from "@/lib/prep/auth/permissions";
import { createSessionToken, readSessionToken, SESSION_TTL_MS, validateSessionToken } from "@/lib/prep/auth/session";
import { update, type Store } from "@/lib/prep/store";
import { seedDatabase } from "@/lib/prep/seed/seed";
import { createTestStore } from "../helpers/store";

const PASSWORD = "test-password-123";
let store: Store;

const user = async (loginId: string) => (await store.read("users")).users.find((u) => u.loginId === loginId)!;

beforeAll(async () => {
  store = await createTestStore();
  await seedDatabase(store, { password: PASSWORD });
});

describe("authenticate", () => {
  it.each([
    ["S0001", "student"],
    ["T001", "teacher"],
    ["A0001", "admin"],
  ] as const)("logs in %s as %s, and the session resolves to that role", async (loginId, role) => {
    const result = await authenticate(store, loginId, PASSWORD);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.role).toBe(role);
    expect(roleHome[result.role]).toBe(`/prep/${role}`);

    const session = await validateSessionToken(store, result.token);
    expect(session?.user.loginId).toBe(loginId);
    expect(session?.user.role).toBe(role);
  });

  it("accepts lower-case IDs with spaces and records the login time", async () => {
    expect((await authenticate(store, "  s0002 ", PASSWORD)).ok).toBe(true);
    expect((await user("S0002")).lastLoginAt).toBeInstanceOf(Date);
  });

  it("gives the same answer for an unknown ID and a wrong password", async () => {
    expect(await authenticate(store, "NOPE", PASSWORD)).toEqual({ ok: false, reason: "invalid" });
    expect(await authenticate(store, "S0003", "wrong-password")).toEqual({ ok: false, reason: "invalid" });
  });

  it(`locks the account after ${MAX_FAILED_LOGINS} failures, then unlocks after the lockout`, async () => {
    const now = new Date("2026-11-05T09:00:00Z");
    for (let i = 1; i < MAX_FAILED_LOGINS; i++) {
      expect((await authenticate(store, "S0004", "bad", now)).ok).toBe(false);
    }
    expect(await authenticate(store, "S0004", "bad", now)).toEqual({ ok: false, reason: "locked" });
    // Even the right password is refused while locked.
    expect(await authenticate(store, "S0004", PASSWORD, now)).toEqual({ ok: false, reason: "locked" });

    const later = new Date(now.getTime() + LOCKOUT_MS + 1000);
    expect((await authenticate(store, "S0004", PASSWORD, later)).ok).toBe(true);
  });

  it("refuses switched-off accounts and their existing sessions", async () => {
    const login = await authenticate(store, "S0005", PASSWORD);
    expect(login.ok).toBe(true);
    await store.write([update("users", (await user("S0005")).id, { active: false })]);

    expect(await authenticate(store, "S0005", PASSWORD)).toEqual({ ok: false, reason: "inactive" });
    if (login.ok) expect(await validateSessionToken(store, login.token)).toBeNull();
  });
});

describe("signed sessions", () => {
  it("rejects tampered, garbage and expired tokens", async () => {
    const u = await user("S0006");
    const { token } = createSessionToken(u);
    const [body, mac] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ u: (await user("A0001")).id, v: 1, e: Date.now() + 1e9 })).toString("base64url");

    expect(readSessionToken(token)).not.toBeNull();
    expect(readSessionToken(`${forged}.${mac}`)).toBeNull();
    expect(readSessionToken(`${body}.${mac}x`)).toBeNull();
    expect(readSessionToken("")).toBeNull();
    expect(readSessionToken("made-up-token")).toBeNull();
    expect(readSessionToken(token, new Date(Date.now() + SESSION_TTL_MS + 1))).toBeNull();
  });

  it("signs the user out everywhere when the session version changes", async () => {
    const u = await user("S0007");
    const { token } = createSessionToken(u);
    expect(await validateSessionToken(store, token)).not.toBeNull();
    await store.write([update("users", u.id, { sessionVersion: u.sessionVersion + 1 })]);
    expect(await validateSessionToken(store, token)).toBeNull();
  });

  it("issues a fresh cookie once a session is past half its life", async () => {
    const u = await user("S0008");
    const start = new Date("2026-02-01T00:00:00Z");
    const { token, expiresAt } = createSessionToken(u, start);

    const early = await validateSessionToken(store, token, new Date(start.getTime() + 1000));
    expect(early?.renewed).toBeUndefined();

    const late = await validateSessionToken(store, token, new Date(start.getTime() + SESSION_TTL_MS * 0.75));
    expect(late?.renewed?.expiresAt.getTime()).toBeGreaterThan(expiresAt.getTime());
  });
});
