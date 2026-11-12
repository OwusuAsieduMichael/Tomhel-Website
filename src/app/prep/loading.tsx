import { LogoSpinner } from "@/components/prep/logo-spinner";

/**
 * Shown straight away while an Academic Prep page loads (each page reads the Google Sheet, which can take a
 * second or two), so tapping a menu item responds at once instead of seeming stuck.
 */
export default function PrepLoading() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <LogoSpinner />
      <p className="text-base font-bold text-prep-ink">Academic Prep</p>
      <p className="text-sm text-prep-muted">Loading…</p>
    </div>
  );
}
