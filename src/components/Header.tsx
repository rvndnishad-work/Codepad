import Link from "next/link";
import { currentSite } from "@/lib/current-site";
import { brandForSite } from "@/lib/brand";
import { auth } from "@/lib/auth";
import { isStaff } from "@/lib/permissions/staff";
import { userCan } from "@/lib/permissions/access";
import { getPrimaryWorkspaceSlug } from "@/lib/workspace-nav";
import { getNavLinks } from "@/lib/settings";
import { navLinkFor } from "@/lib/settings-constants";
import type { NavDropdownItem } from "./NavDropdown";
import HeaderLogo from "./HeaderLogo";
import HeaderLink from "./HeaderLink";
import NavDropdown from "./NavDropdown";
import NavChrome from "./NavChrome";
import UserMenu from "./UserMenu";
import MobileNav from "./MobileNav";
import NavGlide from "./NavGlide";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";

export default async function Header() {
  const session = await auth().catch(() => null);
  // On a split domain each site shows only its own menu; null shows both.
  const site = await currentSite();
  const recruiterSite = site === "recruiter";
  const brandKey = site ? brandForSite(site).key : null;
  const showDeveloperMenu = site !== "recruiter";
  const showRecruiterMenu = site !== "developer";
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
  let hasWorkspace = false;
  if (user?.id) {
    workspaceHref = "/w";
    aiScreeningHref = "/w";
    const slug = await getPrimaryWorkspaceSlug(user.id);
    if (slug) {
      aiScreeningHref = `/w/${slug}/ai-interviews`;
      hasWorkspace = true;
    }
  }
  // Pricing is a top-level link for visitors and signed-in users without a
  // workspace. Once they have one, plans live in the workspace billing settings.
  const showPricing = showRecruiterMenu && !hasWorkspace;

  // For developers menu group. Categorized into Practice & Code vs Knowledge & AI.
  // Icons are passed as string names crossing RSC boundary (see NavDropdown.tsx ICON_MAP).
  const developerItems: NavDropdownItem[] = [
    {
      href: "/playgrounds",
      label: "Playgrounds",
      description: "Zero-setup whiteboard code sandboxes.",
      iconName: "Box" as const,
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
      href: "/candidate/challenges",
      label: "Challenges",
      description: "150+ runnable challenges in eight languages.",
      iconName: "Target" as const,
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
      href: "/candidate/prompt-practice",
      label: "Prompt Arena",
      description: "Benchmark and score prompt engineering skills.",
      iconName: "Sparkles" as const,
      badge: "New",
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
      href: "/features",
      label: "Features",
      description: "Pipelines, proctoring, replays, and ATS integrations.",
      iconName: "Box" as const,
      category: "Platform",
    },
    {
      href: "/docs/mcp",
      label: "Docs",
      description: "MCP API reference for agents and integrations.",
      iconName: "BookOpen" as const,
      category: "Platform",
    },
  ];

  // ── Apply admin visibility settings ──
  // Admins always see everything. For regular users, hidden items are removed
  // and coming_soon items get a visual badge + disabled state.
  const navLinks = await getNavLinks();

  /** The admin setting for a header href. Sign-in redirects count as their
   *  destination, and /candidate/foo falls back to the older /foo setting. */
  const statusForHref = (href: string) => {
    const target = href.startsWith("/login?next=") ? decodeURIComponent(href.slice("/login?next=".length)) : href;
    const link =
      navLinkFor(navLinks, target) ?? navLinkFor(navLinks, target.replace(/^\/candidate(?=\/)/, ""));
    return link?.status ?? "visible";
  };

  /** Recruiter items are looked up by label, since their hrefs are dynamic
   *  (/w/[slug]/...) or change per domain. Label → setting href. */
  const RECRUITER_SETTING_MAP: Record<string, string> = {
    Workspaces: "/w",
    "AI Screening": "/w/ai-screening",
    "Live Interviews": "/hire#sandbox",
    "Platform Overview": "/hire",
    Features: "/features",
    Docs: "/docs",
  };

  function applyNavStatus(items: NavDropdownItem[], isRecruiter = false): NavDropdownItem[] {
    return items
      .map((item) => {
        let status: string;
        if (isRecruiter) {
          // For recruiter items, look up by label → setting href
          const settingKey = RECRUITER_SETTING_MAP[item.label];
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
  const aboutStatus = statusForHref("/about");
  const devsMenuStatus = statusForHref("menu:developers");
  const recruitersMenuStatus = statusForHref("menu:recruiters");

  const filteredDeveloperItems = applyNavStatus(developerItems);
  // On the recruiter domain /hire is served at "/".
  const filteredRecruiterItems = applyNavStatus(recruiterItems, true).map((item) =>
    recruiterSite ? { ...item, href: item.href.replace(/^\/hire(?=$|#)/, "/") } : item,
  );

  /** The live items with these labels, in this order, for top-level pills. */
  const pillsFrom = (items: NavDropdownItem[], labels: string[]) =>
    labels.map((l) => items.find((i) => i.label === l && !i.href.startsWith("/coming-soon"))).filter(Boolean) as NavDropdownItem[];
  const developerPills = site === "developer" ? pillsFrom(filteredDeveloperItems, ["Playgrounds", "Interview Questions"]) : [];
  const recruiterPills = recruiterSite ? pillsFrom(filteredRecruiterItems, ["Workspaces"]) : [];
  /** The dropdown copy of the list, with the pill items flagged so the panel hides them at `lg`. */
  const withPromoted = (items: NavDropdownItem[], pills: NavDropdownItem[]) =>
    pills.length ? items.map((i) => (pills.includes(i) ? { ...i, promoted: true } : i)) : items;
  /**
   * Active-route prefix for a pill: the destination path, without query or
   * hash. Workspaces sends visitors to /pricing, which must not light it up,
   * so it always matches its real home under /w.
   */
  const pillPrefix = (item: NavDropdownItem) => {
    if (item.label === "Workspaces") return "/w";
    const href = item.href;
    const next = href.startsWith("/login?next=") ? decodeURIComponent(href.slice("/login?next=".length)) : href;
    return next.replace(/[?#].*$/, "") || "/";
  };

  return (
    <NavChrome>
      <div className="nav-inner relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
        {/* Mobile: logo doubles as menu trigger (collapsed into MobileNav) */}
        <MobileNav
          signedIn={!!user}
          isAdmin={showAdmin}
          developerItems={showDeveloperMenu ? filteredDeveloperItems : []}
          recruiterItems={showRecruiterMenu ? filteredRecruiterItems : []}
          blogStatus={showDeveloperMenu ? blogStatus : "hidden"}
          site={site}
          brand={brandKey}
          showPricing={showPricing}
          pricingStatus={showAdmin ? "visible" : pricingStatus}
          aboutStatus={showAdmin ? "visible" : aboutStatus}
          devsMenuStatus={devsMenuStatus}
          recruitersMenuStatus={recruitersMenuStatus}
        />

        {/* Desktop: logo links to home */}
        <HeaderLogo brand={brandKey} />

        <div className="flex items-center">
          <nav aria-label="Primary" className="hidden h-16 items-center gap-1 md:flex">
            <NavGlide>
            {showDeveloperMenu && (devsMenuStatus !== "hidden" || showAdmin) &&
              (filteredDeveloperItems.length > 0 || showAdmin) && (
                <NavDropdown
                  label={`${site === "developer" ? "Practice" : "Developers"}${devsMenuStatus === "hidden" && showAdmin ? " (Hidden)" : ""}`}
                  items={withPromoted(filteredDeveloperItems, developerPills)}
                  railTitle="For developers"
                  railBlurb="From daily practice to your dream offer — real sandboxes, curated questions, and AI skills."
                  railHref="/prep"
                  railHrefLabel="Start a prep journey"
                />
              )}
            {showRecruiterMenu && (recruitersMenuStatus !== "hidden" || showAdmin) &&
              (filteredRecruiterItems.length > 0 || showAdmin) && (
                <NavDropdown
                  label={`${recruiterSite ? "Product" : "Hiring teams"}${recruitersMenuStatus === "hidden" && showAdmin ? " (Hidden)" : ""}`}
                  items={withPromoted(filteredRecruiterItems, recruiterPills)}
                  tone="secondary"
                  railTitle="For hiring teams"
                  railBlurb="Screen, interview, and evaluate candidates on proof of craft with live replay."
                  railHref={recruiterSite ? "/" : "/hire"}
                  railHrefLabel="See recruiter platform"
                />
              )}

            {/* On a split domain the bar would hold one dropdown and a link, so a
                couple of destinations get their own pills on wide screens. From `lg`
                up they leave the dropdown (no double entry); below that the pills are
                hidden and the dropdown lists everything again. */}
            <span className="hidden lg:contents">
              {[...developerPills, ...recruiterPills].map((item) => (
                <HeaderLink key={item.href} href={item.href} matchPrefix={pillPrefix(item)} label={item.label} />
              ))}
            </span>
            {showPricing && <GatedLink href="/pricing" label="Pricing" status={pricingStatus} isAdmin={showAdmin} />}
            {recruiterSite && <GatedLink href="/about" label="About us" status={aboutStatus} isAdmin={showAdmin} />}
            {showDeveloperMenu && (blogStatus !== "hidden" || showAdmin) && (
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
            </NavGlide>
          </nav>

          {/* Utility island — divider + buttons flip with the bar state. */}
          <div className="nav-utils ml-1 flex h-8 items-center gap-2.5 border-l border-border pl-4 md:ml-5 md:pl-5 nav-divider">
            {/* Bell shows for any authenticated user — both candidates and
                recruiters get the same notification model (IP-40). The bell
                silently no-ops when unauthenticated (API returns 401). */}
            {user ? <NotificationBell /> : null}

            <ThemeToggle />

            {user ? (
              <UserMenu
                user={{ name: user.name, email: user.email, image: user.image }}
                isAdmin={showAdmin}
                isCreator={showCreator}
                recruiterSite={recruiterSite}
              />
            ) : (
              <Link
                href="/login"
                className="nav-signin inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-fg px-5 py-2 text-[13px] font-semibold text-bg transition-colors duration-200 hover:bg-fg/85 active:translate-y-px"
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

/** A top-level link that follows its admin nav setting, like the Blog link. */
function GatedLink({
  href,
  label,
  status,
  isAdmin,
}: {
  href: string;
  label: string;
  status: string;
  isAdmin: boolean;
}) {
  if (status === "hidden" && !isAdmin) return null;
  const soon = status === "coming_soon";
  return (
    <HeaderLink
      href={soon && !isAdmin ? `/coming-soon?feature=${encodeURIComponent(label)}` : href}
      matchPrefix={href}
      label={label}
      tone={soon ? "warn" : status === "hidden" ? "danger" : "default"}
      badge={soon ? "Soon" : status === "hidden" ? "Hidden" : undefined}
    />
  );
}
