import { describe, expect, it } from "vitest";
import { sheetProblemMessage } from "@/lib/prep/errors";

describe("plain messages for sheet problems", () => {
  it("explains a sheet that needs setup", () => {
    expect(sheetProblemMessage(new Error("Table Assignments has no column category. Run the setup step."))).toMatch(/prep:setup/);
    expect(sheetProblemMessage(new Error('Sheet "Notices" not found. Run npm run prep:setup.'))).toMatch(/prep:setup/);
  });

  it("asks to retry when Google is briefly unavailable", () => {
    expect(sheetProblemMessage(new Error("Service Spreadsheets failed while accessing document with id x."))).toMatch(/try again/);
    expect(sheetProblemMessage(new Error("The BECE Prep data service returned an unreadable response (HTTP 502)."))).toMatch(/try again/);
  });

  it("leaves real bugs alone", () => {
    expect(sheetProblemMessage(new TypeError("Cannot read properties of undefined"))).toBeNull();
  });
});
