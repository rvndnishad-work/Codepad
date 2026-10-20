import { siteOrigin } from "@/lib/site-url";
import { currentBrand } from "@/lib/current-site";
import "./globals.css";
import "./light-remap.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono, Fira_Code } from "next/font/google";
import ThemedToaster from "@/components/ThemedToaster";
import RouteProgress from "@/components/RouteProgress";
import Header from "@/components/Header";
import HeaderShell from "@/components/HeaderShell";
import Footer from "@/components/Footer";
import FooterShell from "@/components/FooterShell";
import MaintenanceBanner from "@/components/MaintenanceBanner";

import { ThemeProvider } from "@/components/ThemeProvider";

// Geist is the UI and display face: engineered, slightly condensed and
// crisp at both 14px body and 96px headlines, so the marketing pages and
// the app share one family instead of leaning on weight 900 for character.
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Fira Code is the preferred coding font across every editor/playground — its
// programming ligatures (=>, ===, !=, >=, …) read well in code. Loaded via
// next/font and exposed as --font-mono, which Tailwind `font-mono` and every
// editor's fontFamily resolve to.
const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// Geist Mono is the label face on the marketing pages (/ and /hire), set
// through the .wow-scope class. It is narrower and quieter than Fira Code in
// small uppercase labels; editors keep Fira Code for its ligatures.
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

/** Tab icon, title, description and share cards follow the domain's brand (src/lib/brand.ts). */
export async function generateMetadata(): Promise<Metadata> {
  const brand = await currentBrand();
  return {
    metadataBase: new URL(siteOrigin()),
    title: {
      default: brand.title,
      template: `%s — ${brand.name}`,
    },
    description: brand.description,
    applicationName: brand.name,
    icons: {
      icon: [
        { url: `${brand.icon}-32.png`, sizes: "32x32", type: "image/png" },
        { url: `${brand.icon}-48.png`, sizes: "48x48", type: "image/png" },
        { url: `${brand.icon}-192.png`, sizes: "192x192", type: "image/png" },
        { url: `${brand.icon}-512.png`, sizes: "512x512", type: "image/png" },
      ],
      shortcut: `${brand.icon}.ico`,
      apple: [{ url: `${brand.icon}-apple-180.png`, sizes: "180x180", type: "image/png" }],
    },
    keywords:
      brand.key === "intervutree"
        ? ["technical screening", "take-home assessment", "AI interview", "candidate shortlist", "hiring platform"]
        : ["interview prep", "coding challenges", "interview questions", "javascript playground", "react sandbox", "developer portfolio"],
    openGraph: {
      type: "website",
      siteName: brand.name,
      title: brand.title,
      description: brand.description,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: brand.title,
      description: brand.description,
    },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${firaCode.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen font-sans flex flex-col"
        // Some browser extensions (e.g. ColorZilla) inject attributes like
        // cz-shortcut-listen="true" onto <body> before React hydrates, which
        // triggers a "server vs client HTML mismatch" warning. The injection
        // is benign — suppress the warning for this element only. Doesn't
        // cover our own components; they're still hydration-checked normally.
        suppressHydrationWarning
      >
        {/* Dark stays the default. Pages reviewed in the light theme (see
            lib/theme-routes.ts) follow the visitor's choice from the header
            toggle; all other pages are forced dark by ThemeProvider. */}
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <Suspense fallback={null}>
            <RouteProgress />
          </Suspense>
          <Suspense fallback={null}>
            <MaintenanceBanner />
          </Suspense>
          <HeaderShell><Header /></HeaderShell>
          <main className="flex-1 flex flex-col">{children}</main>
          <FooterShell><Footer /></FooterShell>
          <ThemedToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
