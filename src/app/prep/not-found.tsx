import Link from "next/link";
import { prepButton } from "@/components/prep/ui";

export default function PrepNotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 text-center">
      <p className="text-sm font-semibold text-prep-primary">404</p>
      <h1 className="mt-2 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-prep-muted">This page doesn&apos;t exist in BECE Prep.</p>
      <Link href="/prep" className={prepButton({ className: "mx-auto mt-6" })}>
        Go to my home page
      </Link>
    </main>
  );
}
