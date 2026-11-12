"use client";

import { useActionState, useState } from "react";
import { FormMessage } from "@/components/prep/ui";
import type { AssignmentFormOptions } from "@/lib/prep/assignments";
import { saveAssignmentAction, type AssignmentFormState } from "./actions";

export type AssignmentDefaults = {
  id?: string;
  subjectId: string;
  source: "paper" | "topic" | "bank";
  kind: "objective" | "theory";
  paperId: string;
  topicIds: string[];
  questionIds: string[];
  questionLimit: number | null;
  title: string;
  classIds: string[];
  timeLimitMinutes: number | null;
  opensAt: string;
  closesAt: string;
  attemptPolicy: "single" | "best";
  solutions: "after_submit" | "after_close" | "on_release" | "instant";
  status: "draft" | "published";
};

const PRESETS = [20, 30, 40, 60, 90];

const pill =
  "flex min-h-11 cursor-pointer items-center rounded-full border border-prep-input bg-prep-surface px-4 text-sm font-semibold has-[:checked]:border-prep-primary has-[:checked]:bg-prep-primary has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-prep-primary has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60";
const card =
  "flex cursor-pointer flex-col gap-0.5 rounded-[14px] border border-prep-line bg-prep-surface px-[15px] py-[13px] has-[:checked]:border-2 has-[:checked]:border-prep-primary has-[:checked]:px-[14px] has-[:checked]:py-[12px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-prep-primary has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60";
const input =
  "block min-h-[52px] w-full rounded-xl border border-prep-input bg-prep-surface px-4 text-base text-prep-ink focus-visible:border-prep-primary focus-visible:outline-2 focus-visible:outline-prep-primary";
const label = "mb-1.5 block text-sm font-semibold";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-prep-line bg-prep-surface p-5">
      <h2 className="text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}

const fmtPreview = (v: string) => {
  const d = v ? new Date(`${v}:00Z`) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" }).format(d);
};

function openFor(opens: string, closes: string) {
  const ms = new Date(`${closes}:00Z`).getTime() - new Date(`${opens}:00Z`).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const h = Math.round(ms / 3_600_000);
  const days = Math.floor(h / 24);
  const hours = h % 24;
  const part = (n: number, w: string) => (n ? `${n} ${w}${n === 1 ? "" : "s"}` : "");
  return [part(days, "day"), part(hours, "hour")].filter(Boolean).join(" ") || "less than an hour";
}

export function AssignmentForm({
  options,
  defaults,
  started,
}: {
  options: AssignmentFormOptions;
  defaults: AssignmentDefaults;
  /** Students have started: the paper is fixed and it can't go back to draft. */
  started: boolean;
}) {
  const [state, action, pending] = useActionState<AssignmentFormState, FormData>(saveAssignmentAction, {});
  const [subjectId, setSubjectId] = useState(defaults.subjectId);
  const subject = options.find((s) => s.id === subjectId) ?? options[0];
  const [paperId, setPaperId] = useState(defaults.paperId);
  const paper = subject?.papers.find((p) => p.id === paperId);
  const [title, setTitle] = useState(defaults.title);
  // The Type choice: a whole paper, or an objective or theory quiz drawn from topics or picked from the bank.
  const [type, setType] = useState<"paper" | "objective" | "theory">(defaults.source === "paper" ? "paper" : defaults.kind);
  const [pickBy, setPickBy] = useState<"topic" | "bank">(defaults.source === "bank" ? "bank" : "topic");
  const [topicIds, setTopicIds] = useState<string[]>(defaults.topicIds);
  const [limit, setLimit] = useState(defaults.questionLimit ? String(defaults.questionLimit) : "");
  const [picked, setPicked] = useState<string[]>(defaults.questionIds);
  const [search, setSearch] = useState("");
  const [classIds, setClassIds] = useState<string[]>(defaults.classIds);
  const initialTime = defaults.timeLimitMinutes === null ? "none" : PRESETS.includes(defaults.timeLimitMinutes) ? String(defaults.timeLimitMinutes) : "custom";
  const [time, setTime] = useState(initialTime);
  const [custom, setCustom] = useState(initialTime === "custom" ? String(defaults.timeLimitMinutes) : "");
  const [opensAt, setOpensAt] = useState(defaults.opensAt);
  const [closesAt, setClosesAt] = useState(defaults.closesAt);
  const [attemptPolicy, setAttemptPolicy] = useState(defaults.attemptPolicy);
  const [solutions, setSolutions] = useState(defaults.solutions);

  const source = type === "paper" ? "paper" : pickBy;
  const kind = type === "paper" ? (paper && !paper.mcq ? "theory" : "objective") : type;
  const kindTopics = (subject?.topics ?? []).filter((t) => (type === "theory" ? t.theory : t.objective) > 0);
  const topicPool = kindTopics.filter((t) => topicIds.includes(t.id)).reduce((n, t) => n + (type === "theory" ? t.theory : t.objective), 0);
  const kindBank = (subject?.bank ?? []).filter((q) => q.kind === type);
  const needle = search.trim().toLowerCase();
  const shownBank = needle ? kindBank.filter((q) => (q.text + " " + q.source).toLowerCase().includes(needle)) : kindBank;
  const questionCount = source === "paper" ? (paper?.questions ?? 0) : source === "bank" ? picked.length : Math.min(topicPool, Number(limit) || topicPool);
  const marks = source === "paper" ? (paper?.marks ?? null) : source === "bank" ? kindBank.filter((q) => picked.includes(q.id)).reduce((n, q) => n + q.marks, 0) : null;
  const togglePick = (id: string) => setPicked((ps) => (ps.includes(id) ? ps.filter((p) => p !== id) : [...ps, id]));
  const toggleTopic = (id: string) => setTopicIds((ts) => (ts.includes(id) ? ts.filter((t) => t !== id) : [...ts, id]));

  const chosenClasses = subject?.classes.filter((c) => classIds.includes(c.id)) ?? [];
  const students = chosenClasses.reduce((s, c) => s + c.students, 0);
  const minutes = time === "none" ? null : time === "custom" ? Number(custom) || null : Number(time);
  const duration = openFor(opensAt, closesAt);

  const chooseSubject = (id: string) => {
    setSubjectId(id);
    const s = options.find((x) => x.id === id);
    setPaperId(s?.papers[0]?.id ?? "");
    setClassIds(s?.classes.map((c) => c.id) ?? []);
    setTopicIds([]);
    setPicked([]);
  };
  const choosePaper = (id: string) => {
    setPaperId(id);
    const p = subject?.papers.find((x) => x.id === id);
    if (p && !title) setTitle(`BECE ${p.year} Paper ${p.paperNo}`);
  };
  const toggleClass = (id: string) => setClassIds((cs) => (cs.includes(id) ? cs.filter((c) => c !== id) : [...cs, id]));

  if (!subject) {
    return <p className="rounded-2xl border border-prep-line bg-prep-surface p-5 text-prep-muted">No subjects have been assigned to you yet. Ask the admin to add them.</p>;
  }

  return (
    <form action={action} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      {defaults.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
      <div className="flex flex-col gap-5">
        <FormMessage error={state.error} />

        <Section title="1. What to set">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="subjectId" className={label}>
                Subject
              </label>
              <select id="subjectId" name="subjectId" value={subject.id} onChange={(e) => chooseSubject(e.target.value)} disabled={started} className={input}>
                {options.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {started ? <input type="hidden" name="subjectId" value={subject.id} /> : null}
            </div>
            <div>
              <label htmlFor="title" className={label}>
                Title students will see
              </label>
              <input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required placeholder="e.g. Photosynthesis practice" className={input} />
            </div>
          </div>

          <input type="hidden" name="source" value={source} />
          <input type="hidden" name="kind" value={kind} />
          <fieldset disabled={started} className="flex flex-col gap-2.5">
            <legend className={label}>Type</legend>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {(
                [
                  ["paper", "BECE paper", "A whole past paper"],
                  ["objective", "Objective quiz", "Marked instantly"],
                  ["theory", "Theory", subject.autoMarkTheory ? "Marked point by point" : "Marked by you"],
                ] as const
              ).map(([value, name, sub]) => (
                <label key={value} className={card}>
                  <input type="radio" name="type" value={value} checked={type === value} onChange={() => setType(value)} className="sr-only" />
                  <span className="text-[15px] font-bold">{name}</span>
                  <span className="text-[13px] text-prep-muted">{sub}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {type === "paper" ? (
            <fieldset disabled={started} className="flex flex-col gap-2.5">
              <legend className={label}>Past paper</legend>
              {subject.papers.length === 0 ? (
                <p className="rounded-xl border border-dashed border-prep-line p-3.5 text-sm text-prep-muted">
                  {subject.name} has no approved papers yet. Ask the admin to import and approve one.
                </p>
              ) : (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {subject.papers.map((p) => (
                    <label key={p.id} className={card}>
                      <input type="radio" name="paperId" value={p.id} checked={p.id === paperId} onChange={() => choosePaper(p.id)} className="sr-only" />
                      <span className="text-[15px] font-bold">
                        BECE {p.year} · Paper {p.paperNo}
                      </span>
                      <span className="text-[13px] text-prep-muted">
                        {p.questions}{" "}
                        {p.mcq ? "objective questions, marked instantly" : subject.autoMarkTheory ? "written questions, marked point by point" : "written questions, marked by you"}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          ) : (
            <fieldset disabled={started} className="flex flex-col gap-3">
              <legend className={label}>Questions</legend>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["topic", "By topic"],
                    ["bank", "Pick from bank"],
                  ] as const
                ).map(([value, name]) => (
                  <label key={value} className={pill}>
                    <input type="radio" name="pickBy" value={value} checked={pickBy === value} onChange={() => setPickBy(value)} className="sr-only" />
                    {name}
                  </label>
                ))}
              </div>

              {pickBy === "topic" ? (
                kindTopics.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-prep-line p-3.5 text-sm text-prep-muted">
                    No {type === "objective" ? "objective" : "written"} questions in {subject.name} have a topic yet. Pick from the bank instead, or ask the admin to
                    add topics to the questions.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {kindTopics.map((t) => (
                        <label key={t.id} className={pill}>
                          <input type="checkbox" name="topicIds" value={t.id} checked={topicIds.includes(t.id)} onChange={() => toggleTopic(t.id)} className="sr-only" />
                          {t.name}
                          <span className="ml-1.5 font-normal opacity-80">{type === "theory" ? t.theory : t.objective}</span>
                        </label>
                      ))}
                    </div>
                    <div className="max-w-[280px]">
                      <label htmlFor="questionLimit" className={label}>
                        Number of questions <span className="font-normal text-prep-muted">(blank = all {topicPool})</span>
                      </label>
                      <input id="questionLimit" name="questionLimit" type="number" min={1} max={200} value={limit} onChange={(e) => setLimit(e.target.value)} className={input} />
                    </div>
                    <p className="text-[13px] text-prep-muted">The questions are drawn at random once, when you save, so every student gets the same set.</p>
                  </>
                )
              ) : kindBank.length === 0 ? (
                <p className="rounded-xl border border-dashed border-prep-line p-3.5 text-sm text-prep-muted">
                  {subject.name} has no approved {type === "objective" ? "objective" : "written"} questions yet.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div className="min-w-[220px] flex-1">
                      <label htmlFor="bankSearch" className={label}>
                        Search the bank
                      </label>
                      <input id="bankSearch" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Words in the question, or a year" className={input} />
                    </div>
                    <span className="pb-3 text-sm font-semibold">{picked.length} picked</span>
                  </div>
                  {picked.map((id) => (
                    <input key={id} type="hidden" name="questionIds" value={id} />
                  ))}
                  <ul className="max-h-[360px] overflow-y-auto rounded-xl border border-prep-line">
                    {shownBank.slice(0, 200).map((q) => (
                      <li key={q.id} className="border-b border-prep-line last:border-b-0">
                        <label className="flex min-h-11 cursor-pointer items-start gap-3 px-3.5 py-2.5 hover:bg-prep-ground has-[:checked]:bg-prep-primary-soft">
                          <input type="checkbox" checked={picked.includes(q.id)} onChange={() => togglePick(q.id)} className="mt-1 size-4 accent-prep-primary" />
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="text-sm">{q.text}</span>
                            <span className="text-xs text-prep-muted">
                              {q.source} · {q.marks} {q.marks === 1 ? "mark" : "marks"}
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                    {shownBank.length === 0 ? <li className="px-3.5 py-3 text-sm text-prep-muted">No questions match.</li> : null}
                  </ul>
                  {shownBank.length > 200 ? <p className="text-[13px] text-prep-muted">Showing the first 200. Search to narrow it down.</p> : null}
                </div>
              )}
            </fieldset>
          )}
          {started ? (
            <>
              <p className="text-[13px] text-prep-muted">Students have started, so the questions can&apos;t be changed.</p>
              {/* Disabled fields aren't submitted, so the fixed question set goes along as hidden fields. */}
              {type === "paper" ? <input type="hidden" name="paperId" value={paperId} /> : null}
              {source === "topic" ? topicIds.map((t) => <input key={t} type="hidden" name="topicIds" value={t} />) : null}
              {source === "topic" && limit ? <input type="hidden" name="questionLimit" value={limit} /> : null}
              {source === "bank" ? picked.map((id) => <input key={id} type="hidden" name="questionIds" value={id} />) : null}
            </>
          ) : null}

        </Section>

        <Section title="2. Who">
          <fieldset>
            <legend className={label}>Classes</legend>
            <div className="flex flex-wrap gap-2">
              {subject.classes.map((c) => (
                <label key={c.id} className={pill}>
                  <input type="checkbox" name="classIds" value={c.id} checked={classIds.includes(c.id)} onChange={() => toggleClass(c.id)} className="sr-only" />
                  {c.name}
                  <span className="ml-1.5 font-normal opacity-80">{c.students}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </Section>

        <Section title="3. Time">
          <fieldset>
            <legend className={label}>Time limit per student</legend>
            <div className="flex flex-wrap gap-2">
              {[...PRESETS.map(String), "custom", "none"].map((t) => (
                <label key={t} className={pill}>
                  <input type="radio" name="time" value={t} checked={time === t} onChange={() => setTime(t)} className="sr-only" />
                  {t === "none" ? "No limit" : t === "custom" ? "Custom" : `${t} min`}
                </label>
              ))}
            </div>
            {time === "custom" ? (
              <div className="mt-3 max-w-[200px]">
                <label htmlFor="customMinutes" className={label}>
                  Minutes
                </label>
                <input id="customMinutes" name="customMinutes" type="number" min={5} max={240} value={custom} onChange={(e) => setCustom(e.target.value)} required className={input} />
              </div>
            ) : null}
            {paper?.durationMinutes ? <p className="mt-2 text-[13px] text-prep-muted">The real exam gives {paper.durationMinutes} minutes.</p> : null}
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="opensAt" className={label}>
                Opens
              </label>
              <input id="opensAt" name="opensAt" type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} required className={input} />
            </div>
            <div>
              <label htmlFor="closesAt" className={label}>
                Closes
              </label>
              <input id="closesAt" name="closesAt" type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} required className={input} />
            </div>
          </div>
          <p className="text-[13px] text-prep-muted">
            {duration ? `Open for ${duration}. ` : "The close must be after the open. "}
            Unfinished attempts are submitted automatically at the close, with the answers last saved.
          </p>
        </Section>

        <Section title="4. Rules">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="attemptPolicy" className={label}>
                Attempts
              </label>
              <select id="attemptPolicy" name="attemptPolicy" value={attemptPolicy} onChange={(e) => setAttemptPolicy(e.target.value as typeof attemptPolicy)} className={input}>
                <option value="single">One attempt</option>
                <option value="best">Several, keep the best score</option>
              </select>
            </div>
            <div>
              <label htmlFor="solutions" className={label}>
                Show answers and solutions
              </label>
              <select id="solutions" name="solutions" value={kind !== "objective" && solutions === "instant" ? "after_close" : solutions} onChange={(e) => setSolutions(e.target.value as typeof solutions)} className={input}>
                <option value="after_close">After the close date</option>
                <option value="after_submit">Right after submitting</option>
                <option value="on_release">When I release them</option>
                {kind === "objective" ? <option value="instant">After each question (instant marking)</option> : null}
              </select>
            </div>
          </div>
          <p className="text-[13px] text-prep-muted">Students always see their score straight away.</p>
        </Section>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
        <div className="rounded-2xl border border-prep-line bg-prep-surface p-5">
          <h2 className="text-xs font-bold tracking-wide text-prep-muted">STUDENTS WILL SEE</h2>
          <div className="mt-3 flex flex-col gap-1 rounded-xl bg-prep-primary p-4 text-white">
            <span className="text-xs font-semibold tracking-wide opacity-85">SET BY YOUR TEACHER</span>
            <span className="text-[15px] font-bold">
              {subject.name} · {title || "Untitled"}
            </span>
            <span className="text-[13px] opacity-90">
              {minutes ? `${minutes} min` : "No time limit"}
              {closesAt ? ` · closes ${fmtPreview(closesAt)}` : ""}
            </span>
          </div>
          <ul className="mt-4 flex list-disc flex-col gap-1.5 pl-5 text-sm text-prep-muted">
            <li>
              {students} {students === 1 ? "student" : "students"}
              {chosenClasses.length ? ` in ${chosenClasses.map((c) => c.name).join(", ")}` : ""}
            </li>
            <li>
              {questionCount} {kind === "objective" ? "objective" : "written"} {questionCount === 1 ? "question" : "questions"}
              {marks !== null ? `, ${marks} marks` : ""}
            </li>
            {opensAt ? <li>Opens {fmtPreview(opensAt)}</li> : null}
          </ul>
        </div>
        <div className="flex flex-col gap-2.5">
          <button
            type="submit"
            name="status"
            value="published"
            disabled={pending || questionCount === 0}
            className="flex min-h-[52px] items-center justify-center rounded-xl bg-prep-primary px-5 text-[15px] font-bold text-white hover:bg-prep-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-prep-primary disabled:opacity-60"
          >
            {pending ? "Saving…" : defaults.status === "published" ? "Save changes" : "Publish to students"}
          </button>
          {!started ? (
            <button
              type="submit"
              name="status"
              value="draft"
              disabled={pending || questionCount === 0}
              className="flex min-h-[52px] items-center justify-center rounded-xl border border-prep-input bg-prep-surface px-5 text-[15px] font-bold hover:bg-prep-ground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-prep-primary disabled:opacity-60"
            >
              {defaults.status === "published" ? "Unpublish (back to draft)" : "Save draft"}
            </button>
          ) : null}
        </div>
      </aside>
    </form>
  );
}
