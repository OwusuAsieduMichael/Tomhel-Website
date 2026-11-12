import { randomInt } from "node:crypto";
import { normaliseLoginId } from "@/lib/prep/auth/login";
import { hashPassword } from "@/lib/prep/auth/password";
import {
  insert,
  newId,
  StoreConflictError,
  update,
  type Role,
  type SchoolClass,
  type Store,
  type User,
  type WriteOp,
} from "@/lib/prep/store";

/**
 * Account management for admins: create accounts, reset passwords, switch accounts on/off,
 * and import students from a class list. Callers (server actions) must check the admin role first.
 */

// No 0/o/1/l/i: temporary passwords are read off paper or a screen by students.
const TEMP_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** e.g. "k7mq-4hxp". 8 random characters from 31 = ~40 bits, fine for a one-time password with lockout. */
export function generateTempPassword(): string {
  const pick = () => Array.from({ length: 4 }, () => TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)]).join("");
  return `${pick()}-${pick()}`;
}

export const LOGIN_ID_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,31}$/;

export class AccountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountError";
  }
}

/** Resolve class names (case-insensitive) to IDs, preferring the latest academic year when a name repeats. */
function classIdsByName(classes: SchoolClass[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of [...classes].sort((a, b) => b.academicYear.localeCompare(a.academicYear))) {
    const key = c.name.trim().toUpperCase();
    if (!map.has(key)) map.set(key, c.id);
  }
  return map;
}

/** A new user row with defaults filled in. */
export function newUserRow(fields: Pick<User, "loginId" | "name" | "role" | "classId" | "passwordHash"> & Partial<User>): User {
  return {
    id: newId(),
    active: true,
    mustChangePassword: false,
    failedLoginCount: 0,
    lockedUntil: null,
    lastLoginAt: null,
    sessionVersion: 1,
    createdAt: new Date(),
    ...fields,
  };
}

export type NewAccount = { loginId: string; name: string; role: Role; classId?: string | null };

/** Creates an account with a temporary password the user must change on first login. */
export async function createAccount(store: Store, input: NewAccount): Promise<{ id: string; tempPassword: string }> {
  const loginId = normaliseLoginId(input.loginId);
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!LOGIN_ID_PATTERN.test(loginId)) {
    throw new AccountError("IDs use letters, numbers and dashes only (2 to 32 characters).");
  }
  if (!name) throw new AccountError("Enter the person's name.");
  if (input.role === "student") {
    if (!input.classId) throw new AccountError("Choose a class for the student.");
    const { classes } = await store.read("classes");
    if (!classes.some((c) => c.id === input.classId)) throw new AccountError("That class no longer exists.");
  }

  const tempPassword = generateTempPassword();
  const row = newUserRow({
    loginId,
    name,
    role: input.role,
    classId: input.role === "student" ? input.classId! : null,
    passwordHash: await hashPassword(tempPassword),
    mustChangePassword: true,
  });
  try {
    // The uniqueness check runs inside the sheet's write lock, so two admins can't create the same ID at once.
    await store.write([insert("users", [row], { unique: ["loginId"] })]);
  } catch (e) {
    if (e instanceof StoreConflictError) throw new AccountError(`The ID ${loginId} is already in use.`);
    throw e;
  }
  return { id: row.id, tempPassword };
}

async function getUser(store: Store, userId: string): Promise<User> {
  const { users } = await store.read("users");
  const u = users.find((x) => x.id === userId);
  if (!u) throw new AccountError("That account no longer exists.");
  return u;
}

/** New temporary password, clears any lockout, and signs the user out everywhere. */
export async function resetPassword(store: Store, userId: string): Promise<{ loginId: string; tempPassword: string }> {
  const u = await getUser(store, userId);
  const tempPassword = generateTempPassword();
  await store.write([
    update("users", u.id, {
      passwordHash: await hashPassword(tempPassword),
      mustChangePassword: true,
      failedLoginCount: 0,
      lockedUntil: null,
      sessionVersion: u.sessionVersion + 1,
    }),
  ]);
  return { loginId: u.loginId, tempPassword };
}

/** Switch an account on or off. Switching off signs the user out. Admins can't switch themselves off. */
export async function setAccountActive(store: Store, actorId: string, userId: string, active: boolean) {
  if (!active && actorId === userId) throw new AccountError("You can't switch off your own account.");
  const u = await getUser(store, userId);
  if (u.active === active) return;
  await store.write([update("users", u.id, active ? { active } : { active, sessionVersion: u.sessionVersion + 1 })]);
}

// ---------------------------------------------------------------------------
// Class list import (CSV)
// ---------------------------------------------------------------------------

export type StudentRow = { line: number; loginId: string; name: string; className: string };
export type RowProblem = { line: number; message: string };

/** Minimal RFC 4180 CSV: quoted fields, doubled quotes, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const HEADER_ALIASES: Record<"loginId" | "name" | "className", string[]> = {
  loginId: ["student id", "id", "login id", "studentid"],
  name: ["name", "full name", "student name"],
  className: ["class", "class name"],
};

/**
 * Reads a class list with a header row containing Student ID, Name and Class (any order,
 * any case; extra columns ignored). Blank lines are skipped. Returns valid rows and per-line problems.
 */
export function parseStudentCsv(text: string): { rows: StudentRow[]; problems: RowProblem[] } {
  const table = parseCsv(text);
  const problems: RowProblem[] = [];
  const headerIndex = table.findIndex((r) => r.some((c) => c.trim() !== ""));
  if (headerIndex === -1) return { rows: [], problems: [{ line: 1, message: "The file is empty." }] };

  const header = table[headerIndex].map((h) => h.trim().toLowerCase());
  const col = (key: keyof typeof HEADER_ALIASES) => header.findIndex((h) => HEADER_ALIASES[key].includes(h));
  const cols = { loginId: col("loginId"), name: col("name"), className: col("className") };
  const missing = Object.entries(cols)
    .filter(([, i]) => i === -1)
    .map(([k]) => ({ loginId: "Student ID", name: "Name", className: "Class" })[k as keyof typeof cols]);
  if (missing.length) {
    return {
      rows: [],
      problems: [{ line: headerIndex + 1, message: `The header row needs these columns: ${missing.join(", ")}.` }],
    };
  }

  const rows: StudentRow[] = [];
  const seen = new Map<string, number>();
  for (let i = headerIndex + 1; i < table.length; i++) {
    const cells = table[i];
    if (cells.every((c) => c.trim() === "")) continue;
    const line = i + 1;
    const loginId = normaliseLoginId(cells[cols.loginId] ?? "");
    const name = (cells[cols.name] ?? "").trim().replace(/\s+/g, " ");
    const className = (cells[cols.className] ?? "").trim().replace(/\s+/g, " ");

    if (!loginId || !name || !className) {
      problems.push({ line, message: "Student ID, Name and Class are all required." });
    } else if (!LOGIN_ID_PATTERN.test(loginId)) {
      problems.push({ line, message: `"${loginId}" is not a valid ID (letters, numbers and dashes only).` });
    } else if (seen.has(loginId)) {
      problems.push({ line, message: `${loginId} is also on line ${seen.get(loginId)}.` });
    } else {
      seen.set(loginId, line);
      rows.push({ line, loginId, name, className });
    }
  }
  if (!rows.length && !problems.length) problems.push({ line: headerIndex + 1, message: "No students found under the header row." });
  return { rows, problems };
}

export type ImportResult = {
  created: { loginId: string; name: string; className: string; tempPassword: string }[];
  updated: number;
  unchanged: number;
  problems: RowProblem[];
};

/**
 * Creates new students (with temporary passwords) and updates the name/class of existing ones.
 * Existing passwords are never touched. All-or-nothing: if any row has a problem, nothing is saved.
 */
export async function importStudents(store: Store, csvText: string): Promise<ImportResult> {
  const { rows, problems } = parseStudentCsv(csvText);
  const empty = { created: [], updated: 0, unchanged: 0 };
  if (problems.length) return { ...empty, problems };

  const { users, classes } = await store.read("users", "classes");
  const classMap = classIdsByName(classes);
  const byLogin = new Map(users.map((u) => [u.loginId.toUpperCase(), u]));

  for (const r of rows) {
    if (!classMap.has(r.className.toUpperCase())) {
      problems.push({ line: r.line, message: `There is no class called "${r.className}". Add it first or fix the spelling.` });
    }
    const u = byLogin.get(r.loginId);
    if (u && u.role !== "student") {
      problems.push({ line: r.line, message: `${r.loginId} belongs to a staff account.` });
    }
  }
  if (problems.length) return { ...empty, problems };

  const toCreate = await Promise.all(
    rows
      .filter((r) => !byLogin.has(r.loginId))
      .map(async (r) => {
        const tempPassword = generateTempPassword();
        return { ...r, tempPassword, passwordHash: await hashPassword(tempPassword) };
      }),
  );

  const ops: WriteOp[] = [];
  if (toCreate.length) {
    const newRows = toCreate.map((r) =>
      newUserRow({
        loginId: r.loginId,
        name: r.name,
        role: "student",
        classId: classMap.get(r.className.toUpperCase())!,
        passwordHash: r.passwordHash,
        mustChangePassword: true,
      }),
    );
    ops.push(insert("users", newRows, { unique: ["loginId"] }));
  }

  let updated = 0;
  let unchanged = 0;
  for (const r of rows) {
    const u = byLogin.get(r.loginId);
    if (!u) continue;
    const classId = classMap.get(r.className.toUpperCase())!;
    if (u.name === r.name && u.classId === classId) {
      unchanged++;
    } else {
      ops.push(update("users", u.id, { name: r.name, classId }));
      updated++;
    }
  }

  try {
    await store.write(ops);
  } catch (e) {
    if (e instanceof StoreConflictError) {
      return { ...empty, problems: [{ line: 1, message: `${e.value} was added by someone else just now. Import the file again.` }] };
    }
    throw e;
  }

  return {
    created: toCreate.map(({ loginId, name, className, tempPassword }) => ({ loginId, name, className, tempPassword })),
    updated,
    unchanged,
    problems: [],
  };
}
