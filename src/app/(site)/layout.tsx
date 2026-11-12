import { SiteChrome } from "@/components/layout/site-chrome";

/** Layout for the public marketing site. The BECE Prep app (/prep) has its own layout. */
export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <SiteChrome>{children}</SiteChrome>;
}
