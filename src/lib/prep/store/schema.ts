/**
 * BECE Prep data schema. Each table is one tab in the "Tomhel BECE Prep Database" Google Sheet.
 *
 * Every cell is stored as text; this file says how to read each column back.
 * To add a column: add it here, then run `npm run prep:setup` (adds missing tabs/columns, never deletes).
 * Every table has a text `id` column (a UUID made by the website).
 */

type Col =
  | { type: "string"; nullable?: boolean }
  | { type: "number"; nullable?: boolean }
  | { type: "boolean" }
  | { type: "date"; nullable?: boolean }
  /** A list of strings, stored as JSON. */
  | { type: "list" }
  /** Any JSON value. Validate it where it is used. */
  | { type: "json" }
  | { type: "enum"; values: readonly string[] };

const str = { type: "string" } as const;
const optStr = { type: "string", nullable: true } as const;
const num = { type: "number" } as const;
const optNum = { type: "number", nullable: true } as const;
const bool = { type: "boolean" } as const;
const date = { type: "date" } as const;
const optDate = { type: "date", nullable: true } as const;
const list = { type: "list" } as const;
const json = { type: "json" } as const;
const oneOf = <const V extends readonly string[]>(values: V) => ({ type: "enum", values }) as const;

export const ROLES = ["student", "teacher", "admin"] as const;
export const QUESTION_TYPES = ["mcq", "short", "theory", "calculation", "essay", "diagram"] as const;
export const QUESTION_STATUSES = ["draft", "approved"] as const;
export const STRICTNESS = ["exact", "key_term", "meaning", "rubric"] as const;
export const ATTEMPT_MODES = ["practice", "full"] as const;
export const ATTEMPT_STATUSES = ["in_progress", "submitted"] as const;

export const tables = {
  classes: {
    sheet: "Classes",
    /** name: e.g. "JHS 3A"; yearGroup: 1-3; academicYear: e.g. "2026/2027". */
    columns: { id: str, name: str, yearGroup: num, academicYear: str, createdAt: date },
  },
  users: {
    sheet: "Users",
    columns: {
      id: str,
      role: oneOf(ROLES),
      name: str,
      /** Student ID or Staff ID used to log in. Stored upper-cased, unique. */
      loginId: str,
      passwordHash: str,
      /** Students only. */
      classId: optStr,
      active: bool,
      mustChangePassword: bool,
      failedLoginCount: num,
      lockedUntil: optDate,
      lastLoginAt: optDate,
      /** Bumped to sign the user out everywhere (password change/reset, switched off). */
      sessionVersion: num,
      createdAt: date,
    },
  },
  subjects: {
    sheet: "Subjects",
    /** code: short stable code used in question codes, e.g. "SCI". autoMarkTheory: false for French and Twi. */
    columns: { id: str, name: str, code: str, autoMarkTheory: bool, sortOrder: num },
  },
  teacherSubjects: {
    sheet: "TeacherSubjects",
    /** classId empty = the teacher takes this subject for every class. */
    columns: { id: str, teacherId: str, subjectId: str, classId: optStr },
  },
  topics: {
    sheet: "Topics",
    columns: { id: str, subjectId: str, strand: str, subStrand: optStr, naccaIndicatorCode: optStr },
  },
  papers: {
    sheet: "Papers",
    /** paperNo: 1 = objectives, 2 = theory. */
    columns: {
      id: str,
      subjectId: str,
      year: num,
      paperNo: num,
      durationMinutes: optNum,
      instructions: optStr,
      createdAt: date,
    },
  },
  questions: {
    sheet: "Questions",
    columns: {
      id: str,
      /** Stable external code used by the importer and the grader, e.g. "SCI-2024-P2-3b". Unique. */
      code: str,
      paperId: optStr,
      subjectId: str,
      topicId: optStr,
      /** As printed on the paper, e.g. "3(b)(ii)". */
      numberLabel: str,
      position: num,
      type: oneOf(QUESTION_TYPES),
      text: str,
      imageUrls: list,
      marks: num,
      status: oneOf(QUESTION_STATUSES),
      createdAt: date,
      updatedAt: date,
    },
  },
  mcqOptions: {
    sheet: "McqOptions",
    columns: { id: str, questionId: str, label: str, text: str, isCorrect: bool },
  },
  markingPoints: {
    sheet: "MarkingPoints",
    columns: {
      id: str,
      questionId: str,
      order: num,
      description: str,
      marks: num,
      strictness: oneOf(STRICTNESS),
      acceptedAlternatives: list,
      keyTerms: list,
    },
  },
  modelAnswers: {
    sheet: "ModelAnswers",
    columns: { id: str, questionId: str, text: str },
  },
  attempts: {
    sheet: "Attempts",
    /**
     * One student working through one paper. Answers and marking results are JSON in this row,
     * so autosave is a single row update. See src/lib/prep/practice/attempts.ts for their shapes.
     */
    columns: {
      id: str,
      studentId: str,
      paperId: str,
      /** practice = see the answer after each question; full = answers at the end. */
      mode: oneOf(ATTEMPT_MODES),
      timeLimitMinutes: optNum,
      startedAt: date,
      /** startedAt + time limit. The paper is submitted automatically after this. */
      deadlineAt: optDate,
      submittedAt: optDate,
      autoSubmitted: bool,
      status: oneOf(ATTEMPT_STATUSES),
      answers: json,
      results: json,
      /** Marks awarded so far (excludes answers waiting for a teacher). */
      score: optNum,
      maxScore: optNum,
      /** Marks still waiting for a teacher (French and Twi theory). */
      pendingMarks: optNum,
      updatedAt: date,
    },
  },
} as const satisfies Record<string, { sheet: string; columns: Record<string, Col> & { id: Col } }>;

export type TableName = keyof typeof tables;

type ValueOf<C> = C extends { type: "enum"; values: readonly (infer V)[] }
  ? V
  : C extends { type: "list" }
    ? string[]
    : C extends { type: "json" }
    ? unknown
    : C extends { type: "boolean" }
      ? boolean
      : C extends { type: "number"; nullable: true }
        ? number | null
        : C extends { type: "number" }
          ? number
          : C extends { type: "date"; nullable: true }
            ? Date | null
            : C extends { type: "date" }
              ? Date
              : C extends { type: "string"; nullable: true }
                ? string | null
                : string;

export type RowOf<T extends TableName> = { -readonly [K in keyof (typeof tables)[T]["columns"]]: ValueOf<(typeof tables)[T]["columns"][K]> };

export type Role = (typeof ROLES)[number];
export type User = RowOf<"users">;
export type Subject = RowOf<"subjects">;
export type SchoolClass = RowOf<"classes">;
export type Question = RowOf<"questions">;
export type Attempt = RowOf<"attempts">;
