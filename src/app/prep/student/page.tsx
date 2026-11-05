import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ClipboardList, Timer } from "lucide-react";
import { PageHeading, PrepCard } from "@/components/prep/ui";
import { requireRole } from "@/lib/prep/auth/current-user";
import { getStore } from "@/lib/prep/store";
import { getStudentClass } from "@/lib/prep/queries";

export const metadata: Metadata = { title: "Home" };

const shortcuts = [
  { href: "/prep/student/academic/bece", title: "BECE past papers", body: "Practise Paper 1 and Paper 2 by subject and year.", Icon: BookOpen },
  { href: "/prep/student/academic/quiz", title: "Topic quizzes", body: "Short quizzes on one topic at a time.", Icon: Timer },
  { href: "/prep/student/academic/exams", title: "Exams from teachers", body: "Work your teachers have set for you.", Icon: ClipboardList },
];

export default async function StudentHome() {
  const user = await requireRole("student");
  const schoolClass = await getStudentClass(getStore(), user.classId);
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <PageHeading title={`Hello, ${firstName}`} description={schoolClass ? `${schoolClass.name} · ${schoolClass.academicYear}` : undefined} />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shortcuts.map(({ href, title, body, Icon }) => (
          <li key={href}>
            <Link href={href} className="block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-prep-primary">
              <PrepCard className="h-full transition-colors hover:border-prep-primary">
                <Icon className="size-6 text-prep-primary" aria-hidden />
                <h2 className="mt-3 font-bold">{title}</h2>
                <p className="mt-1 text-sm text-prep-muted">{body}</p>
              </PrepCard>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
