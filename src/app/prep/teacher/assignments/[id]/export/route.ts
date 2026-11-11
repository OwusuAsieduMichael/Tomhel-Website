import { NextResponse } from "next/server";
import { z } from "zod";
import { AssignmentError, getAssignmentTracker } from "@/lib/prep/assignments";
import { getCurrentUser } from "@/lib/prep/auth/current-user";
import { formatDayTime } from "@/lib/prep/format";
import { getStore } from "@/lib/prep/store";

/** Quotes a CSV cell, and stops spreadsheet apps reading it as a formula. */
function cell(v: string | number | null) {
  let s = v === null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const statusLabel = { submitted: "Submitted", in_progress: "In progress", not_started: "Not started" } as const;

/** Downloads the submission tracker as CSV (opens in Excel or Google Sheets). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "teacher" && user.role !== "admin") || user.mustChangePassword) return new NextResponse("Forbidden", { status: 403 });

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new NextResponse("Not found", { status: 404 });
  let t;
  try {
    t = await getAssignmentTracker(getStore(), user, id);
  } catch (e) {
    if (e instanceof AssignmentError) return new NextResponse("Not found", { status: 404 });
    throw e;
  }

  const lines = [
    ["Student ID", "Name", "Class", "Status", "Auto-submitted", "Attempts", "Started", "Submitted", "Minutes", "Score", "Out of", "Marks waiting for teacher"],
    ...t.rows.map((r) => [
      r.loginId,
      r.name,
      r.className,
      statusLabel[r.status],
      r.autoSubmitted ? "Yes" : "",
      r.attemptCount,
      r.startedAt ? formatDayTime(r.startedAt) : "",
      r.submittedAt ? formatDayTime(r.submittedAt) : "",
      r.minutes,
      r.score,
      r.maxScore,
      r.pendingMarks || "",
    ]),
  ];
  const csv = "﻿" + lines.map((l) => l.map(cell).join(",")).join("\r\n");
  const filename = `${t.assignment.title.replace(/[^\w -]+/g, "").trim().replace(/\s+/g, "-") || "assignment"}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
