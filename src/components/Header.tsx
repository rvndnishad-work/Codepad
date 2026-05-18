import Link from "next/link";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import HeaderLogo from "./HeaderLogo";

import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";
import MobileNav from "./MobileNav";
import { getNavLinks } from "@/lib/settings";

export default async function Header() {
  const session = await auth().catch(() => null);
  const user = session?.user;
  const showAdmin = isAdmin(session);
  const navLinks = await getNavLinks();

  return (
    <header className="sticky top-0 z-[100] bg-bg/80 backdrop-blur-xl border-b border-border relative">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between gap-3">

        {/* Mobile: logo doubles as menu trigger (collapsed into MobileNav) */}
        <MobileNav signedIn={!!user} isAdmin={showAdmin} navLinks={navLinks} />

        {/* Desktop: logo links to home */}
        <HeaderLogo />

        {/* Navigation & Auth */}
        <div className="flex items-center gap-4">
          <nav className="flex items-center">
            <div className="hidden md:flex items-center gap-6 text-sm font-medium mr-6 border-r border-border pr-6 h-16">
              {navLinks.map((link) => {
                if (link.href === "/interview" && !user) return null;

                const isHidden = link.status === "hidden";
                const isComingSoon = link.status === "coming_soon";

                // Admins see everything, but with a badge
                if (isHidden && !showAdmin) return null;

                const content = (
                  <span className="relative flex items-center gap-1.5">
                    {link.label}
                    {(isComingSoon || isHidden) && showAdmin && (
                      <span
                        className={`text-[8px] px-1 rounded uppercase font-black ${
                          isHidden ? "bg-rose-500/20 text-rose-500" : "bg-amber-500/20 text-amber-500"
                        }`}
                      >
                        {isHidden ? "Hidden" : "Soon"}
                      </span>
                    )}
                    {isComingSoon && !showAdmin && (
                      <span className="text-[8px] px-1 rounded uppercase font-black bg-amber-500/10 text-amber-600/60">
                        Soon
                      </span>
                    )}
                  </span>
                );

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`transition-colors flex items-center h-full ${
                      isHidden || (isComingSoon && !showAdmin) ? "text-fg/40 hover:text-fg/60" : "text-fg/50 hover:text-fg"
                    }`}
                  >
                    {content}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />

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
