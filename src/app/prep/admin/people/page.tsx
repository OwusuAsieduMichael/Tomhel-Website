import type { Metadata } from "next";
import { DataTable } from "@/components/prep/data-table";
import { PageHeading, PrepCard } from "@/components/prep/ui";
import { requireRole } from "@/lib/prep/auth/current-user";
import { getStore } from "@/lib/prep/store";
import { roleLabel } from "@/lib/prep/nav";
import { listParents, studentsWithoutParents } from "@/lib/prep/parents";
import { listClassesWithCounts, listPeople } from "@/lib/prep/queries";
import { AccountRowActions, AddChildForm, AddPeoplePanel, MissingParentsCard } from "./people-forms";

export const metadata: Metadata = { title: "People" };

const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Accra" });

const status = (p: { active: boolean; mustChangePassword: boolean }) =>
  p.active ? (p.mustChangePassword ? "Temporary password" : "Active") : "Switched off";

export default async function PeoplePage() {
  const admin = await requireRole("admin");
  const store = getStore();
  const [people, classRows, parents, withoutParents] = await Promise.all([
    listPeople(store),
    listClassesWithCounts(store),
    listParents(store),
    studentsWithoutParents(store),
  ]);
  const classes = classRows.map((c) => ({ id: c.id, name: c.name }));
  const className = new Map(classRows.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-8">
      <PageHeading title="People" description={`${people.length} school accounts, ${parents.length} parent accounts`} />

      <PrepCard className="max-w-2xl">
        <h2 className="mb-4 text-lg font-bold">Add people</h2>
        <AddPeoplePanel classes={classes} />
      </PrepCard>

      {withoutParents.length ? (
        <PrepCard className="max-w-2xl">
          <h2 className="mb-3 text-lg font-bold">Parent accounts</h2>
          <MissingParentsCard count={withoutParents.length} />
        </PrepCard>
      ) : null}

      <section aria-labelledby="accounts-heading" className="space-y-3">
        <h2 id="accounts-heading" className="text-lg font-bold">
          All accounts
        </h2>
        <DataTable
          caption="All accounts"
          headers={["Name", "ID", "Role", "Class", "Status", "Last login", "Actions"]}
          rows={people.map((p) => [
            <span key="n" className="font-semibold">
              {p.name}
            </span>,
            p.loginId,
            roleLabel[p.role],
            p.className ?? "—",
            status(p),
            p.lastLoginAt ? dateFmt.format(p.lastLoginAt) : "Never",
            <AccountRowActions key="a" userId={p.id} name={p.name} active={p.active} isSelf={p.id === admin.id} />,
          ])}
        />
      </section>

      <section aria-labelledby="parents-heading" className="space-y-3">
        <div>
          <h2 id="parents-heading" className="text-lg font-bold">
            Parents
          </h2>
          <p className="text-sm text-prep-muted">
            Parents log in with their Parent ID and see their children&apos;s work, nothing else. To put siblings on one account, add the
            sibling&apos;s Student ID to it.
          </p>
        </div>
        {parents.length ? (
          <DataTable
            caption="Parent accounts"
            headers={["Parent ID", "Children", "Status", "Last login", "Actions"]}
            rows={parents.map((p) => [
              <span key="id" className="font-semibold">
                {p.loginId}
              </span>,
              <ul key="c" className="space-y-0.5">
                {p.children.map((c) => (
                  <li key={c.id}>
                    {c.name}{" "}
                    <span className="text-prep-muted">
                      ({c.loginId}
                      {c.classId ? `, ${className.get(c.classId) ?? "no class"}` : ""})
                    </span>
                  </li>
                ))}
                {p.children.length ? null : <li className="text-prep-muted">No children linked</li>}
              </ul>,
              status(p),
              p.lastLoginAt ? dateFmt.format(p.lastLoginAt) : "Never",
              <div key="a" className="space-y-2">
                <AccountRowActions userId={p.id} name={p.loginId} active={p.active} isSelf={false} />
                <AddChildForm parentId={p.id} parentLoginId={p.loginId} />
              </div>,
            ])}
          />
        ) : (
          <PrepCard className="text-prep-muted">No parent accounts yet. They are made with each new student.</PrepCard>
        )}
      </section>
    </div>
  );
}
