import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/prep/auth/current-user";
import { roleHome } from "@/lib/prep/auth/permissions";
import { schoolImages } from "@/lib/constants";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(roleHome[user.role]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-14 pb-8">
      <div className="flex items-center gap-3">
        <Image src={schoolImages.logo} alt="" width={44} height={44} className="size-11 rounded-xl object-cover" priority />
        <div className="flex flex-col">
          <span className="text-lg font-bold">Tomhel</span>
          <span className="text-[13px] text-prep-muted">Academic Prep</span>
        </div>
      </div>

      <div className="mt-16 flex flex-col gap-2">
        <h1 className="text-[30px] leading-tight font-bold">Welcome back</h1>
        <p className="text-[15px] leading-normal text-prep-muted">Log in with the details your school gave you. Teachers use this page too.</p>
      </div>

      <div className="mt-8">
        <LoginForm />
      </div>

      <p className="mt-5 text-sm leading-normal text-prep-muted">Forgot your password? Ask your class teacher or the school office to reset it.</p>

      <div className="flex-1" />

      <Link href="/" className="mt-10 flex min-h-11 items-center gap-2 text-sm font-semibold text-prep-primary hover:text-[#0e4029]">
        <ChevronLeft className="size-[18px]" aria-hidden />
        Back to the Tomhel website
      </Link>
    </main>
  );
}
