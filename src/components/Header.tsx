import Link from "next/link";
import { auth } from "@/lib/auth";
import { isStaff } from "@/lib/permissions/staff";
import { getPrimaryWorkspaceSlug } from "@/lib/workspace-nav";
import { getNavLinks } from "@/lib/settings";
import type { NavDropdownItem } from "./NavDropdown";
import { BookOpen, CreditCard } from "lucide-react";
import HeaderLogo from "./HeaderLogo";
import NavDropdown from "./NavDropdown";

import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";
import MobileNav from "./MobileNav";
import NotificationBell from "./NotificationBell";

export default async function Header() {
  const session = await auth().catch(() => null);
  const user = session?.user;
  const userType = (user as { userType?: string | null } | undefined)?.userType ?? null;
  const showAdmin = await isStaff(session);

  // Resolve the recruiter's "best" workspace landing. Signed-in recruiters with
  // a workspace deep-link straight into it; otherwise we send them to the
  // creation flow. Unauthenticated visitors get nudged to /pricing where the
  // marketing copy explains workspaces.
  let workspaceHref = "/pricing";
  let aiScreeningHref = "/pricing";
  if (user?.id) {
    const slug = await getPrimaryWorkspaceSlug(user.id);
    if (slug) {
      workspaceHref = `/w/${slug}`;
      aiScreeningHref = `/w/${slug}/ai-interviews`;
    } else if (userType === "recruiter") {
      workspaceHref = "/w/create";
      aiScreeningHref = "/w/create";
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
    },
    {
      href: "/candidate/challenges",
      label: "Challenges",
      description: "Browse the public challenge catalog.",
      iconName: "Target" as const,
    },
    {
      href: "/candidate/prompt-practice",
      label: "Prompt Arena",
      description: "Evaluate and practice prompt engineering quality.",
      iconName: "Sparkles" as const,
      badge: "New",
    },
    {
      href: user ? "/candidate/interview" : "/login?next=/candidate/interview",
      label: "Interviews",
      description: user
        ? "Your upcoming and past sessions."
        : "Sign in to view your interviews.",
      iconName: "Briefcase" as const,
    },
  ];

  const recruiterItems: NavDropdownItem[] = [
    {
      href: workspaceHref,
      label: "Workspaces",
      description: "Manage candidates, interviews, and your team.",
      iconName: "Building2" as const,
    },
    {
      href: aiScreeningHref,
      label: "AI Screening",
      description: "Let an AI agent run first-round interviews.",
      iconName: "Sparkles" as const,
      badge: "New",
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
    <header className="sticky top-0 z-[100] bg-surface/80 backdrop-blur-xl border-b border-border relative">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between gap-3">
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

        {/* Navigation & Auth */}
        <div className="flex items-center gap-4">
          <nav className="flex items-center">
            <div className="hidden md:flex items-center gap-6 text-sm font-medium mr-6 border-r border-border pr-6 h-16">
              {(devsMenuStatus !== "hidden" || showAdmin) && (filteredDeveloperItems.length > 0 || showAdmin) && (
                <NavDropdown
                  label={devsMenuStatus === "hidden" && showAdmin ? "For Developers (Hidden)" : "For Developers"}
                  items={filteredDeveloperItems}
                />
              )}
              {(recruitersMenuStatus !== "hidden" || showAdmin) && (filteredRecruiterItems.length > 0 || showAdmin) && (
                <NavDropdown
                  label={recruitersMenuStatus === "hidden" && showAdmin ? "For Recruiters (Hidden)" : "For Recruiters"}
                  items={filteredRecruiterItems}
                />
              )}

              {(blogStatus !== "hidden" || showAdmin) && (
                <Link
                  href={blogStatus === "coming_soon" && !showAdmin ? "/coming-soon?feature=Blog" : "/blog"}
                  className={`transition-colors flex items-center h-full text-fg/50 hover:text-fg ${
                    blogStatus === "coming_soon" && !showAdmin ? "opacity-50 hover:text-amber-400" : ""
                  } ${blogStatus === "hidden" && showAdmin ? "opacity-75 text-rose-400 hover:text-rose-300" : ""}`}
                >
                  <span className="relative flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    Blog
                    {blogStatus === "coming_soon" && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-black uppercase tracking-wider scale-90 animate-fade-in">
                        Soon
                      </span>
                    )}
                    {blogStatus === "hidden" && showAdmin && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-black uppercase tracking-wider scale-90 animate-fade-in">
                        Hidden
                      </span>
                    )}
                  </span>
                </Link>
              )}

              {(pricingStatus !== "hidden" || showAdmin) && (
                <Link
                  href={pricingStatus === "coming_soon" && !showAdmin ? "/coming-soon?feature=Pricing" : "/pricing"}
                  className={`transition-colors flex items-center h-full text-fg/50 hover:text-fg ${
                    pricingStatus === "coming_soon" && !showAdmin ? "opacity-50 hover:text-amber-400" : ""
                  } ${pricingStatus === "hidden" && showAdmin ? "opacity-75 text-rose-400 hover:text-rose-300" : ""}`}
                >
                  <span className="relative flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    Pricing
                    {pricingStatus === "coming_soon" && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-black uppercase tracking-wider scale-90 animate-fade-in">
                        Soon
                      </span>
                    )}
                    {pricingStatus === "hidden" && showAdmin && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-black uppercase tracking-wider scale-90 animate-fade-in">
                        Hidden
                      </span>
                    )}
                  </span>
                </Link>
              )}
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              {/* Bell shows for any authenticated user — both candidates and
                  recruiters get the same notification model (IP-40). The bell
                  silently no-ops when unauthenticated (API returns 401). */}
              {user ? <NotificationBell /> : null}

              <div className="flex items-center gap-4 pl-4 border-l border-border h-8">
                {user ? (
                  <UserMenu
                    user={{ name: user.name, email: user.email, image: user.image }}
                    isAdmin={showAdmin}
                  />
                ) : (
                  <Link
                    href="/login"
                    className="px-4 py-2 rounded-lg bg-fg text-bg text-sm font-semibold hover:bg-fg/90 transition-all shadow-soft active:scale-95"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
