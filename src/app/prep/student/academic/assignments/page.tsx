import type { Metadata } from "next";
import { AssignedWork } from "../assigned-work";

export const metadata: Metadata = { title: "Assignments" };
export const dynamic = "force-dynamic";

export default function AssignmentsPage() {
  return <AssignedWork category="assignment" />;
}
