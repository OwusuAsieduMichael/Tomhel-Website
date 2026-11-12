import type { Metadata } from "next";
import { AssignedWork } from "../assigned-work";

export const metadata: Metadata = { title: "Quiz" };
export const dynamic = "force-dynamic";

export default function QuizPage() {
  return <AssignedWork category="quiz" />;
}
