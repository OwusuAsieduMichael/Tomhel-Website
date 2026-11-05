import { getStore } from "@/lib/prep/store";
import type { SessionUser } from "@/lib/prep/auth/session";
import { roleLabel } from "@/lib/prep/nav";
import { getStudentClass } from "@/lib/prep/queries";
import { ChangePasswordForm } from "./change-password-form";
import { PageHeading, PrepCard } from "./ui";

export async function ProfilePanel({ user }: { user: SessionUser }) {
  const schoolClass = user.role === "student" ? await getStudentClass(getStore(), user.classId) : null;

  return (
    <div className="max-w-xl space-y-6">
      <PageHeading title="Profile" />
      <PrepCard>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
          <dt className="text-prep-muted">Name</dt>
          <dd className="font-semibold">{user.name}</dd>
          <dt className="text-prep-muted">{user.role === "student" ? "Student ID" : "Staff ID"}</dt>
          <dd className="font-semibold">{user.loginId}</dd>
          <dt className="text-prep-muted">Role</dt>
          <dd className="font-semibold">{roleLabel[user.role]}</dd>
          {schoolClass ? (
            <>
              <dt className="text-prep-muted">Class</dt>
              <dd className="font-semibold">{schoolClass.name}</dd>
            </>
          ) : null}
        </dl>
      </PrepCard>

      <PrepCard>
        <h2 className="text-lg font-bold">Change password</h2>
        {user.mustChangePassword ? (
          <p className="mt-1 text-sm text-prep-misspelt">The school has asked you to choose a new password.</p>
        ) : null}
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </PrepCard>
    </div>
  );
}
