import type { Metadata } from "next";
import { ProfilePanel } from "@/components/prep/profile-panel";
import { requireRole } from "@/lib/prep/auth/current-user";

export const metadata: Metadata = { title: "Profile" };

export default async function StudentProfilePage() {
  const user = await requireRole("student");
  return <ProfilePanel user={user} />;
}
