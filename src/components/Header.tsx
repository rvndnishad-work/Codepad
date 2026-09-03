import Link from "next/link";
import { auth } from "@/lib/auth";
import { isStaff } from "@/lib/permissions/staff";
import { userCan } from "@/lib/permissions/access";
import { getPrimaryWorkspaceSlug } from "@/lib/workspace-nav";
import { getNavLinks } from "@/lib/settings";
import type { NavDropdownItem } from "./NavDropdown";
import HeaderLogo from "./HeaderLogo";
import HeaderLink from "./HeaderLink";
import NavDropdown from "./NavDropdown";

import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";
import MobileNav from "./MobileNav";
import NotificationBell from "./NotificationBell";

export default async function Header() {
  const session = await auth().catch(() => null);
  const user = session?.user;
  const showAdmin = await isStaff(session);
  const showCreator = user?.id ? await userCan(user.id, "content:author") : false;

  // Resolve the workspace nav landing. Signed-in users go to the /w hub — it
  // lists their workspaces (picker) or pitches creating the first one, so the
  // link never dead-ends on marketing for someone who already has a tenant.
  // AI Screening still deep-links into the primary workspace when one exists.
  // Unauthenticated visitors get nudged to /pricing where the marketing copy
  // explains workspaces.
  let workspaceHref = "/pricing";
  let aiScreeningHref = "/pricing";
  if (user?.id) {
    workspaceHref = "/w";
    aiScreeningHref = "/w";
    const slug = await getPrimaryWorkspaceSlug(user.id);
    if (slug) {
      aiScreeningHref = `/w/${slug}/ai-interviews`;
    }
  }

  // For developers menu group. /interview is signed-in-only; for visitors we
  // surface a generic landing instead of a dead link.
  // Icons are passed as string names because we're crossing the RSC server →
  // client boundary — see NavDropdown.tsx ICON_MAP for the registry.
  const developerItems = [
    {
      href: "/candidate/playgrounds",
      label: "Playgrounds",
      description: "Whiteboard-style code sandboxes — no setup.",
      iconName: "Box" as const,
      tint: "cyan",
    },
    {
      href: "/candidate/challenges",
      label: "Challenges",
      description: "Browse the public challenge catalog.",
      iconName: "Target" as const,
      tint: "violet",
    },
    {
      href: "/candidate/prompt-practice",
      label: "Prompt Arena",
      description: "Evaluate and practice prompt engineering quality.",
      iconName: "Sparkles" as const,
      badge: "New",
      tint: "amber",
    },
    {
      href: "/candidate/ai-code-review",
      label: "Review the AI's Code",
      description: "Spot planted bugs, hallucinated APIs, and security holes in AI code.",
      iconName: "Bug" as const,
      badge: "New",
      tint: "rose",
    },
    {
      href: "/interview-questions",
      label: "Interview Questions",
      description: "Company & tech questions with answers.",
      iconName: "BookOpen" as const,
      badge: "New",
      tint: "emerald",
    },
    {
      href: "/creators",
      label: "Creators",
      description: "Exclusive prep from creators you follow.",
      iconName: "Store" as const,
      badge: "New",
      tint: "amber",
    },
    {
      href: user ? "/candidate/interview" : "/login?next=/candidate/interview",
      label: "Mock Interviews",
      description: user
        ? "Practice realistic mock interviews and review past sessions."
        : "Sign in to practice realistic mock interviews.",
      iconName: "Briefcase" as const,
      tint: "blue",
    },
  ];

  const recruiterItems: NavDropdownItem[] = [
    {
      href: workspaceHref,
      label: "Workspaces",
      description: "Manage candidates, interviews, and your team.",
      iconName: "Building2" as const,
      tint: "indigo",
    },
    {
      href: aiScreeningHref,
      label: "AI Screening",
      description: "Let an AI agent run first-round interviews.",
      iconName: "Sparkles" as const,
      badge: "New",
      tint: "rose",
    },
  ];

  // ── Apply admin visibility settings ──
  // Admins always see everything. For regular users, hidden items are removed
  // and coming_soon items get a visual badge + disabled state.
  const navLinks = await getNavLinks();

  /** Map nav-link hrefs → status, supporting prefix matching for recruiter
   *  routes (e.g. "/w" matches "/w/some-slug" workspace links). */
  const statusForHref = (href: string) => {
    // Exact match first
    const exact = navLinks.find((l) => l.href === href);
    if (exact) return exact.status;
    // Prefix match (e.g. workspace links /w/slug → /w setting)
    const prefix = navLinks.find(
      (l) => l.href !== "/" && href.startsWith(l.href)
    );
    return prefix?.status ?? "visible";
  };

  /** Recruiter-specific prefix map: the admin setting key → the actual
   *  item label, since recruiter hrefs are dynamic (/w/[slug]/...). */
  const RECRUITER_SETTING_MAP: Record<string, string> = {
    "/w": "Workspaces",
    "/w/ai-screening": "AI Screening",
  };

  function applyNavStatus(items: NavDropdownItem[], isRecruiter = false): NavDropdownItem[] {
    return items
      .map((item) => {
        let status: string;
        if (isRecruiter) {
          // For recruiter items, look up by label → setting href
          const settingKey = Object.entries(RECRUITER_SETTING_MAP).find(
            ([, label]) => label === item.label
          )?.[0];
          status = settingKey
            ? navLinks.find((l) => l.href === settingKey)?.status ?? "visible"
            : "visible";
        } else {
          status = statusForHref(item.href);
        }

        if (showAdmin) {
          if (status === "hidden") {
            return {
              ...item,
              status: "visible" as const, // clickable for admin
              badge: "Hidden",
            };
          }
          if (status === "coming_soon") {
            return {
              ...item,
              status: "visible" as const, // clickable for admin
              badge: "Soon",
            };
          }
          return { ...item, status: "visible" as const };
        }

        if (status === "hidden") return null;
        if (status === "coming_soon") {
          return {
            ...item,
            href: `/coming-soon?feature=${encodeURIComponent(item.label)}`,
            status: "coming_soon" as const,
            badge: undefined, // suppress "New" badge in favour of "Coming Soon"
          };
        }
        return { ...item, status: "visible" as const };
      })
      .filter(Boolean) as NavDropdownItem[];
  }

  const blogStatus = statusForHref("/blog");
  const pricingStatus = statusForHref("/pricing");
  const devsMenuStatus = statusForHref("menu:developers");
  const recruitersMenuStatus = statusForHref("menu:recruiters");

  const filteredDeveloperItems = applyNavStatus(developerItems);
  const filteredRecruiterItems = applyNavStatus(recruiterItems, true);

  return (
    /* The header is chrome, not a component: solid surface, one hairline, no
       glass and no shadow. Everything inside it sits on the same 64px band so
       the tab-style active rule can meet the bottom border exactly. */
    <header className="sticky top-0 z-[100] border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
        {/* Mobile: logo doubles as menu trigger (collapsed into MobileNav) */}
        <MobileNav
          signedIn={!!user}
          isAdmin={showAdmin}
          developerItems={filteredDeveloperItems}
          recruiterItems={filteredRecruiterItems}
          blogStatus={blogStatus}
          pricingStatus={pricingStatus}
          devsMenuStatus={devsMenuStatus}
          recruitersMenuStatus={recruitersMenuStatus}
        />

        {/* Desktop: logo links to home */}
        <HeaderLogo />

        <div className="flex items-center">
          <nav aria-label="Primary" className="hidden h-16 items-stretch md:flex">
            {(devsMenuStatus !== "hidden" || showAdmin) &&
              (filteredDeveloperItems.length > 0 || showAdmin) && (
                <NavDropdown
                  label={devsMenuStatus === "hidden" && showAdmin ? "Developers (Hidden)" : "Developers"}
                  items={filteredDeveloperItems}
                  railTitle="For practising"
                  railBlurb="Everything a candidate needs between deciding to switch and signing the offer."
                  railHref="/prep"
                  railHrefLabel="Start a prep journey"
                />
              )}
            {(recruitersMenuStatus !== "hidden" || showAdmin) &&
              (filteredRecruiterItems.length > 0 || showAdmin) && (
                <NavDropdown
                  label={recruitersMenuStatus === "hidden" && showAdmin ? "Hiring teams (Hidden)" : "Hiring teams"}
                  items={filteredRecruiterItems}
                  tone="secondary"
                  railTitle="For hiring"
                  railBlurb="Screen, interview and decide on evidence — one workspace for the whole funnel."
                  railHref="/hire"
                  railHrefLabel="See the platform"
                />
              )}

            <HeaderLink href="/creators" label="Creators" badge="New" />

            {(blogStatus !== "hidden" || showAdmin) && (
              <HeaderLink
                href={blogStatus === "coming_soon" && !showAdmin ? "/coming-soon?feature=Blog" : "/blog"}
                matchPrefix="/blog"
                label="Blog"
                tone={
                  blogStatus === "coming_soon" ? "warn" : blogStatus === "hidden" && showAdmin ? "danger" : "default"
                }
                badge={
                  blogStatus === "coming_soon" ? "Soon" : blogStatus === "hidden" && showAdmin ? "Hidden" : undefined
                }
              />
            )}

            {(pricingStatus !== "hidden" || showAdmin) && (
              <HeaderLink
                href={pricingStatus === "coming_soon" && !showAdmin ? "/coming-soon?feature=Pricing" : "/pricing"}
                matchPrefix="/pricing"
                label="Pricing"
                tone={
                  pricingStatus === "coming_soon"
                    ? "warn"
                    : pricingStatus === "hidden" && showAdmin
                      ? "danger"
                      : "default"
                }
                badge={
                  pricingStatus === "coming_soon"
                    ? "Soon"
                    : pricingStatus === "hidden" && showAdmin
                      ? "Hidden"
                      : undefined
                }
              />
            )}
          </nav>

          {/* Utilities sit behind a single hairline divider — the one piece of
              structure in the bar, so nav and account never read as one list. */}
          <div className="ml-1 flex h-8 items-center gap-3 border-l border-border pl-4 md:ml-5 md:pl-5">
            <ThemeToggle />
            {/* Bell shows for any authenticated user — both candidates and
                recruiters get the same notification model (IP-40). The bell
                silently no-ops when unauthenticated (API returns 401). */}
            {user ? <NotificationBell /> : null}

            {user ? (
              <UserMenu
                user={{ name: user.name, email: user.email, image: user.image }}
                isAdmin={showAdmin}
                isCreator={showCreator}
              />
            ) : (
              <Link href="/login" className="ip-btn ip-btn-primary ip-btn-sm">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
