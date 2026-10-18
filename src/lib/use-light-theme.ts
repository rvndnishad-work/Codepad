"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

/**
 * True only once mounted AND the resolved theme is light. Before mount (and on
 * the server) it is false, so the dark rendering is the default path and the
 * dark theme never changes because of light-only code.
 */
export function useIsLightTheme(): boolean {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && resolvedTheme === "light";
}
