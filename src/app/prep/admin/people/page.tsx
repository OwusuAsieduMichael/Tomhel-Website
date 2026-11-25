import type { Metadata } from "next";
import { DataTable } from "@/components/prep/data-table";
import { PageHeading, PrepCard } from "@/components/prep/ui";
import { requireRole } from "@/lib/prep/auth/current-user";
import { getStore } from "@/lib/prep/store";
import { roleLabel } from "@/lib/prep/nav";
import { listClassesWithCounts, listPeople } from "@/lib/prep/queries";
import { AccountRowActions, AddPeoplePanel } from "./people-forms";

export const metadata: Metadata = { title: "People" };

const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Accra" });

export default async function PeoplePage() {
  const admin = await requireRole("admin");
  const store = getStore();
  const [people, classRows] = await Promise.all([listPeople(store), listClassesWithCounts(store)]);
  const classes = classRows.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-8">
      <PageHeading title="People" description={`${people.length} accounts`} />

      <PrepCard className="max-w-2xl">
        <h2 className="mb-4 text-lg font-bold">Add people</h2>
        <AddPeoplePanel classes={classes} />
      </PrepCard>

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
            p.active ? (p.mustChangePassword ? "Temporary password" : "Active") : "Switched off",
            p.lastLoginAt ? dateFmt.format(p.lastLoginAt) : "Never",
            <AccountRowActions key="a" userId={p.id} name={p.name} active={p.active} isSelf={p.id === admin.id} />,
          ])}
        />
      </section>
    </div>
  );
}
