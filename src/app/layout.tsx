import "./globals.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono, Fira_Code } from "next/font/google";
import ThemedToaster from "@/components/ThemedToaster";
import RouteProgress from "@/components/RouteProgress";
import Header from "@/components/Header";
import HeaderShell from "@/components/HeaderShell";
import Footer from "@/components/Footer";
import FooterShell from "@/components/FooterShell";

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

const SITE_NAME = "Interviewpad";
const SITE_DESCRIPTION =
  "Run and save JS, TS, React, Vue, Angular, Svelte, and Solid snippets. Isolated sandbox execution in your browser — no install needed.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "Interviewpad — JavaScript Playground",
    template: "%s — Interviewpad",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "javascript playground",
    "react sandbox",
    "typescript playground",
    "code editor",
    "online IDE",
    "sandpack",
    "snippet sharing",
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "Interviewpad — JavaScript Playground",
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Interviewpad — JavaScript Playground",
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

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
        {/* Dark-only product: forcedTheme locks it even for visitors with a
            stored light preference from before the switch was removed. */}
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
          <Suspense fallback={null}>
            <RouteProgress />
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
