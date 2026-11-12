import { NextResponse } from "next/server";
import { z } from "zod";
import { exportPaper } from "@/lib/prep/admin/question-bank";
import { getCurrentUser } from "@/lib/prep/auth/current-user";
import { getStore } from "@/lib/prep/store";

/** Downloads a paper in the import format (JSON), so it can be corrected offline and re-imported. */
export async function GET(_req: Request, { params }: { params: Promise<{ paperId: string }> }) {
  const user = await getCurrentUser();
  if (user?.role !== "admin" || user.mustChangePassword) return new NextResponse("Forbidden", { status: 403 });

  const { paperId } = await params;
  if (!z.string().uuid().safeParse(paperId).success) return new NextResponse("Not found", { status: 404 });
  const paper = await exportPaper(getStore(), paperId);
  if (!paper) return new NextResponse("Not found", { status: 404 });

  const filename = `${paper.subjectCode}-${paper.year}-P${paper.paperNo}.json`;
  return new NextResponse(JSON.stringify(paper, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
