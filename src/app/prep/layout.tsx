import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "BECE Prep", template: "%s | BECE Prep" },
  description: "Tomhel BECE preparation for students and teachers.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#17603f",
};

/** Root of the BECE Prep app. Deliberately free of the public site's header and footer. */
export default function PrepRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`${jakarta.variable} min-h-screen bg-prep-ground font-prep text-prep-ink`}>{children}</div>
  );
}
