/**
 * Development seed data. Names and questions are made up for testing.
 * The sample papers are NOT official WAEC/BECE papers; the school's real papers come in via the importer.
 */

export const ACADEMIC_YEAR = "2026/2027";

export const seedSubjects = [
  { code: "ENG", name: "English Language", autoMarkTheory: true },
  { code: "MATH", name: "Mathematics", autoMarkTheory: true },
  { code: "SCI", name: "Integrated Science", autoMarkTheory: true },
  { code: "SOC", name: "Social Studies", autoMarkTheory: true },
  { code: "RME", name: "Religious and Moral Education", autoMarkTheory: true },
  { code: "COMP", name: "Computing", autoMarkTheory: true },
  { code: "CTECH", name: "Career Technology", autoMarkTheory: true },
  { code: "FRE", name: "French", autoMarkTheory: false },
  { code: "CAD", name: "Creative Arts and Design", autoMarkTheory: true },
  { code: "TWI", name: "Twi", autoMarkTheory: false },
] as const;

export const seedClasses = [
  { name: "JHS 3A", yearGroup: 3 },
  { name: "JHS 3B", yearGroup: 3 },
] as const;

type SeedUser = {
  loginId: string;
  name: string;
  role: "student" | "teacher" | "admin";
  className?: string;
};

export const seedAdmin: SeedUser = { loginId: "A0001", name: "School Administrator", role: "admin" };

export const seedTeachers: (SeedUser & { subjects: { code: string; className?: string }[] })[] = [
  {
    loginId: "T001",
    name: "Ama Mensah",
    role: "teacher",
    subjects: [{ code: "ENG" }, { code: "FRE" }],
  },
  {
    loginId: "T002",
    name: "Kwame Boateng",
    role: "teacher",
    subjects: [{ code: "MATH" }, { code: "SCI", className: "JHS 3B" }],
  },
  {
    loginId: "T003",
    name: "Yaw Owusu",
    role: "teacher",
    subjects: [{ code: "SCI", className: "JHS 3A" }, { code: "SOC" }, { code: "TWI" }],
  },
];

export const seedStudents: SeedUser[] = [
  ["S0001", "Akosua Asante", "JHS 3A"],
  ["S0002", "Kofi Adjei", "JHS 3A"],
  ["S0003", "Abena Owusu", "JHS 3A"],
  ["S0004", "Kwabena Darko", "JHS 3A"],
  ["S0005", "Efua Appiah", "JHS 3A"],
  ["S0006", "Yaw Frimpong", "JHS 3B"],
  ["S0007", "Adwoa Sarpong", "JHS 3B"],
  ["S0008", "Kwesi Ofori", "JHS 3B"],
  ["S0009", "Esi Amoako", "JHS 3B"],
  ["S0010", "Kojo Manu", "JHS 3B"],
].map(([loginId, name, className]) => ({ loginId, name, className, role: "student" as const }));

export type SeedQuestion = {
  code: string;
  numberLabel: string;
  type: "mcq" | "theory";
  text: string;
  marks: number;
  options?: { label: string; text: string; isCorrect?: boolean }[];
  markingPoints?: {
    description: string;
    marks: number;
    strictness: "exact" | "key_term" | "meaning" | "rubric";
    acceptedAlternatives?: string[];
    keyTerms?: string[];
  }[];
  modelAnswer?: string;
};

export type SeedPaper = {
  subjectCode: string;
  year: number;
  paperNo: 1 | 2;
  durationMinutes: number;
  instructions: string;
  questions: SeedQuestion[];
};

const SAMPLE_NOTE = "Sample paper for testing the system. Not an official WAEC paper.";

export const seedPapers: SeedPaper[] = [
  {
    subjectCode: "MATH",
    year: 2023,
    paperNo: 1,
    durationMinutes: 60,
    instructions: `${SAMPLE_NOTE} Answer all questions. Each question is followed by four options lettered A to D. Choose the correct option.`,
    questions: [
      {
        code: "MATH-2023-P1-1",
        numberLabel: "1",
        type: "mcq",
        text: "Simplify 3/4 + 2/3.",
        marks: 1,
        options: [
          { label: "A", text: "5/7" },
          { label: "B", text: "17/12", isCorrect: true },
          { label: "C", text: "5/12" },
          { label: "D", text: "1" },
        ],
      },
      {
        code: "MATH-2023-P1-2",
        numberLabel: "2",
        type: "mcq",
        text: "If 2x − 5 = 11, find the value of x.",
        marks: 1,
        options: [
          { label: "A", text: "3" },
          { label: "B", text: "6" },
          { label: "C", text: "8", isCorrect: true },
          { label: "D", text: "16" },
        ],
      },
      {
        code: "MATH-2023-P1-3",
        numberLabel: "3",
        type: "mcq",
        text: "Express 0.00045 in standard form.",
        marks: 1,
        options: [
          { label: "A", text: "4.5 × 10⁻⁴", isCorrect: true },
          { label: "B", text: "4.5 × 10⁻³" },
          { label: "C", text: "45 × 10⁻⁵" },
          { label: "D", text: "0.45 × 10⁻³" },
        ],
      },
      {
        code: "MATH-2023-P1-4",
        numberLabel: "4",
        type: "mcq",
        text: "Find the perimeter of a rectangle 8 cm long and 5 cm wide.",
        marks: 1,
        options: [
          { label: "A", text: "13 cm" },
          { label: "B", text: "26 cm", isCorrect: true },
          { label: "C", text: "40 cm" },
          { label: "D", text: "80 cm" },
        ],
      },
      {
        code: "MATH-2023-P1-5",
        numberLabel: "5",
        type: "mcq",
        text: "Find the mean of 4, 7, 9 and 12.",
        marks: 1,
        options: [
          { label: "A", text: "7" },
          { label: "B", text: "8", isCorrect: true },
          { label: "C", text: "9" },
          { label: "D", text: "32" },
        ],
      },
    ],
  },
  {
    subjectCode: "SCI",
    year: 2023,
    paperNo: 2,
    durationMinutes: 90,
    instructions: `${SAMPLE_NOTE} Answer all questions in this section.`,
    questions: [
      {
        code: "SCI-2023-P2-1a",
        numberLabel: "1(a)",
        type: "theory",
        text: "State two functions of the root of a plant.",
        marks: 2,
        markingPoints: [
          {
            description: "Absorbs water and mineral salts from the soil",
            marks: 1,
            strictness: "meaning",
            acceptedAlternatives: ["takes in water and minerals"],
          },
          {
            description: "Anchors / holds the plant firmly in the soil",
            marks: 1,
            strictness: "meaning",
            acceptedAlternatives: ["holds the plant in the ground", "supports the plant"],
          },
        ],
        modelAnswer: "The root absorbs water and mineral salts from the soil, and it anchors the plant firmly in the soil.",
      },
      {
        code: "SCI-2023-P2-1b",
        numberLabel: "1(b)",
        type: "theory",
        text: "Describe briefly how green plants make their own food.",
        marks: 4,
        markingPoints: [
          { description: "Green plants make food using energy from sunlight", marks: 1, strictness: "meaning" },
          {
            description: "Light is trapped by chlorophyll",
            marks: 1,
            strictness: "exact",
            keyTerms: ["chlorophyll"],
          },
          {
            description: "Carbon dioxide and water are used as raw materials",
            marks: 1,
            strictness: "key_term",
            keyTerms: ["carbon dioxide", "water"],
            acceptedAlternatives: ["CO2 and H2O"],
          },
          {
            description: "Oxygen is released as a by-product",
            marks: 1,
            strictness: "key_term",
            keyTerms: ["oxygen"],
          },
        ],
        modelAnswer:
          "Green plants make food by photosynthesis. Chlorophyll in the leaves traps energy from sunlight, which is used to combine carbon dioxide and water to form glucose (food). Oxygen is released as a by-product.",
      },
    ],
  },
];
