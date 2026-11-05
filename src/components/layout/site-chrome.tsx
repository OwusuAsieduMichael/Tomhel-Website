import { ScrollControls } from "@/components/layout/scroll-controls";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/layout/skip-link";

/** Header, footer and scroll controls for the public site. Not used by /prep. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main-content">{children}</main>
      <ScrollControls />
      <SiteFooter />
    </>
  );
}
