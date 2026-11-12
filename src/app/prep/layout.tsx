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

/**
 * Every /prep page and action talks to the Google Sheet, and each call takes a second or more (longer when
 * Google is busy or the script starts cold). Give them up to a minute instead of the platform's short default,
 * so a slow moment doesn't fail a student's submit.
 */
export const maxDuration = 60;

export const viewport: Viewport = {
  themeColor: "#17603f",
};

/** Root of the BECE Prep app. Deliberately free of the public site's header and footer. */
export default function PrepRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`${jakarta.variable} min-h-screen bg-prep-ground font-prep text-prep-ink`}>{children}</div>
  );
}
