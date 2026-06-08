"use server";

import { prisma } from "./prisma";
import {
  NavLinkConfig,
  DEFAULT_NAV_LINKS,
  isProtectedRoute,
  type MaintenanceConfig,
} from "./settings-constants";
import { getNavLinksCached, NAV_LINKS_TAG } from "./nav-links-cache";
import {
  getMaintenanceConfig,
  clearMaintenanceCache,
  MAINTENANCE_KEY,
} from "./maintenance";

import { auth } from "./auth";
import { isAdmin } from "./admin";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";


export async function getNavLinks(): Promise<NavLinkConfig[]> {
  try {
    return await getNavLinksCached();
  } catch (error) {
    console.error("Failed to fetch nav links:", error);
    return DEFAULT_NAV_LINKS;
  }
}

export async function updateNavLinks(links: NavLinkConfig[]) {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) {
    throw new Error("Unauthorized: Platform administrator access required.");
  }
  // Defense in depth: protected routes (the home page) can never be gated, no
  // matter what the client posts. Coerce them back to "visible" before saving
  // so a crafted request can't take the public site dark.
  const sanitized = links.map((l) =>
    isProtectedRoute(l.href) ? { ...l, status: "visible" as const } : l
  );
  const result = await prisma.siteSetting.upsert({
    where: { key: "nav_links" },
    update: { value: JSON.stringify(sanitized) },
    create: { key: "nav_links", value: JSON.stringify(sanitized) },
  });
  // Drop the Data Cache entry so the new nav config is live immediately
  // (read-your-own-writes from this server action).
  updateTag(NAV_LINKS_TAG);
  return result;
}

/**
 * Validates if the current user (from session) can access the given path
 * based on navigation settings. Admins are always allowed.
 */
export async function validatePageAccess(pathname: string, session: any) {
  if (isAdmin(session)) return;

  const links = await getNavLinks();

  // Find the matching navigation link
  const link = links.find(l =>
    pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href))
  );

  if (!link) return;

  // The home page (and any other protected route) is always reachable — it's
  // the public front door. Never gate it even if the stored config says so.
  if (isProtectedRoute(link.href)) return;

  // Gated pages redirect to the friendly /coming-soon screen (HTTP 307 → a
  // 200 page with the value prop and a way in) rather than firing notFound(),
  // which rendered the snippet-themed 404 and returned a 404 status to crawlers.
  if (link.status === "hidden") {
    redirect(`/coming-soon?feature=${encodeURIComponent(link.label)}&mode=unavailable`);
  }

  if (link.status === "coming_soon") {
    redirect(`/coming-soon?feature=${encodeURIComponent(link.label)}`);
  }
}

/** Read the site-wide maintenance switch (for the admin settings form). */
export async function getMaintenanceSettings(): Promise<MaintenanceConfig> {
  return getMaintenanceConfig();
}

/** Toggle / update the site-wide maintenance switch. Admin-only. */
export async function updateMaintenanceSettings(config: MaintenanceConfig) {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) {
    throw new Error("Unauthorized: Platform administrator access required.");
  }
  const clean: MaintenanceConfig = {
    enabled: Boolean(config.enabled),
    message: (config.message ?? "").slice(0, 280),
  };
  const result = await prisma.siteSetting.upsert({
    where: { key: MAINTENANCE_KEY },
    update: { value: JSON.stringify(clean) },
    create: { key: MAINTENANCE_KEY, value: JSON.stringify(clean) },
  });
  // Best-effort: clears this bundle's cache immediately. The proxy runs in a
  // separate bundle and picks up the change within the cache TTL.
  clearMaintenanceCache();
  return result;
}

export type B2bSettingsConfig = {
  freeSeatLimit: number;
  seatPrice: number;
  proctoringEnabled: boolean;
};

const DEFAULT_B2B_SETTINGS: B2bSettingsConfig = {
  freeSeatLimit: 3,
  seatPrice: 49,
  proctoringEnabled: true,
};

export async function getB2bSettings(): Promise<B2bSettingsConfig> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: "b2b_settings" },
    });

    if (!setting) return DEFAULT_B2B_SETTINGS;

    return JSON.parse(setting.value) as B2bSettingsConfig;
  } catch (error) {
    console.error("Failed to fetch B2B settings:", error);
    return DEFAULT_B2B_SETTINGS;
  }
}

export async function updateB2bSettings(config: B2bSettingsConfig) {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) {
    throw new Error("Unauthorized: Platform administrator access required.");
  }
  return prisma.siteSetting.upsert({
    where: { key: "b2b_settings" },
    update: { value: JSON.stringify(config) },
    create: { key: "b2b_settings", value: JSON.stringify(config) },
  });
}

export type InterviewArenaSettings = {
  showMockToDeveloper: boolean;
  showScheduleToDeveloper: boolean;
  showMockToRecruiter: boolean;
  showScheduleToRecruiter: boolean;
};

const DEFAULT_ARENA_SETTINGS: InterviewArenaSettings = {
  showMockToDeveloper: true,
  showScheduleToDeveloper: false, // Default is false for developers as requested
  showMockToRecruiter: true,
  showScheduleToRecruiter: true,
};

export async function getInterviewArenaSettings(): Promise<InterviewArenaSettings> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: "interview_arena_settings" },
    });

    if (!setting) return DEFAULT_ARENA_SETTINGS;

    return JSON.parse(setting.value) as InterviewArenaSettings;
  } catch (error) {
    console.error("Failed to fetch Interview Arena settings:", error);
    return DEFAULT_ARENA_SETTINGS;
  }
}

export async function updateInterviewArenaSettings(config: InterviewArenaSettings) {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) {
    throw new Error("Unauthorized: Platform administrator access required.");
  }
  return prisma.siteSetting.upsert({
    where: { key: "interview_arena_settings" },
    update: { value: JSON.stringify(config) },
    create: { key: "interview_arena_settings", value: JSON.stringify(config) },
  });
}

