import { describe, expect, it } from "vitest";
import { roleHome } from "@/lib/prep/auth/permissions";
import { academicTabs, isActive, navByRole } from "@/lib/prep/nav";

describe("role navigation", () => {
  it("starts each role's nav at that role's home, inside its own area", () => {
    for (const role of ["student", "teacher", "admin"] as const) {
      expect(navByRole[role][0].href).toBe(roleHome[role]);
      for (const item of navByRole[role]) expect(item.href.startsWith(roleHome[role])).toBe(true);
    }
  });

  it("gives students Academic Preparation with BECE, Quiz and Exams tabs", () => {
    expect(navByRole.student.map((i) => i.label)).toContain("Academic Prep");
    expect(academicTabs.map((t) => t.label)).toEqual(["BECE", "Quiz", "Exams"]);
  });

  it("does not show teacher or admin tools to students", () => {
    const studentHrefs = navByRole.student.map((i) => i.href).join(" ");
    expect(studentHrefs).not.toMatch(/teacher|admin|review|assignments/);
  });

  it("matches the home item exactly and others by prefix", () => {
    const [home, academic] = navByRole.student;
    expect(isActive(home, "/prep/student", true)).toBe(true);
    expect(isActive(home, "/prep/student/progress", true)).toBe(false);
    expect(isActive(academic, "/prep/student/academic/bece", false)).toBe(true);
    expect(isActive(academic, "/prep/student/academicx", false)).toBe(false);
  });
});
