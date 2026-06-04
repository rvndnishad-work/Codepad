"use server";

import { prisma } from "./prisma";
import { NavLinkConfig, DEFAULT_NAV_LINKS } from "./settings-constants";
import { getNavLinksCached, NAV_LINKS_TAG } from "./nav-links-cache";

import { auth } from "./auth";
import { isAdmin } from "./admin";
import { updateTag } from "next/cache";
import { notFound, redirect } from "next/navigation";


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
  const result = await prisma.siteSetting.upsert({
    where: { key: "nav_links" },
    update: { value: JSON.stringify(links) },
    create: { key: "nav_links", value: JSON.stringify(links) },
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

  if (link.status === "hidden") {
    notFound();
  }

  if (link.status === "coming_soon") {
    // Redirect to the dedicated coming-soon page
    redirect(`/coming-soon?feature=${encodeURIComponent(link.label)}`);
  }
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

