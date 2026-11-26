"use client";

import { GraduationCap } from "lucide-react";
import { useActionState } from "react";
import { Field, FormMessage, prepButton } from "@/components/prep/ui";
import { graduateClassAction, undoGraduationAction, type GraduationState } from "../actions";

type FinalClass = {
  id: string;
  name: string;
  academicYear: string;
  students: number;
  graduated: number;
  graduatedOn: string | null;
  message: string | null;
};

/** One final-year class: graduate it (date + message), or see that it has graduated and undo if needed. */
export function GraduateClassCard({ c, defaultMessage, today }: { c: FinalClass; defaultMessage: string; today: string }) {
  const [state, action, pending] = useActionState<GraduationState, FormData>(graduateClassAction, {});
  const remaining = c.students - c.graduated;
  return (
    <div className="space-y-3 rounded-2xl border border-prep-line bg-prep-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-bold">
          {c.name} <span className="font-normal text-prep-muted">· {c.academicYear}</span>
        </h3>
        <span className="text-sm text-prep-muted">
          {c.graduated ? `${c.graduated} of ${c.students} graduated${c.graduatedOn ? ` on ${c.graduatedOn}` : ""}` : `${c.students} students`}
        </span>
      </div>
      <FormMessage error={state.error} success={state.success} />
      {c.graduated ? (
        <div className="space-y-2 text-sm">
          <p className="rounded-xl bg-prep-primary-soft px-3.5 py-3">
            <span className="font-semibold">Their message:</span> {c.message}
          </p>
          <form
            action={undoGraduationAction}
            onSubmit={(e) => {
              if (!confirm(`Undo the graduation of ${c.name}? The congratulations message disappears for them and their parents.`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="classId" value={c.id} />
            <button type="submit" className="min-h-11 rounded-xl px-3 text-sm font-semibold text-prep-incorrect hover:bg-prep-incorrect-bg">
              Undo graduation
            </button>
          </form>
        </div>
      ) : null}
      {remaining > 0 ? (
        <form
          action={action}
          className="space-y-3"
          onSubmit={(e) => {
            if (!confirm(`Graduate ${remaining} ${remaining === 1 ? "student" : "students"} of ${c.name}?`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="classId" value={c.id} />
          <Field label="Graduation date" name="graduatedOn" type="date" defaultValue={today} required hint="The message shows from this day on." />
          <div className="space-y-1.5">
            <label htmlFor={`grad-msg-${c.id}`} className="block text-sm font-semibold">
              Message to the graduates
            </label>
            <textarea
              id={`grad-msg-${c.id}`}
              name="message"
              rows={3}
              maxLength={600}
              defaultValue={defaultMessage}
              className="w-full rounded-xl border border-prep-input bg-prep-surface px-3.5 py-3 text-base leading-relaxed focus-visible:border-prep-primary focus-visible:outline-2 focus-visible:outline-prep-primary"
            />
          </div>
          <button type="submit" className={prepButton()} disabled={pending || c.students === 0}>
            <GraduationCap aria-hidden /> {pending ? "Graduating…" : c.graduated ? `Graduate the other ${remaining}` : `Graduate ${c.name}`}
          </button>
        </form>
      ) : null}
    </div>
  );
}
