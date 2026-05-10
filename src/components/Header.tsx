import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { LogoMark } from "./Logo";
import { handleSignOut } from "@/app/actions";

export default async function Header() {
  const session = await auth().catch(() => null);
  const user = session?.user;

  return (
    <header className="relative border-b border-white/[0.05] bg-black/60 backdrop-blur-3xl sticky top-0 z-[100]">
      {/* Bottom Glow Separator */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#FFE600]/20 to-transparent opacity-50" />
      
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-xl bg-[#FFE600] grid place-items-center shadow-[0_0_20px_rgba(255,230,0,0.3)] transition-transform group-hover:scale-110 group-hover:rotate-3">
             <LogoMark size={20} className="text-black" />
          </div>
          <div className="flex flex-col leading-none">
             <span className="font-black text-lg tracking-tighter text-white group-hover:text-[#FFE600] transition-colors">Codepad</span>
             <span className="text-[9px] font-bold text-white/20 uppercase tracking-[0.3em]">Pro Sandbox</span>
          </div>
        </Link>

        <nav className="flex items-center gap-1.5">
          <Link
            href="/"
            className="hidden sm:inline px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-[#FFE600] hover:bg-white/5 transition-all"
          >
            Templates
          </Link>
          <Link
            href="/explore"
            className="hidden sm:inline px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-[#FFE600] hover:bg-white/5 transition-all"
          >
            Explore
          </Link>
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-[#FFE600] hover:bg-white/5 transition-all"
              >
                My snippets
              </Link>
              <Link
                href="/profile"
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-[#FFE600] hover:bg-white/5 transition-all"
              >
                Profile
              </Link>
              <div className="flex items-center gap-3 pl-3 ml-2 border-l border-white/5">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name ?? ""}
                    width={32}
                    height={32}
                    className="rounded-xl border border-[#FFE600]/20 shadow-[0_0_15px_rgba(255,230,0,0.1)]"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 grid place-items-center text-[10px] font-black text-white/60">
                    {(user.name ?? user.email ?? "N").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <form action={handleSignOut}>
                  <button className="text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-red-400 px-3 py-1.5 transition-colors">
                    Sign out
                  </button>
                </form>
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-xl bg-[#FFE600] text-black text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(255,230,0,0.2)] hover:scale-105 active:scale-95 transition-all"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
