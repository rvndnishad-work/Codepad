import Link from "next/link";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { LogoMark } from "./Logo";

import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";
import MobileNav from "./MobileNav";

export default async function Header() {
  const session = await auth().catch(() => null);
  const user = session?.user;
  const showAdmin = isAdmin(session);

  return (
    <header className="sticky top-0 z-[100] bg-bg/80 backdrop-blur-xl border-b border-border relative">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between gap-3">

        {/* Mobile: logo doubles as menu trigger (collapsed into MobileNav) */}
        <MobileNav signedIn={!!user} isAdmin={showAdmin} />

        {/* Desktop: logo links to home */}
        <Link href="/" className="hidden md:flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-soft grid place-items-center shadow-[0_0_15px_rgba(var(--accent-rgb),0.18)] transition-transform group-hover:scale-105">
            <LogoMark size={18} className="text-bg" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-bold text-lg tracking-tight text-fg group-hover:text-fg/90 transition-colors">
              Interviewpad<span className="text-fg/30 font-normal">.in</span>
            </span>
          </div>
        </Link>

        {/* Navigation & Auth */}
        <div className="flex items-center gap-4">
          <nav className="flex items-center">
            <div className="hidden md:flex items-center gap-6 text-sm font-medium mr-6 border-r border-border pr-6 h-16">
              <Link href="/" className="text-fg/50 hover:text-fg transition-colors">Templates</Link>
              <Link href="/challenges" className="text-fg/50 hover:text-fg transition-colors">Challenges</Link>
              <Link href="/blog" className="text-fg/50 hover:text-fg transition-colors">Blog</Link>
              <Link href="/explore" className="text-fg/50 hover:text-fg transition-colors">Explore</Link>
              {user && (
                <Link href="/interview/new" className="text-fg/50 hover:text-fg transition-colors">Interviews</Link>
              )}
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
