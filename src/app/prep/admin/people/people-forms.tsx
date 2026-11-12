"use client";

import { Download } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Field, FormMessage, prepButton, SelectField } from "@/components/prep/ui";
import {
  createAccountAction,
  importStudentsAction,
  resetPasswordAction,
  setActiveAction,
  type AccountFormState,
  type ImportFormState,
  type IssuedPassword,
} from "../actions";

type ClassOption = { id: string; name: string };

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

export function AddAccountForm({ classes }: { classes: ClassOption[] }) {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(createAccountAction, {});
  const [role, setRole] = useState("student");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.issued) {
      formRef.current?.reset();
      setRole("student");
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4" noValidate>
      <FormMessage error={state.error} />
      {state.issued ? <IssuedPasswordNote issued={state.issued} /> : null}
      <SelectField label="Role" name="role" value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="student">Student</option>
        <option value="teacher">Teacher</option>
        <option value="admin">Admin</option>
      </SelectField>
      <Field label={role === "student" ? "Student ID" : "Staff ID"} name="loginId" autoCapitalize="characters" spellCheck={false} required />
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
        {pending ? "Adding…" : "Add account"}
      </button>
    </form>
  );
}

function csvCell(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function downloadPasswords(rows: { loginId: string; name: string; className: string; tempPassword: string }[]) {
  const lines = [
    "Student ID,Name,Class,Temporary password",
    ...rows.map((r) => [r.loginId, r.name, r.className, r.tempPassword].map(csvCell).join(",")),
  ];
  const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "new-student-passwords.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportStudentsForm() {
  const [state, action, pending] = useActionState<ImportFormState, FormData>(importStudentsAction, {});
  const r = state.result;

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4" noValidate>
        <FormMessage error={state.error} />
        <div className="space-y-1.5">
          <label htmlFor="import-file" className="block text-sm font-semibold">
            Class list (CSV)
          </label>
          <input
            id="import-file"
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            aria-describedby="import-hint"
            className="block w-full text-sm file:mr-3 file:min-h-11 file:rounded-xl file:border file:border-prep-line file:bg-prep-surface file:px-4 file:font-semibold"
          />
          <p id="import-hint" className="text-sm text-prep-muted">
            Columns: Student ID, Name, Class. Export from Excel or Google Sheets as CSV. Existing students are moved or renamed; their
            passwords stay the same.
          </p>
        </div>
        <button type="submit" className={prepButton({ variant: "secondary" })} disabled={pending}>
          {pending ? "Importing…" : "Import"}
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
              <button type="button" className={prepButton()} onClick={() => downloadPasswords(r.created)}>
                <Download aria-hidden /> Download passwords (CSV)
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
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
