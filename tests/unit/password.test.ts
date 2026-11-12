import { describe, expect, it } from "vitest";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/prep/auth/password";
import { normaliseLoginId } from "@/lib/prep/auth/login";

describe("password hashing", () => {
  it("verifies the right password and rejects others", async () => {
    const hash = await hashPassword("Kumasi-2026");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("Kumasi-2026", hash)).toBe(true);
    expect(await verifyPassword("kumasi-2026", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("salts each hash", async () => {
    expect(await hashPassword("same-password")).not.toBe(await hashPassword("same-password"));
  });

  it("treats NFC and NFD forms of Twi/French characters as the same password", async () => {
    const nfc = "ɔbɛyɛ-café";
    const hash = await hashPassword(nfc);
    expect(await verifyPassword(nfc.normalize("NFD"), hash)).toBe(true);
  });

  it("rejects malformed stored hashes", async () => {
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
    expect(await verifyPassword("x", "bcrypt$1$2$3$4$5")).toBe(false);
  });

  it("enforces a minimum length", () => {
    expect(passwordProblem("short")).not.toBeNull();
    expect(passwordProblem("long-enough")).toBeNull();
  });
});

describe("login IDs", () => {
  it("normalises IDs to trimmed upper case", () => {
    expect(normaliseLoginId("  s0001 ")).toBe("S0001");
  });
});
