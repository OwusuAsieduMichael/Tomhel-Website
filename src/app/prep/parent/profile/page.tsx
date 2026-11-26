import type { Metadata } from "next";
import { ProfilePanel } from "@/components/prep/profile-panel";
import { requireRole } from "@/lib/prep/auth/current-user";

export const metadata: Metadata = { title: "Profile" };

export default async function ParentProfilePage() {
  const user = await requireRole("parent");
  return <ProfilePanel user={user} />;
}
