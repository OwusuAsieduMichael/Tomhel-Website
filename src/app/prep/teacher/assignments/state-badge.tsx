import type { AssignmentState } from "@/lib/prep/assignments";
import { cn } from "@/lib/utils";

const styles: Record<AssignmentState, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-prep-track text-prep-muted" },
  scheduled: { label: "Scheduled", className: "bg-prep-misspelt-bg text-prep-flag-ink" },
  open: { label: "Open", className: "bg-prep-primary-soft text-prep-awarded" },
  closed: { label: "Closed", className: "bg-prep-ground text-prep-muted border border-prep-line" },
};

export function StateBadge({ state }: { state: AssignmentState }) {
  const s = styles[state];
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", s.className)}>{s.label}</span>;
}
