import type { Metadata } from "next";
import { ProfilePanel } from "@/components/prep/profile-panel";
import { requireRole } from "@/lib/prep/auth/current-user";

export const metadata: Metadata = { title: "Profile" };

export default async function AdminProfilePage() {
  const user = await requireRole("admin");
  return <ProfilePanel user={user} />;
}
