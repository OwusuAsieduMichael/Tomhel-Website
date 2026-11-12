/** Short subject names for tight spaces (cards, headers), keyed by subject code. */
const SHORT: Record<string, string> = {
  ENG: "English",
  MATH: "Mathematics",
  SCI: "Science",
  SOC: "Social Studies",
  RME: "RME",
  COMP: "Computing",
  CTECH: "Career Technology",
  CAD: "Creative Arts",
  FRE: "French",
  TWI: "Twi",
};

export const shortSubjectName = (s: { code: string; name: string }) => SHORT[s.code.toUpperCase()] ?? s.name;

export const paperKind = (paperNo: number) => (paperNo === 1 ? "Objectives" : "Theory");
