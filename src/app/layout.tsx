import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { siteConfig, schoolImages } from "@/lib/constants";
import { organizationJsonLd } from "@/lib/seo";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | ${siteConfig.slogan}`,
    template: `%s | ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  keywords: [
    "Tomhel Preparatory School",
    "Ghana school",
    "preparatory school Effiduasi",
    "preparatory school Ashanti Region",
    "BECE preparation",
    "quality education Ghana",
  ],
  authors: [{ name: siteConfig.name }],
  openGraph: {
    type: "website",
    locale: "en_GH",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    images: [{ url: schoolImages.hero, alt: siteConfig.name }],
  },
  icons: {
    icon: schoolImages.logo,
    apple: schoolImages.logo,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
      </head>
      {/* Site chrome lives in (site)/layout.tsx; /prep has its own layout. */}
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
