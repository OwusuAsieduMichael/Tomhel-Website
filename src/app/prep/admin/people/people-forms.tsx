"use client";

import { Download, FileUp, UserPlus } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Field, FormMessage, prepButton, SelectField } from "@/components/prep/ui";
import {
  createAccountAction,
  createMissingParentsAction,
  importAccountsAction,
  moveChildAction,
  resetPasswordAction,
  setActiveAction,
  type AccountFormState,
  type ImportFormState,
  type IssuedPassword,
  type MissingParentsState,
  type MoveChildState,
} from "../actions";

type ClassOption = { id: string; name: string };
type Role = "student" | "teacher" | "admin";

const ROLE_LABEL: Record<Role, { one: string; many: string; id: string }> = {
  student: { one: "student", many: "students", id: "Student ID" },
  teacher: { one: "teacher", many: "teachers", id: "Staff ID" },
  admin: { one: "admin", many: "admins", id: "Staff ID" },
};

/** Shows a temporary password once. It can't be looked up again (only its hash is stored). */
function IssuedPasswordNote({ issued }: { issued: IssuedPassword }) {
  return (
    <div role="status" className="rounded-xl border border-prep-awarded/30 bg-prep-primary-soft px-4 py-3 text-sm">
      <p>
        Temporary password for <span className="font-semibold">{issued.name || issued.loginId}</span> ({issued.loginId}):
      </p>
      <p className="mt-1 font-mono text-lg font-bold tracking-wider">{issued.tempPassword}</p>
      <p className="mt-1 text-prep-muted">Shown only once. Write it down; they will choose their own password when they log in.</p>
    </div>
  );
}

/**
 * "Add people": choose the role first, then add one account or import a list of them.
 * Both forms follow the role, and start afresh when it changes.
 */
export function AddPeoplePanel({ classes }: { classes: ClassOption[] }) {
  const [role, setRole] = useState<Role>("student");
  const [mode, setMode] = useState<"one" | "list">("one");
  const tab = (m: typeof mode, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      onClick={() => setMode(m)}
      className={cn(
        "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors [&_svg]:size-4",
        mode === m ? "bg-prep-surface text-prep-ink shadow-sm" : "text-prep-muted hover:text-prep-ink",
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <SelectField label="Role" name="role-picker" value={role} onChange={(e) => setRole(e.target.value as Role)}>
        <option value="student">Student</option>
        <option value="teacher">Teacher</option>
        <option value="admin">Admin</option>
      </SelectField>
      <div role="tablist" aria-label={`How to add ${ROLE_LABEL[role].many}`} className="flex gap-1 rounded-xl bg-prep-ground p-1">
        {tab("one", <UserPlus aria-hidden />, `Add one ${ROLE_LABEL[role].one}`)}
        {tab("list", <FileUp aria-hidden />, `Import ${ROLE_LABEL[role].many}`)}
      </div>
      {mode === "one" ? <AddAccountForm key={role} role={role} classes={classes} /> : <ImportAccountsForm key={role} role={role} />}
    </div>
  );
}

export function AddAccountForm({ role, classes }: { role: Role; classes: ClassOption[] }) {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(createAccountAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.issued) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4" noValidate>
      <FormMessage error={state.error} />
      {state.issued ? <IssuedPasswordNote issued={state.issued} /> : null}
      {state.parent ? <IssuedPasswordNote issued={state.parent} /> : null}
      <input type="hidden" name="role" value={role} />
      <Field label={ROLE_LABEL[role].id} name="loginId" autoCapitalize="characters" spellCheck={false} required />
      <Field label="Full name" name="name" autoComplete="off" required />
      {role === "student" ? (
        <SelectField label="Class" name="classId" defaultValue="" required>
          <option value="" disabled>
            Choose a class
          </option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
      ) : null}
      <button type="submit" className={prepButton()} disabled={pending}>
        {pending ? "Adding…" : `Add ${ROLE_LABEL[role].one}`}
      </button>
    </form>
  );
}

function csvCell(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function saveCsv(fileName: string, lines: string[][]) {
  const url = URL.createObjectURL(new Blob([lines.map((l) => l.map(csvCell).join(",")).join("\r\n")], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

type CreatedRow = { loginId: string; name: string; className: string; tempPassword: string; parent?: { loginId: string; tempPassword: string } };

/** New students come with their parent's login on the same line, to print one slip per family. */
function downloadPasswords(role: Role, rows: CreatedRow[]) {
  const student = role === "student";
  saveCsv(`new-${ROLE_LABEL[role].one}-passwords.csv`, [
    student ? ["Student ID", "Name", "Class", "Temporary password", "Parent ID", "Parent temporary password"] : ["Staff ID", "Name", "Temporary password"],
    ...rows.map((r) =>
      student ? [r.loginId, r.name, r.className, r.tempPassword, r.parent?.loginId ?? "", r.parent?.tempPassword ?? ""] : [r.loginId, r.name, r.tempPassword],
    ),
  ]);
}

/** A blank list with the right header row, so the admin can fill it in Excel or Google Sheets. */
function downloadTemplate(role: Role) {
  const header = role === "student" ? "Student ID,Name,Class" : "Staff ID,Name";
  const url = URL.createObjectURL(new Blob([header + "\r\n"], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${ROLE_LABEL[role].many}-list.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportAccountsForm({ role }: { role: Role }) {
  const [state, action, pending] = useActionState<ImportFormState, FormData>(importAccountsAction, {});
  const r = state.result;
  const { many, id } = ROLE_LABEL[role];
  const columns = role === "student" ? `${id}, Name, Class` : `${id}, Name`;

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4" noValidate>
        <FormMessage error={state.error} />
        <input type="hidden" name="role" value={role} />
        <div className="space-y-1.5">
          <label htmlFor={`import-file-${role}`} className="block text-sm font-semibold">
            {role === "student" ? "Class list (CSV)" : `List of ${many} (CSV)`}
          </label>
          <input
            id={`import-file-${role}`}
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            aria-describedby={`import-hint-${role}`}
            className="block w-full text-sm file:mr-3 file:min-h-11 file:rounded-xl file:border file:border-prep-line file:bg-prep-surface file:px-4 file:font-semibold"
          />
          <p id={`import-hint-${role}`} className="text-sm text-prep-muted">
            Columns: {columns}. Export from Excel or Google Sheets as CSV.{" "}
            {role === "student"
              ? "Existing students are moved or renamed; their passwords stay the same. Each new student also gets a parent account."
              : `Existing ${many} are renamed; their passwords stay the same. Assign teachers' subjects and classes afterwards.`}{" "}
            <button type="button" onClick={() => downloadTemplate(role)} className="font-semibold text-prep-primary underline">
              Download a blank list
            </button>
          </p>
        </div>
        <button type="submit" className={prepButton({ variant: "secondary" })} disabled={pending}>
          {pending ? "Importing…" : `Import ${many}`}
        </button>
      </form>

      {r?.problems.length ? (
        <div role="alert" className="rounded-xl border border-prep-incorrect/30 bg-prep-incorrect-bg px-4 py-3 text-sm text-prep-incorrect">
          <p className="font-semibold">Nothing was imported. Fix these lines and try again:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {r.problems.map((p) => (
              <li key={`${p.line}-${p.message}`}>
                Line {p.line}: {p.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {r && !r.problems.length ? (
        <div role="status" className="space-y-3 rounded-xl border border-prep-awarded/30 bg-prep-primary-soft px-4 py-3 text-sm">
          <p>
            <span className="font-semibold">{r.created.length} added</span>, {r.updated} updated, {r.unchanged} already up to date.
          </p>
          {r.created.length ? (
            <>
              <p className="text-prep-muted">
                Download the temporary passwords now. They are shown only once and can&apos;t be looked up later.
              </p>
              <button type="button" className={prepButton()} onClick={() => downloadPasswords(r.role, r.created)}>
                <Download aria-hidden /> Download passwords (CSV)
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Parent accounts for students added before parent accounts existed. Shown while any student has none. */
export function MissingParentsCard({ count }: { count: number }) {
  const [state, action, pending] = useActionState<MissingParentsState>(createMissingParentsAction, {});
  const created = state.created;
  return (
    <div className="space-y-3">
      {created ? (
        <div role="status" className="space-y-3 rounded-xl border border-prep-awarded/30 bg-prep-primary-soft px-4 py-3 text-sm">
          <p>
            <span className="font-semibold">{created.length} parent accounts made.</span> Download their temporary passwords now: they are shown only
            once.
          </p>
          <button
            type="button"
            className={prepButton()}
            onClick={() =>
              saveCsv("parent-passwords.csv", [
                ["Parent ID", "Temporary password", "Child's Student ID", "Child's name"],
                ...created.map((p) => [p.loginId, p.tempPassword, p.studentLoginId, p.studentName]),
              ])
            }
          >
            <Download aria-hidden /> Download parent passwords (CSV)
          </button>
        </div>
      ) : (
        <form action={action} className="space-y-3">
          <FormMessage error={state.error} />
          <p className="text-sm">
            {count === 1 ? "1 student has" : `${count} students have`} no parent account yet. Each gets one with a Parent ID from their Student ID
            (TMH11 → TP11) and a temporary password of its own.
          </p>
          <button type="submit" className={prepButton()} disabled={pending}>
            {pending ? "Making accounts…" : "Create the parent accounts"}
          </button>
        </form>
      )}
    </div>
  );
}

/** Adds a child (a sibling) to a parent account by Student ID. */
export function AddChildForm({ parentId, parentLoginId }: { parentId: string; parentLoginId: string }) {
  const [state, action, pending] = useActionState<MoveChildState, FormData>(moveChildAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);
  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-1.5"
      onSubmit={(e) => {
        const id = new FormData(e.currentTarget).get("studentLoginId");
        if (!confirm(`Put ${String(id).toUpperCase()} on ${parentLoginId}? If their own parent account has no other children, it is removed.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="parentId" value={parentId} />
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`child-${parentId}`}>
          Student ID of a child to add to {parentLoginId}
        </label>
        <input
          id={`child-${parentId}`}
          name="studentLoginId"
          placeholder="Student ID"
          autoCapitalize="characters"
          spellCheck={false}
          required
          className="min-h-9 w-28 rounded-lg border border-prep-input bg-prep-surface px-2 text-xs"
        />
        <button type="submit" className={cn(prepButton({ variant: "secondary" }), "px-3 text-xs")} disabled={pending}>
          {pending ? "Adding…" : "Add child"}
        </button>
      </div>
      {state.error ? <p className="text-xs text-prep-incorrect">{state.error}</p> : null}
      {state.success ? <p className="text-xs text-prep-awarded">{state.success}</p> : null}
    </form>
  );
}

/** Per-row actions on the people table. */
export function AccountRowActions({
  userId,
  name,
  active,
  isSelf,
}: {
  userId: string;
  name: string;
  active: boolean;
  isSelf: boolean;
}) {
  const [resetState, resetAction, resetting] = useActionState<AccountFormState, FormData>(resetPasswordAction, {});
  const [activeState, activeAction, toggling] = useActionState<AccountFormState, FormData>(setActiveAction, {});
  const small = "px-3 text-xs";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <form
          action={resetAction}
          onSubmit={(e) => {
            if (!confirm(`Reset the password for ${name}? They will be signed out.`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="name" value={name} />
          <button type="submit" className={cn(prepButton({ variant: "secondary" }), small)} disabled={resetting}>
            {resetting ? "Resetting…" : "Reset password"}
          </button>
        </form>
        {isSelf ? null : (
          <form
            action={activeAction}
            onSubmit={(e) => {
              if (active && !confirm(`Switch off ${name}'s account? They will be signed out and can't log in.`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="active" value={String(!active)} />
            <button type="submit" className={cn(prepButton({ variant: "ghost" }), small)} disabled={toggling}>
              {active ? "Switch off" : "Switch on"}
            </button>
          </form>
        )}
      </div>
      <FormMessage error={resetState.error ?? activeState.error} />
      {resetState.issued ? <IssuedPasswordNote issued={resetState.issued} /> : null}
    </div>
  );
}
