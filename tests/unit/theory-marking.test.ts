import { describe, expect, it } from "vitest";
import { markTheory, type MarkingPoint } from "@/lib/prep/grading/theory";

const point = (p: Partial<MarkingPoint> & { description: string }): MarkingPoint => ({
  marks: 1,
  strictness: "meaning",
  acceptedAlternatives: [],
  keyTerms: [],
  ...p,
});

// The photosynthesis example from the design (screen 06).
const photosynthesis: MarkingPoint[] = [
  point({ description: "Light energy from the sun is used", acceptedAlternatives: ["sunlight", "energy from the sun", "light energy"] }),
  point({ description: "Chlorophyll traps the light", strictness: "exact", keyTerms: ["chlorophyll"] }),
  point({ description: "Carbon dioxide and water are the raw materials", strictness: "key_term", keyTerms: ["carbon dioxide", "water"], acceptedAlternatives: ["CO2 and H2O"] }),
  point({ description: "Oxygen is given off", strictness: "key_term", keyTerms: ["oxygen"] }),
];

describe("markTheory", () => {
  it("marks the design's example: sunlight and oxygen awarded, chlorophyl misspelt, raw materials missing", () => {
    const answer =
      "Green plants make food using sunlight in their leaves. The green colour called chlorophyl traps the light. The food is stored as protein and the plant releases oxygen.";
    const r = markTheory(answer, photosynthesis);
    expect(r.points.map((p) => p.status)).toEqual(["awarded", "misspelt", "missing", "awarded"]);
    expect(r.awarded).toBe(2);
    expect(r.marks).toBe(4);
    expect(r.points[1].note).toBe('"chlorophyl" is misspelt. It must be spelt chlorophyll.');
    expect(r.points[0].found).toBe("sunlight");

    const marked = (kind: string) => r.highlights.filter((h) => h.kind === kind).map((h) => answer.slice(h.start, h.end));
    expect(marked("misspelt")).toEqual(["chlorophyl"]);
    expect(marked("awarded")).toEqual(["sunlight", "oxygen"]);
  });

  it("gives full marks to a correct answer in the student's own order and words", () => {
    const r = markTheory(
      "Chlorophyll in the leaf traps light energy. The plant takes in carbon dioxide and water, and oxygen is released.",
      photosynthesis,
    );
    expect(r.points.map((p) => p.status)).toEqual(["awarded", "awarded", "awarded", "awarded"]);
    expect(r.awarded).toBe(4);
  });

  it("accepts an accepted answer in place of the key terms", () => {
    const r = markTheory("It uses CO2 and H2O.", [photosynthesis[2]]);
    expect(r.points[0].status).toBe("awarded");
  });

  it("forgives spelling outside key terms when strictness is meaning", () => {
    const r = markTheory("It anchers the plant firmly in the soil.", [
      point({ description: "Anchors / holds the plant firmly in the soil", acceptedAlternatives: ["anchors the plant", "holds the plant"] }),
    ]);
    expect(r.points[0].status).toBe("awarded");
  });

  it("needs a different item for each mark in an 'any two' question", () => {
    const anyOf = ["oiling", "greasing", "painting", "galvanising", "alloying", "electroplating"];
    const two = [
      point({ description: "Any one way of preventing rusting", acceptedAlternatives: anyOf }),
      point({ description: "Any one way of preventing rusting", acceptedAlternatives: anyOf }),
    ];
    expect(markTheory("Painting.", two).awarded).toBe(1);
    expect(markTheory("Painting. Painting the iron.", two).awarded).toBe(1);
    expect(markTheory("Painting and galvanising.", two).awarded).toBe(2);
  });

  it("needs numbers to match exactly", () => {
    const p = [point({ description: "Area = 50 cm²", strictness: "exact", acceptedAlternatives: ["50 cm²", "50 cm2", "50 square centimetres"] })];
    expect(markTheory("Area = 10 × 5 = 50 cm²", p).awarded).toBe(1);
    expect(markTheory("Area = 15 cm²", p).awarded).toBe(0);
  });

  it("sends rubric points to a teacher and reports nothing found for an empty answer", () => {
    const r = markTheory("", [point({ description: "Letter layout", strictness: "rubric" }), point({ description: "Oxygen", keyTerms: ["oxygen"] })]);
    expect(r.needsReview).toBe(true);
    expect(r.points.map((p) => p.status)).toEqual(["review", "missing"]);
  });
});
