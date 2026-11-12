"use client";

import { useActionState, useState } from "react";
import { FormMessage } from "@/components/prep/ui";
import { cn } from "@/lib/utils";
import { startAttemptAction, type StartState } from "@/app/prep/practice/actions";

type Paper = { id: string; year: number; paperNo: number; durationMinutes: number | null; questions: number; marks: number };

const pill =
  "flex h-10 cursor-pointer items-center rounded-full border border-prep-input bg-prep-surface px-4 text-sm font-semibold has-[:checked]:border-prep-primary has-[:checked]:bg-prep-primary has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-prep-primary";
const card =
  "flex cursor-pointer flex-col gap-0.5 rounded-[14px] border border-prep-line bg-prep-surface px-[15px] py-[14px] has-[:checked]:border-2 has-[:checked]:border-prep-primary has-[:checked]:px-[14px] has-[:checked]:py-[13px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-prep-primary";
const segment =
  "flex min-h-11 flex-1 cursor-pointer flex-col items-center justify-center rounded-[9px] px-2 py-1 text-center text-[13px] font-semibold text-prep-muted has-[:checked]:bg-prep-surface has-[:checked]:font-bold has-[:checked]:text-prep-ink has-[:checked]:shadow-[0_1px_2px_rgba(0,0,0,0.08)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-prep-primary";
const timeBox =
  "flex h-14 cursor-pointer items-center justify-center rounded-xl border border-prep-input bg-prep-surface text-[15px] font-bold has-[:checked]:border-2 has-[:checked]:border-prep-primary has-[:checked]:bg-prep-primary-soft has-[:checked]:text-prep-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-prep-primary";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <fieldset className="flex flex-col gap-2.5">
    <legend className="mb-2.5 text-sm font-bold tracking-wide text-prep-muted">{title}</legend>
    {children}
  </fieldset>
);

export function StartPaperForm({ papers, theoryToTeacher }: { papers: Paper[]; theoryToTeacher: boolean }) {
  const [state, action, pending] = useActionState<StartState, FormData>(startAttemptAction, {});
  const years = [...new Set(papers.map((p) => p.year))];
  const [year, setYear] = useState(years[0]);
  const yearPapers = papers.filter((p) => p.year === year);
  const [paperId, setPaperId] = useState<string | undefined>(yearPapers[0]?.id);
  const paper = papers.find((p) => p.id === paperId) ?? yearPapers[0];
  const [mode, setMode] = useState<"practice" | "full">("full");
  const timeOptions = [...new Set([20, 30, 40, ...(paper?.durationMinutes ? [paper.durationMinutes] : [])])].sort((a, b) => a - b);
  const [time, setTime] = useState<string>(String(paper?.durationMinutes ?? 40));
  const objectives = paper?.paperNo === 1;

  const chooseYear = (y: number) => {
    setYear(y);
    const first = papers.find((p) => p.year === y);
    setPaperId(first?.id);
    if (first?.durationMinutes) setTime(String(first.durationMinutes));
  };

  return (
    <form action={action} className="flex flex-col gap-6">
      <FormMessage error={state.error} />

      <Section title="YEAR">
        <div className="flex flex-wrap gap-2">
          {years.map((y) => (
            <label key={y} className={pill}>
              <input type="radio" name="year" value={y} checked={y === year} onChange={() => chooseYear(y)} className="sr-only" />
              {y}
            </label>
          ))}
        </div>
      </Section>

      <Section title="PAPER">
        {yearPapers.map((p) => (
          <label key={p.id} className={card}>
            <input
              type="radio"
              name="paperId"
              value={p.id}
              checked={p.id === paper?.id}
              onChange={() => {
                setPaperId(p.id);
                if (p.durationMinutes) setTime(String(p.durationMinutes));
              }}
              className="sr-only"
            />
            <span className="text-[15px] font-bold">Paper {p.paperNo} · {p.paperNo === 1 ? "Objectives" : "Theory"}</span>
            <span className="text-[13px] text-prep-muted">
              {p.paperNo === 1
                ? `${p.questions} multiple-choice questions, marked instantly`
                : theoryToTeacher
                  ? `${p.questions} written questions, marked by your teacher`
                  : `${p.questions} written questions, marked point by point`}
            </span>
          </label>
        ))}
      </Section>

      {objectives ? (
        <Section title="MODE">
          <div className="flex gap-1 rounded-xl bg-prep-track p-1">
            {(
              [
                ["practice", "Practice", "answer after each"],
                ["full", "Full paper", "answers at the end"],
              ] as const
            ).map(([value, title, sub]) => (
              <label key={value} className={segment}>
                <input type="radio" name="mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="sr-only" />
                <span>{title}</span>
                <span className="font-semibold">{sub}</span>
              </label>
            ))}
          </div>
        </Section>
      ) : (
        <input type="hidden" name="mode" value="full" />
      )}

      <Section title="TIME YOURSELF">
        <div className="grid grid-cols-4 gap-2">
          {[...timeOptions.map(String), "none"].map((t) => (
            <label key={t} className={cn(timeBox, t === "none" && "text-sm")}>
              <input type="radio" name="time" value={t} checked={time === t} onChange={() => setTime(t)} className="sr-only" />
              {t === "none" ? "No limit" : `${t} min`}
            </label>
          ))}
        </div>
        <p className="text-[13px] leading-normal text-prep-muted">
          {paper?.durationMinutes ? `The real exam gives ${paper.durationMinutes} minutes. ` : ""}
          The timer keeps running if you leave the page. At zero, your paper is submitted automatically.
        </p>
      </Section>

      <button
        type="submit"
        disabled={pending || !paper}
        className="flex h-14 items-center justify-center rounded-[14px] bg-prep-primary text-base font-bold text-white hover:bg-prep-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-prep-primary disabled:opacity-60"
      >
        {pending ? "Starting…" : `Start Paper ${paper?.paperNo ?? ""} · ${time === "none" ? "no limit" : `${time} min`}`}
      </button>
    </form>
  );
}
