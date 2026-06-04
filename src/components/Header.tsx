import Link from "next/link";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getPrimaryWorkspaceSlug } from "@/lib/workspace-nav";
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
  const showAdmin = isAdmin(session);

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

  const recruiterItems = [
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

  return (
    <header className="sticky top-0 z-[100] bg-surface/80 backdrop-blur-xl border-b border-border relative">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between gap-3">
        {/* Mobile: logo doubles as menu trigger (collapsed into MobileNav) */}
        <MobileNav
          signedIn={!!user}
          isAdmin={showAdmin}
          developerItems={developerItems}
          recruiterItems={recruiterItems}
        />

        {/* Desktop: logo links to home */}
        <HeaderLogo />

        {/* Navigation & Auth */}
        <div className="flex items-center gap-4">
          <nav className="flex items-center">
            <div className="hidden md:flex items-center gap-6 text-sm font-medium mr-6 border-r border-border pr-6 h-16">
              <NavDropdown label="For Developers" items={developerItems} />
              <NavDropdown label="For Recruiters" items={recruiterItems} />

              <Link
                href="/blog"
                className="transition-colors flex items-center h-full text-fg/50 hover:text-fg"
              >
                <span className="relative flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  Blog
                </span>
              </Link>

              <Link
                href="/pricing"
                className="transition-colors flex items-center h-full text-fg/50 hover:text-fg"
              >
                <span className="relative flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  Pricing
                </span>
              </Link>
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
