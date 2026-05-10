import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { LogoMark } from "./Logo";
import { handleSignOut } from "@/app/actions";

import ThemeToggle from "./ThemeToggle";

export default async function Header() {
  const session = await auth().catch(() => null);
  const user = session?.user;

  return (
    <header className="sticky top-0 z-[100] bg-bg/80 backdrop-blur-xl border-b border-border">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
        
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-[#FF9900] grid place-items-center shadow-[0_0_15px_rgba(255,230,0,0.15)] transition-transform group-hover:scale-105">
             <LogoMark size={18} className="text-black" />
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
              <Link href="/explore" className="text-fg/50 hover:text-fg transition-colors">Explore</Link>
              {user && (
                <>
                  <Link href="/dashboard" className="text-fg/50 hover:text-fg transition-colors">My Snippets</Link>
                  <Link href="/profile" className="text-fg/50 hover:text-fg transition-colors">Profile</Link>
                </>
              )}
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              
              <div className="flex items-center gap-4 pl-4 border-l border-border h-8">
                {user ? (
                  <div className="flex items-center gap-4">
                    <form action={handleSignOut}>
                      <button className="text-sm font-medium text-fg/40 hover:text-fg transition-colors">
                        Sign out
                      </button>
                    </form>
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.name ?? ""}
                        width={32}
                        height={32}
                        className="rounded-full ring-1 ring-border hover:ring-accent/30 transition-all cursor-pointer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-surface border border-border grid place-items-center text-xs font-semibold text-fg/80 cursor-pointer hover:bg-elevated transition-colors">
                        {(user.name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="px-4 py-2 rounded-lg bg-fg text-bg text-sm font-semibold hover:bg-fg/90 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95"
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
