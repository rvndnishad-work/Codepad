"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { supportsLightTheme } from "@/lib/theme-routes";

/**
 * Light / dark switch in the header. Only shown on pages that have been
 * reviewed in the light theme; elsewhere the page is forced dark and a
 * switch would do nothing.
 */
export default function ThemeToggle() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!supportsLightTheme(pathname)) return null;
  const isLight = mounted && resolvedTheme === "light";
  const label = isLight ? "Switch to dark theme" : "Switch to light theme";

  return (
    <button
      type="button"
      onClick={() => setTheme(isLight ? "dark" : "light")}
      aria-label={label}
      title={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors duration-200 hover:text-fg"
    >
      {/* Before mount the theme is unknown; the icon is decided after. */}
      {mounted ? isLight ? <Moon className="h-4 w-4" aria-hidden /> : <Sun className="h-4 w-4" aria-hidden /> : <span className="h-4 w-4" />}
    </button>
  );
}
