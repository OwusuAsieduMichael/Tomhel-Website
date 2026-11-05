"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Field, prepButton, PrepCard, SelectField } from "@/components/prep/ui";
import type { QuestionInput } from "@/lib/prep/admin/question-bank";
import { cn } from "@/lib/utils";
import { saveQuestionAction } from "../../../actions";

type Strictness = QuestionInput["markingPoints"][number]["strictness"];
type PointDraft = { description: string; marks: string; strictness: Strictness; alternatives: string; keyTerms: string };
type OptionDraft = { label: string; text: string };

const TYPES: { value: QuestionInput["type"]; label: string }[] = [
  { value: "mcq", label: "Multiple choice" },
  { value: "short", label: "Short answer" },
  { value: "theory", label: "Theory" },
  { value: "calculation", label: "Calculation" },
  { value: "essay", label: "Essay" },
  { value: "diagram", label: "Diagram" },
];

const STRICTNESS: { value: Strictness; label: string }[] = [
  { value: "meaning", label: "Meaning (any wording with the same meaning)" },
  { value: "key_term", label: "Key term (must use the key terms)" },
  { value: "exact", label: "Exact (spelling matters)" },
  { value: "rubric", label: "Rubric (judged against the description)" },
];

const toLines = (s: string) =>
  s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

function TextArea({ label, hint, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <textarea
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={cn(
          "block w-full rounded-xl border border-prep-line bg-prep-surface px-4 py-3 text-base focus-visible:border-prep-primary focus-visible:outline-2 focus-visible:outline-prep-primary",
          className,
        )}
        {...props}
      />
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-prep-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function QuestionEditor({ paperId, question }: { paperId: string; question: QuestionInput & { id: string; status: "draft" | "approved" } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [problems, setProblems] = useState<string[]>([]);

  const [numberLabel, setNumberLabel] = useState(question.numberLabel);
  const [type, setType] = useState(question.type);
  const [text, setText] = useState(question.text);
  const [marks, setMarks] = useState(String(question.marks));
  const [strand, setStrand] = useState(question.topic?.strand ?? "");
  const [subStrand, setSubStrand] = useState(question.topic?.subStrand ?? "");
  const [imageUrls, setImageUrls] = useState(question.imageUrls.join("\n"));
  const [modelAnswer, setModelAnswer] = useState(question.modelAnswer ?? "");
  const [approved, setApproved] = useState(question.status === "approved");

  const [options, setOptions] = useState<OptionDraft[]>(
    question.options.length ? question.options.map(({ label, text }) => ({ label, text })) : ["A", "B", "C", "D"].map((label) => ({ label, text: "" })),
  );
  const [correct, setCorrect] = useState(question.options.find((o) => o.isCorrect)?.label ?? "");
  const [points, setPoints] = useState<PointDraft[]>(
    question.markingPoints.length
      ? question.markingPoints.map((mp) => ({
          description: mp.description,
          marks: String(mp.marks),
          strictness: mp.strictness,
          alternatives: mp.acceptedAlternatives.join("\n"),
          keyTerms: mp.keyTerms.join("\n"),
        }))
      : [{ description: "", marks: "1", strictness: "meaning", alternatives: "", keyTerms: "" }],
  );

  const isMcq = type === "mcq";
  const pointTotal = points.reduce((s, p) => s + (Number(p.marks) || 0), 0);
  const updatePoint = (i: number, patch: Partial<PointDraft>) => setPoints((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  function save() {
    const payload = {
      numberLabel,
      type,
      text,
      marks: Number(marks),
      imageUrls: toLines(imageUrls),
      topic: strand.trim() ? { strand, subStrand: subStrand.trim() || null } : null,
      options: isMcq ? options.map((o) => ({ ...o, isCorrect: o.label === correct })) : [],
      markingPoints: isMcq
        ? []
        : points.map((p) => ({
            description: p.description,
            marks: Number(p.marks),
            strictness: p.strictness,
            acceptedAlternatives: toLines(p.alternatives),
            keyTerms: toLines(p.keyTerms),
          })),
      modelAnswer: modelAnswer.trim() || null,
    };
    startTransition(async () => {
      const result = await saveQuestionAction(question.id, payload, approved);
      if (result.saved) {
        router.push(`/prep/admin/questions/${paperId}`);
      } else {
        setProblems(result.problems ?? ["Could not save."]);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      {problems.length ? (
        <div role="alert" className="rounded-xl border border-prep-incorrect/30 bg-prep-incorrect-bg px-4 py-3 text-sm text-prep-incorrect">
          <p className="font-semibold">Not saved:</p>
          <ul className="mt-1 list-disc pl-5">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <PrepCard className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Number as printed" name="numberLabel" value={numberLabel} onChange={(e) => setNumberLabel(e.target.value)} />
          <SelectField label="Type" name="type" value={type} onChange={(e) => setType(e.target.value as QuestionInput["type"])}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </SelectField>
          <Field label="Marks" name="marks" type="number" inputMode="decimal" min="0" step="0.5" value={marks} onChange={(e) => setMarks(e.target.value)} />
        </div>
        <TextArea label="Question" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Topic strand (optional)" name="strand" value={strand} onChange={(e) => setStrand(e.target.value)} />
          <Field label="Sub-strand (optional)" name="subStrand" value={subStrand} onChange={(e) => setSubStrand(e.target.value)} />
        </div>
        <TextArea label="Image links (optional)" hint="One full URL per line." rows={2} value={imageUrls} onChange={(e) => setImageUrls(e.target.value)} />
      </PrepCard>

      {isMcq ? (
        <PrepCard>
          <fieldset className="space-y-3">
            <legend className="text-lg font-bold">Options</legend>
            <p className="text-sm text-prep-muted">Choose the correct option with the circle.</p>
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-3">
                <input
                  type="radio"
                  name="correct"
                  aria-label={`Option ${o.label} is correct`}
                  checked={correct === o.label}
                  onChange={() => setCorrect(o.label)}
                  className="size-5 accent-prep-primary"
                />
                <span className="w-5 font-bold">{o.label}</span>
                <input
                  aria-label={`Option ${o.label}`}
                  value={o.text}
                  onChange={(e) => setOptions((os) => os.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                  className="block min-h-12 w-full rounded-xl border border-prep-line bg-prep-surface px-4 text-base focus-visible:border-prep-primary focus-visible:outline-2 focus-visible:outline-prep-primary"
                />
              </div>
            ))}
            <div className="flex gap-2">
              {options.length < 5 ? (
                <button
                  type="button"
                  className={prepButton({ variant: "ghost" })}
                  onClick={() => setOptions((os) => [...os, { label: "ABCDE"[os.length], text: "" }])}
                >
                  <Plus aria-hidden /> Add option {"ABCDE"[options.length]}
                </button>
              ) : null}
              {options.length > 2 ? (
                <button
                  type="button"
                  className={prepButton({ variant: "ghost" })}
                  onClick={() => {
                    const last = options[options.length - 1].label;
                    setOptions((os) => os.slice(0, -1));
                    if (correct === last) setCorrect("");
                  }}
                >
                  <Trash2 aria-hidden /> Remove option {options[options.length - 1].label}
                </button>
              ) : null}
            </div>
          </fieldset>
        </PrepCard>
      ) : (
        <PrepCard className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">Marking scheme</h2>
            <p className={cn("text-sm", pointTotal === Number(marks) ? "text-prep-muted" : "font-semibold text-prep-misspelt")}>
              Points add up to {pointTotal} of {Number(marks) || 0} marks.
            </p>
          </div>
          {points.map((p, i) => (
            <fieldset key={i} className="space-y-3 rounded-xl border border-prep-line p-4">
              <legend className="px-1 text-sm font-semibold">Point {i + 1}</legend>
              <TextArea label="What earns the mark" rows={2} value={p.description} onChange={(e) => updatePoint(i, { description: e.target.value })} />
              <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                <Field
                  label="Marks"
                  name={`mp-marks-${i}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  value={p.marks}
                  onChange={(e) => updatePoint(i, { marks: e.target.value })}
                />
                <SelectField label="Strictness" name={`mp-strict-${i}`} value={p.strictness} onChange={(e) => updatePoint(i, { strictness: e.target.value as Strictness })}>
                  {STRICTNESS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextArea label="Key terms" hint="One per line." rows={2} value={p.keyTerms} onChange={(e) => updatePoint(i, { keyTerms: e.target.value })} />
                <TextArea label="Also accept" hint="One answer per line." rows={2} value={p.alternatives} onChange={(e) => updatePoint(i, { alternatives: e.target.value })} />
              </div>
              {points.length > 1 ? (
                <button type="button" className={prepButton({ variant: "ghost" })} onClick={() => setPoints((ps) => ps.filter((_, j) => j !== i))}>
                  <Trash2 aria-hidden /> Remove point {i + 1}
                </button>
              ) : null}
            </fieldset>
          ))}
          <button
            type="button"
            className={prepButton({ variant: "secondary" })}
            onClick={() => setPoints((ps) => [...ps, { description: "", marks: "1", strictness: "meaning", alternatives: "", keyTerms: "" }])}
          >
            <Plus aria-hidden /> Add marking point
          </button>
        </PrepCard>
      )}

      <PrepCard className="space-y-4">
        <TextArea label="Model answer (optional)" hint="Shown to students after marking." rows={3} value={modelAnswer} onChange={(e) => setModelAnswer(e.target.value)} />
        <label className="flex min-h-11 items-center gap-3 font-semibold">
          <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} className="size-5 accent-prep-primary" />
          Approved (students can see this question)
        </label>
      </PrepCard>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className={prepButton()} disabled={pending}>
          {pending ? "Saving…" : "Save question"}
        </button>
        <button type="button" className={prepButton({ variant: "secondary" })} onClick={() => router.push(`/prep/admin/questions/${paperId}`)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
