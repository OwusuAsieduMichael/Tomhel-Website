import { describe, expect, it } from "vitest";
import { assignmentFromForm } from "@/lib/prep/assignments";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function form(fields: Record<string, string | string[]>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of Array.isArray(v) ? v : [v]) fd.append(k, x);
  return fd;
}

const common = {
  subjectId: id(1),
  title: "Quiz",
  classIds: [id(2), id(3)],
  time: "30",
  opensAt: "2026-11-10T08:00",
  closesAt: "2026-11-12T18:00",
  attemptPolicy: "single",
  solutions: "after_close",
  status: "published",
};

describe("reading the assignment form", () => {
  it("reads a whole paper", () => {
    const r = assignmentFromForm(form({ ...common, source: "paper", kind: "objective", paperId: id(9), topicIds: id(7) }));
    expect(r.success && r.data).toMatchObject({ source: "paper", paperId: id(9), topicIds: [], questionIds: [], classIds: [id(2), id(3)], timeLimitMinutes: 30 });
    expect(r.success && r.data.closesAt.toISOString()).toBe("2026-11-12T18:00:00.000Z");
  });

  it("reads a topic quiz with a limit, and a bank pick", () => {
    const topic = assignmentFromForm(form({ ...common, source: "topic", kind: "objective", topicIds: [id(7), id(8)], questionLimit: "10", time: "none" }));
    expect(topic.success && topic.data).toMatchObject({ source: "topic", topicIds: [id(7), id(8)], questionLimit: 10, paperId: null, timeLimitMinutes: null });
    const bank = assignmentFromForm(form({ ...common, source: "bank", kind: "theory", questionIds: [id(5), id(4)], time: "custom", customMinutes: "25" }));
    expect(bank.success && bank.data).toMatchObject({ source: "bank", kind: "theory", questionIds: [id(5), id(4)], timeLimitMinutes: 25 });
  });

  it("explains what's missing", () => {
    const msg = (f: Record<string, string | string[]>) => {
      const r = assignmentFromForm(form(f));
      return r.success ? null : r.error.issues[0].message;
    };
    expect(msg({ ...common, source: "topic", kind: "objective" })).toBe("Choose at least one topic.");
    expect(msg({ ...common, source: "bank", kind: "objective" })).toBe("Pick at least one question.");
    expect(msg({ ...common, source: "paper", kind: "objective" })).toBe("Choose a paper.");
    expect(msg({ ...common, source: "paper", paperId: id(9), classIds: [] })).toBe("Choose at least one class.");
    expect(msg({ ...common, source: "paper", paperId: id(9), time: "custom", customMinutes: "2" })).toMatch(/at least 5 minutes/);
  });
});

describe("quiz or assignment", () => {
  it("reads the category, defaulting to assignment", () => {
    const quiz = assignmentFromForm(form({ ...common, category: "quiz", source: "paper", paperId: id(9) }));
    expect(quiz.success && quiz.data.category).toBe("quiz");
    const plain = assignmentFromForm(form({ ...common, source: "paper", paperId: id(9) }));
    expect(plain.success && plain.data.category).toBe("assignment");
  });
});
