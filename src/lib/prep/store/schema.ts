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
export const ASSIGNMENT_STATUSES = ["draft", "published"] as const;
/** single = one attempt; best = several attempts while open, the best score counts. */
export const ATTEMPT_POLICIES = ["single", "best"] as const;
/** When students see the answer key and solutions for an assignment. */
/** instant = objective work marked as the student answers (right option shown after each question). */
export const SOLUTION_POLICIES = ["after_submit", "after_close", "on_release", "instant"] as const;
export const ASSIGNMENT_SOURCES = ["paper", "topic", "bank"] as const;
export const QUESTION_KINDS = ["objective", "theory"] as const;
export const QUERY_STATUSES = ["open", "answered"] as const;

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
     * One student working through one paper, or through a teacher's set of questions. Answers and marking
     * results are JSON in this row, so autosave is a single row update. See src/lib/prep/practice/attempts.ts.
     */
    columns: {
      id: str,
      studentId: str,
      /** The past paper. Empty for a topic quiz or a teacher's own pick of questions (see questionIds). */
      paperId: optStr,
      /** The questions, in order, when they aren't a whole paper. Empty = every approved question of paperId. */
      questionIds: list,
      /** Set when the attempt is work a teacher assigned; empty for self-practice. */
      assignmentId: optStr,
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
  assignments: {
    sheet: "Assignments",
    /**
     * Work a teacher sets for classes, open between two dates: a whole past paper, or questions chosen
     * by topic or picked from the question bank. Attempts link back through attempts.assignmentId.
     * See src/lib/prep/assignments.ts.
     */
    columns: {
      id: str,
      createdBy: str,
      subjectId: str,
      /** paper = a whole past paper; topic = questions on chosen topics; bank = questions the teacher picked. */
      source: oneOf(ASSIGNMENT_SOURCES),
      /** For topic and bank: objective (multiple choice) or theory (written) questions. */
      kind: oneOf(QUESTION_KINDS),
      /** source = paper only. */
      paperId: optStr,
      /** source = topic only: the topics chosen. */
      topicIds: list,
      /** source = topic or bank: the questions, fixed when the assignment is saved, in order. */
      questionIds: list,
      title: str,
      classIds: list,
      /** Per-student time limit. Attempts also end at closesAt, whichever comes first. */
      timeLimitMinutes: optNum,
      opensAt: date,
      closesAt: date,
      attemptPolicy: oneOf(ATTEMPT_POLICIES),
      solutions: oneOf(SOLUTION_POLICIES),
      /** For solutions = on_release: when the teacher released them. */
      solutionsReleasedAt: optDate,
      /** Last time the teacher sent a reminder to students who hadn't finished. */
      remindedAt: optDate,
      status: oneOf(ASSIGNMENT_STATUSES),
      createdAt: date,
      updatedAt: date,
    },
  },
  notices: {
    sheet: "Notices",
    /** In-app messages to one user: new work set, a mark returned, a reminder, a query answered. */
    columns: { id: str, userId: str, title: str, body: optStr, href: optStr, createdAt: date, readAt: optDate },
  },
  markQueries: {
    sheet: "MarkQueries",
    /** A student asking their teacher to check the mark for one question. */
    columns: {
      id: str,
      attemptId: str,
      questionId: str,
      studentId: str,
      message: str,
      status: oneOf(QUERY_STATUSES),
      reply: optStr,
      answeredBy: optStr,
      answeredAt: optDate,
      createdAt: date,
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
export type Assignment = RowOf<"assignments">;
export type Notice = RowOf<"notices">;
export type MarkQuery = RowOf<"markQueries">;
