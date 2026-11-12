"use client";

import { ChevronDown, KeyRound } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChangePasswordForm } from "./change-password-form";

/** "Change password" opens the form on tap. Open from the start when the school asked for a new password. */
export function ChangePasswordToggle({ mustChange }: { mustChange: boolean }) {
  const [open, setOpen] = useState(mustChange);
  return (
    <div className="rounded-2xl border border-prep-line bg-prep-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="change-password"
        className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-prep-primary"
      >
        <KeyRound className="size-5 text-prep-primary" aria-hidden />
        <span className="flex-1 text-base font-bold">Change password</span>
        <ChevronDown className={cn("size-5 text-prep-muted transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <div id="change-password" className="border-t border-prep-line px-5 pt-4 pb-5">
          {mustChange ? <p className="mb-4 text-sm text-prep-misspelt">The school has asked you to choose a new password.</p> : null}
          <ChangePasswordForm />
        </div>
      ) : null}
    </div>
  );
}
