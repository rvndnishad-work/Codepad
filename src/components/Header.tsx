import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { LogoMark } from "./Logo";
import { handleSignOut } from "@/app/actions";

export default async function Header() {
  const session = await auth().catch(() => null);
  const user = session?.user;

  return (
    <header className="sticky top-0 z-[100] bg-[#050505]/80 backdrop-blur-xl border-b border-white/[0.04]">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
        
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FFE600] to-[#FF9900] grid place-items-center shadow-[0_0_15px_rgba(255,230,0,0.15)] transition-transform group-hover:scale-105">
             <LogoMark size={18} className="text-black" />
          </div>
          <div className="flex flex-col leading-none">
             <span className="font-bold text-lg tracking-tight text-white group-hover:text-white/90 transition-colors">
               Codepad<span className="text-white/30 font-normal">.app</span>
             </span>
          </div>
        </Link>

        {/* Navigation & Auth */}
        <nav className="flex items-center">
          <div className="hidden md:flex items-center gap-6 text-sm font-medium mr-6">
            <Link href="/" className="text-white/50 hover:text-white transition-colors">Templates</Link>
            <Link href="/explore" className="text-white/50 hover:text-white transition-colors">Explore</Link>
            {user && (
              <>
                <Link href="/dashboard" className="text-white/50 hover:text-white transition-colors">My Snippets</Link>
                <Link href="/profile" className="text-white/50 hover:text-white transition-colors">Profile</Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-4 md:pl-6 md:border-l border-white/[0.08]">
            {user ? (
              <div className="flex items-center gap-4">
                <form action={handleSignOut}>
                  <button className="text-sm font-medium text-white/40 hover:text-white transition-colors">
                    Sign out
                  </button>
                </form>
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name ?? ""}
                    width={32}
                    height={32}
                    className="rounded-full ring-1 ring-white/10 hover:ring-white/30 transition-all cursor-pointer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 grid place-items-center text-xs font-semibold text-white/80 cursor-pointer hover:bg-white/10 transition-colors">
                    {(user.name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95"
              >
                Sign In
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
