import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading, PrepCard } from "@/components/prep/ui";
import { requireRole } from "@/lib/prep/auth/current-user";
import { childOverview } from "@/lib/prep/parent-view";
import { childrenOf } from "@/lib/prep/parents";
import { getStudentClass } from "@/lib/prep/queries";
import { getStore } from "@/lib/prep/store";

export const metadata: Metadata = { title: "My children" };

export default async function ParentHomePage() {
  const user = await requireRole("parent");
  const store = getStore();
  const children = await childrenOf(store, user.id);
  const cards = await Promise.all(
    children.map(async (c) => {
      const [schoolClass, overview] = await Promise.all([getStudentClass(store, c.classId), childOverview(store, c)]);
      const todo = overview.work.filter((w) => w.state === "open" && w.status !== "submitted").length;
      return { child: c, className: schoolClass?.name ?? null, todo, ...overview.summary };
    }),
  );

  return (
    <>
      <PageHeading title="My children" description="Their BECE practice, quizzes and assignments. You can look, but not change anything." />
      {cards.length ? (
        <ul className="space-y-3">
          {cards.map(({ child, className, finished, average, todo }) => (
            <li key={child.id}>
              <Link
                href={`/prep/parent/${child.id}`}
                className="flex items-center gap-4 rounded-2xl border border-prep-line bg-prep-surface p-4 hover:border-prep-primary"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold">{child.name}</p>
                  <p className="text-sm text-prep-muted">
                    {child.loginId}
                    {className ? ` · ${className}` : ""}
                  </p>
                  <p className="mt-2 text-sm">
                    {finished} {finished === 1 ? "paper" : "papers"} finished
                    {average !== null ? ` · average ${average}%` : ""}
                    {todo ? ` · ${todo} set ${todo === 1 ? "piece" : "pieces"} of work still to do` : ""}
                  </p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-prep-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <PrepCard className="text-prep-muted">No children are linked to your account yet. Please contact the school office.</PrepCard>
      )}
    </>
  );
}
