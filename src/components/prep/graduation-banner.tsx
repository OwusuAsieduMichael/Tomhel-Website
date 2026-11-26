import { GraduationCap } from "lucide-react";

/** The congratulations shown to a graduate on their home page, and to their parents on theirs. */
export function GraduationBanner({ heading, line, message }: { heading: string; line: string; message: string }) {
  return (
    <section aria-label="Graduation" className="mb-6 flex gap-4 rounded-2xl border border-prep-awarded/30 bg-prep-primary-soft p-5">
      <GraduationCap className="size-9 shrink-0 text-prep-primary" aria-hidden />
      <div className="min-w-0 space-y-1.5">
        <h2 className="text-xl font-bold text-prep-ink">{heading}</h2>
        <p className="text-sm font-semibold text-prep-awarded">{line}</p>
        <p className="leading-relaxed text-prep-ink">{message}</p>
      </div>
    </section>
  );
}
