"use client";

/**
 * Runs the workspace tour (stops in src/lib/workspace/tour.ts) with driver.js.
 * Stops whose element is missing or hidden (the sidebar on a phone, a
 * collapsed rail) show as a centred card instead of pointing at nothing.
 */
import { tourSeenKey, tourStops, type TourOptions } from "@/lib/workspace/tour";
import "driver.js/dist/driver.css";

const SIDE: Record<string, "right" | "left" | "top" | "bottom"> = { credits: "left", "tour-start": "top" };

function visibleTarget(name: string): Element | undefined {
  const el = document.querySelector(`[data-tour="${name}"]`);
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? el : undefined;
}

export function markTourSeen(slug: string) {
  try {
    localStorage.setItem(tourSeenKey(slug), "1");
  } catch {
    /* storage blocked: the tour may open again next time */
  }
}

export function tourSeen(slug: string): boolean {
  try {
    return localStorage.getItem(tourSeenKey(slug)) === "1";
  } catch {
    return true; // cannot remember it, so do not keep opening it
  }
}

export async function startWorkspaceTour(slug: string, opts: TourOptions) {
  const { driver } = await import("driver.js");
  const steps = tourStops(opts).map((s) => {
    const element = s.target ? visibleTarget(s.target) : undefined;
    return {
      element,
      popover: { title: s.title, description: s.body, side: element ? (SIDE[s.target ?? ""] ?? "right") : undefined, align: "start" as const },
    };
  });
  const tour = driver({
    steps,
    showProgress: true,
    progressText: "{{current}} of {{total}}",
    nextBtnText: "Next",
    prevBtnText: "Back",
    doneBtnText: "Done",
    popoverClass: "ws-tour",
    stagePadding: 6,
    stageRadius: 10,
    overlayOpacity: 0.6,
    smoothScroll: true,
    onDestroyed: () => markTourSeen(slug),
  });
  tour.drive();
}
