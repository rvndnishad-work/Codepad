import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import Header from "@/components/Header";
import HeaderShell from "@/components/HeaderShell";
import Footer from "@/components/Footer";
import FooterShell from "@/components/FooterShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_NAME = "Codepad";
const SITE_DESCRIPTION =
  "Run and save JS, TS, React, Vue, Angular, Svelte, and Solid snippets. Isolated sandbox execution in your browser — no install needed.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "Codepad — JavaScript Playground",
    template: "%s — Codepad",
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
    title: "Codepad — JavaScript Playground",
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Codepad — JavaScript Playground",
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans flex flex-col">
        <HeaderShell><Header /></HeaderShell>
        <main className="flex-1 flex flex-col">{children}</main>
        <FooterShell><Footer /></FooterShell>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#12151d",
              border: "1px solid #20242f",
              color: "#e8ebf2",
            },
          }}
        />
      </body>
    </html>
  );
}
