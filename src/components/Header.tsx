import Link from "next/link";
import Image from "next/image";
import { auth, signOut } from "@/lib/auth";
import { LogoMark } from "./Logo";

export default async function Header() {
  const session = await auth().catch(() => null);
  const user = session?.user;

  return (
    <header className="border-b border-border bg-bg/75 backdrop-blur-xl sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <LogoMark size={26} className="shrink-0" />
          <span className="font-semibold tracking-tight text-fg">Codepad</span>
          <span className="hidden sm:inline text-[10px] font-medium px-1.5 py-0.5 rounded border border-border text-muted">
            beta
          </span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/"
            className="hidden sm:inline px-3 py-1.5 rounded-md text-subtle hover:text-fg hover:bg-panel transition"
          >
            Templates
          </Link>
          <Link
            href="/explore"
            className="hidden sm:inline px-3 py-1.5 rounded-md text-subtle hover:text-fg hover:bg-panel transition"
          >
            Explore
          </Link>
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-md text-subtle hover:text-fg hover:bg-panel transition"
              >
                My snippets
              </Link>
              <div className="flex items-center gap-2 pl-2 ml-1 border-l border-border">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name ?? ""}
                    width={28}
                    height={28}
                    className="rounded-full border border-border"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-panel border border-border grid place-items-center text-xs">
                    {(user.name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <button className="text-xs text-muted hover:text-fg px-2 py-1">
                    Sign out
                  </button>
                </form>
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-md bg-accent hover:bg-accent-soft text-white text-sm shadow-soft transition"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
