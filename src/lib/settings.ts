"use server";

import { prisma } from "./prisma";
import { NavLinkConfig, DEFAULT_NAV_LINKS } from "./settings-constants";

import { isAdmin } from "./admin";
import { notFound, redirect } from "next/navigation";

export async function getNavLinks(): Promise<NavLinkConfig[]> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: "nav_links" },
    });

    if (!setting) return DEFAULT_NAV_LINKS;

    const savedLinks = JSON.parse(setting.value) as NavLinkConfig[];
    
    // Merge saved links with default links to handle new hardcoded links added in code
    return DEFAULT_NAV_LINKS.map(def => {
      const saved = savedLinks.find(s => s.href === def.href);
      return saved ? { ...def, status: saved.status } : def;
    });
  } catch (error) {
    console.error("Failed to fetch nav links:", error);
    return DEFAULT_NAV_LINKS;
  }
}

export async function updateNavLinks(links: NavLinkConfig[]) {
  return prisma.siteSetting.upsert({
    where: { key: "nav_links" },
    update: { value: JSON.stringify(links) },
    create: { key: "nav_links", value: JSON.stringify(links) },
  });
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
