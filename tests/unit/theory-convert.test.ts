import { describe, expect, it } from "vitest";
import { alternativesFor } from "../../scripts/pasco/extract-theory";
import { markTheory } from "@/lib/prep/grading/theory";

describe("theory converter: accepted answers from a scheme line", () => {
  it("drops e.g. tails, leading filler and splits at slashes", () => {
    expect(alternativesFor("Improvement of health facilities such as hospitals, clinics, etc")).toContain("health facilities");
    expect(alternativesFor("There should be freedom of speech;")).toContain("freedom of speech");
    expect(alternativesFor("Can bring disgrace / Loss of respect;")).toEqual(expect.arrayContaining(["bring disgrace", "Loss of respect"]));
    expect(alternativesFor("Mediation – A third party assists to resolve problems;")).toEqual(["Mediation"]);
    expect(alternativesFor("Linear scale, e.g.,")).toEqual(["Linear scale"]);
  });

  it("gives forms a student's own wording matches", () => {
    const group = alternativesFor("Encouraging inter-ethnic marriages;").join(" | ");
    const point = { description: "A way of sustaining unity", marks: 1, strictness: "meaning" as const, acceptedAlternatives: [group], keyTerms: [] };
    expect(markTheory("We should allow inter-ethnic marriages.", [point]).awarded).toBe(1);
  });
});
