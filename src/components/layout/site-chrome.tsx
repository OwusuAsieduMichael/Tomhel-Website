import { ScrollControls } from "@/components/layout/scroll-controls";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/layout/skip-link";
import { LisaWidget } from "@/components/lisa/lisa-widget";

/** Header, footer, scroll controls and LISA for the public site. Not used by /prep. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main-content">{children}</main>
      <ScrollControls />
      <SiteFooter />
      {/* LISA shows only when the Anthropic API key is set. */}
      {process.env.ANTHROPIC_API_KEY ? <LisaWidget /> : null}
    </>
  );
}
