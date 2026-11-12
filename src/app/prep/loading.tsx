import Image from "next/image";
import { schoolImages } from "@/lib/constants";

/**
 * Shown straight away while an Academic Prep page loads (each page reads the Google Sheet, which can take a
 * second or two), so tapping "Academic Prep" or a menu item responds at once instead of seeming stuck.
 */
export default function PrepLoading() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="relative size-16">
        <span className="absolute inset-0 animate-prep-spin rounded-full border-[3px] border-prep-primary-soft border-t-prep-primary" aria-hidden />
        <Image src={schoolImages.logo} alt="" width={44} height={44} className="absolute inset-[10px] size-11 rounded-full object-cover" priority />
      </div>
      <p className="text-base font-bold text-prep-ink">Academic Prep</p>
      <p className="text-sm text-prep-muted">Loading…</p>
    </div>
  );
}
