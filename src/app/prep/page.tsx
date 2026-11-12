import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/prep/auth/current-user";
import { roleHome } from "@/lib/prep/auth/permissions";

export const dynamic = "force-dynamic";

export default async function PrepIndex() {
  const user = await getCurrentUser();
  redirect(user ? roleHome[user.role] : "/prep/login");
}
