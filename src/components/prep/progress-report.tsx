import Link from "next/link";
import { fmtMarks, formatDayTime } from "@/lib/prep/format";
import type { ReportItem, StudentReport, SubjectLine, WorkPart } from "@/lib/prep/reports";
import { cn } from "@/lib/utils";
import { PrepCard } from "./ui";

/**
 * A student's progress report: BECE Prep, Quizzes and Assignments, and nothing else.
 * The same component for the student, their parent and their teacher; `attemptHref` says where a result opens.
 */
export function ProgressReport({ report, attemptHref, who }: { report: StudentReport; attemptHref: (attemptId: string) => string; who: "self" | "other" }) {
  return (
    <div className="space-y-8">
      <BeceSection part={report.bece} attemptHref={attemptHref} who={who} />
      <WorkSection title="Quizzes" plural="quizzes" part={report.quizzes} attemptHref={attemptHref} />
      <WorkSection title="Assignments" plural="assignments" part={report.assignments} attemptHref={attemptHref} />
    </div>
  );
}

const pctText = (p: number | null) => (p === null ? "—" : `${p}%`);

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <PrepCard className="break-inside-avoid">
      <dt className="text-sm text-prep-muted">{label}</dt>
      <dd className="mt-1 text-3xl font-bold tabular-nums">{value}</dd>
      {sub ? <dd className="mt-0.5 text-[13px] text-prep-muted">{sub}</dd> : null}
    </PrepCard>
  );
}

function SectionHeading({ id, title, sub }: { id: string; title: string; sub: string }) {
  return (
    <div>
      <h2 id={id} className="text-xl font-bold">
        {title}
      </h2>
      <p className="text-sm text-prep-muted">{sub}</p>
    </div>
  );
}

function BeceSection({ part, attemptHref, who }: { part: StudentReport["bece"]; attemptHref: (id: string) => string; who: "self" | "other" }) {
  return (
    <section aria-labelledby="report-bece" className="space-y-4 break-inside-avoid-page">
      <SectionHeading id="report-bece" title="BECE Prep" sub={who === "self" ? "Past papers you practised on your own." : "Past papers practised on their own."} />
      {part.done ? (
        <>
          <dl className="grid grid-cols-3 gap-3">
            <Tile label="Papers done" value={String(part.done)} />
            <Tile label="Average" value={pctText(part.average)} />
            <Tile label="Best" value={pctText(part.best)} />
          </dl>
          <TrendChart items={part.items} label="BECE Prep scores, oldest to newest" />
          <SubjectBars lines={part.bySubject} caption="BECE Prep average by subject" />
          <ItemList items={part.items} attemptHref={attemptHref} />
        </>
      ) : (
        <PrepCard className="text-prep-muted">No past papers finished yet.</PrepCard>
      )}
    </section>
  );
}

function WorkSection({
  title,
  plural,
  part,
  attemptHref,
}: {
  title: string;
  plural: string;
  part: WorkPart;
  attemptHref: (id: string) => string;
}) {
  const id = `report-${plural}`;
  return (
    <section aria-labelledby={id} className="space-y-4 break-inside-avoid-page">
      <SectionHeading id={id} title={title} sub={`${title} set by the teacher for the class.`} />
      {part.set ? (
        <>
          <dl className="grid grid-cols-3 gap-3">
            <Tile label="Done" value={`${part.done}/${part.set}`} sub={part.open ? `${part.open} still open` : undefined} />
            <Tile label="Average" value={pctText(part.average)} />
            <Tile label="Missed" value={String(part.missed)} sub={part.missed ? "closed before being done" : undefined} />
          </dl>
          {part.missedTitles.length ? (
            <p className="rounded-xl border border-prep-incorrect/30 bg-prep-incorrect-bg px-4 py-3 text-sm text-prep-incorrect-ink">
              <span className="font-semibold">Missed:</span> {part.missedTitles.join(", ")}
            </p>
          ) : null}
          {part.done ? (
            <>
              <TrendChart items={part.items} label={`${title} scores, oldest to newest`} />
              <SubjectBars lines={part.bySubject} caption={`${title} average by subject`} />
              <ItemList items={part.items} attemptHref={attemptHref} />
            </>
          ) : null}
        </>
      ) : (
        <PrepCard className="text-prep-muted">No {plural} set yet.</PrepCard>
      )}
    </section>
  );
}

/** Average per subject: one bar each, the value written beside it. */
function SubjectBars({ lines, caption }: { lines: SubjectLine[]; caption: string }) {
  if (lines.length < 2) return null;
  return (
    <figure className="break-inside-avoid space-y-2 rounded-2xl border border-prep-line bg-prep-surface p-4">
      <figcaption className="text-sm font-bold">{caption}</figcaption>
      <ul className="space-y-2.5">
        {lines.map((l) => (
          <li key={l.subjectId} className="grid grid-cols-[minmax(7rem,10rem)_1fr_3.5rem] items-center gap-3 text-sm" title={`${l.name}: ${pctText(l.average)} over ${l.done} done`}>
            <span className="truncate">{l.name}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-prep-track" aria-hidden>
              <span className="block h-full rounded-full bg-prep-primary" style={{ width: `${l.average ?? 0}%` }} />
            </span>
            <span className="text-right font-semibold tabular-nums">
              {pctText(l.average)}
              <span className="sr-only">, {l.done} done</span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** Scores over time (oldest left). Each point has a tooltip; the list below is the table view. */
function TrendChart({ items, label }: { items: ReportItem[]; label: string }) {
  const points = items
    .filter((i) => i.percent !== null)
    .slice(0, 15)
    .reverse();
  if (points.length < 2) return null;
  const W = 600;
  const H = 160;
  const pad = { l: 34, r: 12, t: 12, b: 22 };
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / (points.length - 1);
  const y = (p: number) => pad.t + ((100 - p) * (H - pad.t - pad.b)) / 100;
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.percent!).toFixed(1)}`).join(" ");
  return (
    <figure className="break-inside-avoid rounded-2xl border border-prep-line bg-prep-surface p-4">
      <figcaption className="mb-2 text-sm font-bold">{label}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${label}: ${points.map((p) => `${p.percent}%`).join(", ")}`}>
        {[0, 50, 100].map((g) => (
          <g key={g}>
            <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} className="stroke-prep-line" strokeWidth={1} />
            <text x={pad.l - 6} y={y(g) + 4} textAnchor="end" className="fill-prep-muted text-[11px]">
              {g}%
            </text>
          </g>
        ))}
        <path d={path} fill="none" className="stroke-prep-primary" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={p.attemptId}>
            <circle cx={x(i)} cy={y(p.percent!)} r={4.5} className="fill-prep-primary stroke-prep-surface" strokeWidth={2} />
            {/* A larger, invisible target for the tooltip. */}
            <circle cx={x(i)} cy={y(p.percent!)} r={14} fill="transparent">
              <title>{`${p.subjectName} · ${p.title}: ${p.percent}% (${formatDayTime(p.at)})`}</title>
            </circle>
          </g>
        ))}
        <text x={pad.l} y={H - 4} className="fill-prep-muted text-[11px]">
          Oldest
        </text>
        <text x={W - pad.r} y={H - 4} textAnchor="end" className="fill-prep-muted text-[11px]">
          Newest
        </text>
      </svg>
    </figure>
  );
}

const tone = (p: number | null) => (p === null ? "text-prep-muted" : p >= 70 ? "text-prep-awarded" : p >= 40 ? "text-prep-flag-ink" : "text-prep-incorrect");

function ItemList({ items, attemptHref }: { items: ReportItem[]; attemptHref: (id: string) => string }) {
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.attemptId} className="break-inside-avoid">
          <Link href={attemptHref(i.attemptId)} className="flex items-center gap-3 rounded-xl border border-prep-line bg-prep-surface p-3.5 hover:border-prep-primary">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-bold">{i.title}</span>
              <span className="text-[13px] text-prep-muted">
                {i.subjectName} · {formatDayTime(i.at)}
                {i.pendingMarks ? " · some marks with the teacher" : ""}
              </span>
            </div>
            <span className={cn("text-right text-sm font-bold tabular-nums", tone(i.percent))}>
              {i.marked > 0 ? (
                <>
                  {fmtMarks(i.score)}/{fmtMarks(i.marked)}
                  <span className="block text-xs font-semibold">{i.percent}%</span>
                </>
              ) : (
                "Marking"
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
