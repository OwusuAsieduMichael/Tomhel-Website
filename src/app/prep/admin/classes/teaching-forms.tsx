"use client";

import { useActionState, useEffect, useRef } from "react";
import { Field, FormMessage, prepButton, SelectField } from "@/components/prep/ui";
import { addClassAction, assignTeacherAction, type TeachingFormState } from "../actions";

type Option = { id: string; name: string };

export function AssignTeacherForm({ teachers, subjects, classes }: { teachers: (Option & { loginId: string })[]; subjects: Option[]; classes: Option[] }) {
  const [state, action, pending] = useActionState<TeachingFormState, FormData>(assignTeacherAction, {});
  if (!teachers.length) {
    return <p className="text-sm text-prep-muted">Add a teacher on the People page first.</p>;
  }
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-3 sm:items-end">
      <div className="sm:col-span-3">
        <FormMessage error={state.error} success={state.success} />
      </div>
      <SelectField label="Teacher" name="teacherId" defaultValue="" required>
        <option value="" disabled>
          Choose a teacher
        </option>
        {teachers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} ({t.loginId})
          </option>
        ))}
      </SelectField>
      <SelectField label="Subject" name="subjectId" defaultValue="" required>
        <option value="" disabled>
          Choose a subject
        </option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </SelectField>
      <SelectField label="Class" name="classId" defaultValue="all">
        <option value="all">All classes</option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} only
          </option>
        ))}
      </SelectField>
      <div className="sm:col-span-3">
        <button type="submit" className={prepButton()} disabled={pending}>
          {pending ? "Assigning…" : "Assign teacher"}
        </button>
      </div>
    </form>
  );
}

export function AddClassForm({ defaultYear }: { defaultYear: string }) {
  const [state, action, pending] = useActionState<TeachingFormState, FormData>(addClassAction, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    // Clears the name; the year goes back to its default.
    if (state.success) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-4 sm:grid-cols-3 sm:items-end">
      <div className="sm:col-span-3">
        <FormMessage error={state.error} success={state.success} />
      </div>
      <Field label="Class name" name="name" placeholder="e.g. JHS 2B" hint="Starts with JHS 1, JHS 2 or JHS 3." required />
      <Field label="Academic year" name="academicYear" defaultValue={defaultYear} placeholder="2026/2027" required />
      <div>
        <button type="submit" className={prepButton({ variant: "secondary" })} disabled={pending}>
          {pending ? "Adding…" : "Add class"}
        </button>
      </div>
    </form>
  );
}
