"use client";

import { Printer } from "lucide-react";
import { prepButton } from "./ui";

/** Prints the page (the portal's menus are hidden when printing), e.g. a progress report for a parents' meeting. */
export function PrintButton({ label = "Print report" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={prepButton({ variant: "secondary" }) + " print:hidden"}>
      <Printer aria-hidden /> {label}
    </button>
  );
}
