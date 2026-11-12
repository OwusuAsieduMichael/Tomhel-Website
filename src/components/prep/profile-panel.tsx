import { getStore } from "@/lib/prep/store";
import type { SessionUser } from "@/lib/prep/auth/session";
import { roleLabel } from "@/lib/prep/nav";
import { getStudentClass, getTeacherSubjectsWithClasses } from "@/lib/prep/queries";
import { ChangePasswordToggle } from "./change-password-toggle";
import { PageHeading, PrepCard } from "./ui";

export async function ProfilePanel({ user }: { user: SessionUser }) {
  const store = getStore();
  const schoolClass = user.role === "student" ? await getStudentClass(store, user.classId) : null;

  // A teacher's subjects, each with the classes they take it for.
  const teaching = new Map<string, string[]>();
  if (user.role === "teacher") {
    for (const r of await getTeacherSubjectsWithClasses(store, user.id)) {
      teaching.set(r.subjectName, [...(teaching.get(r.subjectName) ?? []), r.className ?? "All classes"]);
    }
  }

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
          {user.role === "student" ? (
            <>
              <dt className="text-prep-muted">Class</dt>
              <dd className="font-semibold">{schoolClass ? `${schoolClass.name} · ${schoolClass.academicYear}` : "Not in a class yet"}</dd>
            </>
          ) : null}
          {user.role === "teacher" ? (
            <>
              <dt className="text-prep-muted">Teaching</dt>
              <dd>
                {teaching.size ? (
                  <ul className="space-y-1">
                    {[...teaching.entries()].map(([subject, classes]) => (
                      <li key={subject}>
                        <span className="font-semibold">{subject}</span>
                        <span className="text-prep-muted"> · {classes.join(", ")}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-prep-muted">No subjects yet. The admin assigns them on Classes &amp; subjects.</span>
                )}
              </dd>
            </>
          ) : null}
        </dl>
      </PrepCard>

      <ChangePasswordToggle mustChange={user.mustChangePassword} />
    </div>
  );
}
