"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";
import { supportsLightTheme } from "@/lib/theme-routes";

// Silence THREE.Clock deprecation warnings arising from upstream react-three-fiber Canvas initialization
if (typeof window !== "undefined") {
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (
      args[0] &&
      typeof args[0] === "string" &&
      args[0].includes("THREE.Clock: This module has been deprecated")
    ) {
      return;
    }
    originalWarn(...args);
  };
}

/**
 * Routes that have been reviewed in the light theme follow the visitor's
 * choice; every other route stays forced dark (see lib/theme-routes.ts).
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const pathname = usePathname();
  const forcedTheme = supportsLightTheme(pathname) ? undefined : "dark";
  return (
    <NextThemesProvider {...props} forcedTheme={forcedTheme}>
      {children}
    </NextThemesProvider>
  );
}
