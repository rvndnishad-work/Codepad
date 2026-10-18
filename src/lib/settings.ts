"use server";

import { prisma } from "./prisma";
import {
  NavLinkConfig,
  DEFAULT_NAV_LINKS,
  isProtectedRoute,
} from "./settings-constants";
import { getNavLinksCached, NAV_LINKS_TAG } from "./nav-links-cache";
import { logAdminAction, type AdminActor } from "./admin/audit";

import { auth } from "./auth";
import { staffCan } from "./permissions/staff";
import { sanitizeAssistSettings } from "./playground-assist";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";

/** Platform-admin gate for every settings write. Returns the actor for the
 *  audit row. */
async function requireSettingsAdmin(): Promise<AdminActor> {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "platform:admin"))) {
    throw new Error("Unauthorized: Platform administrator access required.");
  }
  return { id: session?.user?.id ?? null, email: session?.user?.email ?? null };
}

/** Upsert one SiteSetting JSON value and write a `setting.update` audit row
 *  with before/after. Skips both the write and the audit when nothing
 *  changed, so saving an untouched section leaves no noise in the log. */
async function saveSetting<T>(actor: AdminActor, key: string, value: T) {
  const next = JSON.stringify(value);
  const prev = await prisma.siteSetting.findUnique({ where: { key } });
  if (prev?.value === next) return prev;
  const result = await prisma.siteSetting.upsert({
    where: { key },
    update: { value: next },
    create: { key, value: next },
  });
  let before: unknown = null;
  try {
    before = prev ? JSON.parse(prev.value) : null;
  } catch {
    before = prev?.value ?? null;
  }
  await logAdminAction({
    actor,
    action: "setting.update",
    targetType: "setting",
    targetId: key,
    targetLabel: key,
    before,
    after: value,
  });
  return result;
}

export async function getNavLinks(): Promise<NavLinkConfig[]> {
  try {
    return await getNavLinksCached();
  } catch (error) {
    console.error("Failed to fetch nav links:", error);
    return DEFAULT_NAV_LINKS;
  }
}

export async function updateNavLinks(links: NavLinkConfig[]) {
  const actor = await requireSettingsAdmin();
  // Defense in depth: protected routes (the home page) can never be gated, no
  // matter what the client posts. Coerce them back to "visible" before saving
  // so a crafted request can't take the public site dark.
  const sanitized = links.map((l) =>
    isProtectedRoute(l.href) ? { ...l, status: "visible" as const } : l
  );
  const result = await saveSetting(actor, "nav_links", sanitized);
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
  if (await staffCan(session, "platform:admin")) return;

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

    // Merge over the defaults so a row saved before a field existed (e.g.
    // showScheduleToDeveloper) still yields a complete object.
    return {
      ...DEFAULT_ARENA_SETTINGS,
      ...(JSON.parse(setting.value) as Partial<InterviewArenaSettings>),
    };
  } catch (error) {
    console.error("Failed to fetch Interview Arena settings:", error);
    return DEFAULT_ARENA_SETTINGS;
  }
}

export async function updateInterviewArenaSettings(config: InterviewArenaSettings) {
  const actor = await requireSettingsAdmin();
  // Only the four known booleans are stored, whatever the client posts.
  const clean: InterviewArenaSettings = {
    showMockToDeveloper: Boolean(config.showMockToDeveloper),
    showScheduleToDeveloper: Boolean(config.showScheduleToDeveloper),
    showMockToRecruiter: Boolean(config.showMockToRecruiter),
    showScheduleToRecruiter: Boolean(config.showScheduleToRecruiter),
  };
  return saveSetting(actor, "interview_arena_settings", clean);
}

export type PlaygroundAssistSettings = {
  enabled: boolean;
  dailyLimit: number;
};

const DEFAULT_PLAYGROUND_ASSIST_SETTINGS: PlaygroundAssistSettings = {
  enabled: true,
  dailyLimit: 5,
};

/** Playground AI Assist kill switch + daily free-message quota (admin UI). */
export async function getPlaygroundAssistSettings(): Promise<PlaygroundAssistSettings> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: "playground_assist_settings" },
    });
    if (!setting) return DEFAULT_PLAYGROUND_ASSIST_SETTINGS;
    return sanitizeAssistSettings(JSON.parse(setting.value));
  } catch (error) {
    console.error("Failed to fetch playground assist settings:", error);
    return DEFAULT_PLAYGROUND_ASSIST_SETTINGS;
  }
}

/** Update the assist kill switch / quota. Admin-only; values are sanitized. */
export async function updatePlaygroundAssistSettings(
  config: PlaygroundAssistSettings,
) {
  const actor = await requireSettingsAdmin();
  const clean = sanitizeAssistSettings(config);
  return saveSetting(actor, "playground_assist_settings", clean);
}

