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
import NavChrome from "./NavChrome";
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

  // For developers menu group. Categorized into Practice & Code vs Knowledge & AI.
  // Icons are passed as string names crossing RSC boundary (see NavDropdown.tsx ICON_MAP).
  const developerItems: NavDropdownItem[] = [
    {
      href: "/candidate/challenges",
      label: "Challenges",
      description: "150+ runnable challenges in eight languages.",
      iconName: "Target" as const,
      category: "Practice & Code",
    },
    {
      href: "/candidate/playgrounds",
      label: "Playgrounds",
      description: "Zero-setup whiteboard code sandboxes.",
      iconName: "Box" as const,
      category: "Practice & Code",
    },
    {
      href: user ? "/candidate/interview" : "/login?next=/candidate/interview",
      label: "Mock Interviews",
      description: user
        ? "Practice realistic mock interviews and review replays."
        : "Sign in to practice realistic mock interviews.",
      iconName: "Briefcase" as const,
      category: "Practice & Code",
    },
    {
      href: "/interview-questions",
      label: "Interview Questions",
      description: "1,600+ hand-curated Q&As across 14 technologies.",
      iconName: "BookOpen" as const,
      badge: "1.6k+",
      category: "Practice & Code",
    },
    {
      href: "/prep",
      label: "Prep Journeys",
      description: "Structured role-based roadmaps & study plans.",
      iconName: "Compass" as const,
      badge: "New",
      category: "Knowledge & AI",
    },
    {
      href: "/candidate/ai-code-review",
      label: "Review the AI's Code",
      description: "Detect hallucinated APIs, bugs, and security flaws.",
      iconName: "Bug" as const,
      badge: "New",
      category: "Knowledge & AI",
    },
    {
      href: "/candidate/prompt-practice",
      label: "Prompt Arena",
      description: "Benchmark and score prompt engineering skills.",
      iconName: "Sparkles" as const,
      badge: "New",
      category: "Knowledge & AI",
    },
    {
      href: "/creators",
      label: "Creators",
      description: "Learn from vetted creators — tutorials, real loops, prep guides.",
      iconName: "Store" as const,
      badge: "New",
      category: "Knowledge & AI",
    },
  ];

  const recruiterItems: NavDropdownItem[] = [
    {
      href: workspaceHref,
      label: "Workspaces",
      description: "Manage candidates, interview pipelines, and team seats.",
      iconName: "Building2" as const,
      category: "Evaluation Suite",
    },
    {
      href: aiScreeningHref,
      label: "AI Screening",
      description: "Autonomous first-round technical interviews at scale.",
      iconName: "Sparkles" as const,
      badge: "New",
      category: "Evaluation Suite",
    },
    {
      href: "/hire#sandbox",
      label: "Live Interviews",
      description: "Real-time collaborative sandbox with full keystroke replay.",
      iconName: "Video" as const,
      category: "Evaluation Suite",
    },
    {
      href: "/hire",
      label: "Platform Overview",
      description: "Evaluate candidates on proof of craft — not resumes.",
      iconName: "ShieldCheck" as const,
      category: "Platform",
    },
    {
      href: "/pricing",
      label: "Recruiter Pricing",
      description: "Flexible plans tailored for startups to enterprise.",
      iconName: "CreditCard" as const,
      category: "Platform",
    },
  ];

  // ── Apply admin visibility settings ──
  // Admins always see everything. For regular users, hidden items are removed
  // and coming_soon items get a visual badge + disabled state.
  const navLinks = await getNavLinks();

  /** Map nav-link hrefs → status, supporting candidate prefixes and recruiter routes */
  const statusForHref = (href: string) => {
    // Exact match first
    const exact = navLinks.find((l) => l.href === href);
    if (exact) return exact.status;

    // Normalize /candidate/foo -> /foo to match legacy admin setting hrefs
    const normalizedHref = href.replace(/^\/candidate/, "");
    const normalizedMatch = navLinks.find((l) => l.href === normalizedHref);
    if (normalizedMatch) return normalizedMatch.status;

    // Prefix match (e.g. workspace links /w/slug → /w setting)
    const prefix = navLinks.find(
      (l) => l.href !== "/" && (href.startsWith(l.href) || normalizedHref.startsWith(l.href))
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
  const devsMenuStatus = statusForHref("menu:developers");
  const recruitersMenuStatus = statusForHref("menu:recruiters");

  const filteredDeveloperItems = applyNavStatus(developerItems);
  const filteredRecruiterItems = applyNavStatus(recruiterItems, true);

  return (
    <NavChrome>
      <div className="nav-inner relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
        {/* Mobile: logo doubles as menu trigger (collapsed into MobileNav) */}
        <MobileNav
          signedIn={!!user}
          isAdmin={showAdmin}
          developerItems={filteredDeveloperItems}
          recruiterItems={filteredRecruiterItems}
          blogStatus={blogStatus}
          devsMenuStatus={devsMenuStatus}
          recruitersMenuStatus={recruitersMenuStatus}
        />

        {/* Desktop: logo links to home */}
        <HeaderLogo />

        <div className="flex items-center">
          <nav aria-label="Primary" className="hidden h-16 items-center gap-1 md:flex">
            {(devsMenuStatus !== "hidden" || showAdmin) &&
              (filteredDeveloperItems.length > 0 || showAdmin) && (
                <NavDropdown
                  label={devsMenuStatus === "hidden" && showAdmin ? "Developers (Hidden)" : "Developers"}
                  items={filteredDeveloperItems}
                  railTitle="For developers"
                  railBlurb="From daily practice to your dream offer — real sandboxes, curated questions, and AI skills."
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
                  railTitle="For hiring teams"
                  railBlurb="Screen, interview, and evaluate candidates on proof of craft with live replay."
                  railHref="/hire"
                  railHrefLabel="See recruiter platform"
                />
              )}

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

          </nav>

          {/* Utility island — divider + buttons flip with the bar state. */}
          <div className="nav-utils ml-1 flex h-8 items-center gap-2.5 border-l border-border pl-4 md:ml-5 md:pl-5 nav-divider">
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
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-[#8b93ff] via-[#ff2fb3] to-[#22d3ee] bg-[length:180%_100%] bg-left px-5 py-2 text-[13px] font-bold text-white shadow-[0_6px_24px_-8px_rgba(139,147,255,0.7)] transition-all duration-300 hover:bg-right hover:shadow-[0_8px_30px_-6px_rgba(255,47,179,0.6)] active:translate-y-px"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </NavChrome>
  );
}
