import "./globals.css";
import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { Toaster } from "sonner";
import Header from "@/components/Header";
import HeaderShell from "@/components/HeaderShell";
import Footer from "@/components/Footer";
import FooterShell from "@/components/FooterShell";

import { ThemeProvider } from "@/components/ThemeProvider";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
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
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <body className="min-h-screen font-sans flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <HeaderShell><Header /></HeaderShell>
          <main className="flex-1 flex flex-col">{children}</main>
          <FooterShell><Footer /></FooterShell>
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--fg)",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
