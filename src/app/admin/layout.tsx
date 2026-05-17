import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Target, Users, FileText, ArrowLeft, Settings, Pin } from "lucide-react";

export const metadata = {
  title: "Admin — Interviewpad",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) notFound();

  return (
    <div className="min-h-screen bg-bg text-fg">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-muted hover:text-fg hover:border-border-strong transition"
              title="Back to site"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="text-[10px] font-black tracking-[0.2em] text-muted uppercase">
                Internal
              </div>
              <h1 className="text-xl font-black tracking-tight">Admin</h1>
            </div>
          </div>
          <div className="text-[10px] text-muted font-mono">
            signed in as {session?.user?.email}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
          <aside className="space-y-1">
            <AdminLink href="/admin" icon={LayoutDashboard} label="Dashboard" />
            <AdminLink href="/admin/challenges" icon={Target} label="Challenges" />
            {/* Tracks admin removed in Stage 2 — Tracks are now multi-step
                Challenges. Edit at /admin/challenges/[id]/edit. */}
            <AdminLink href="/admin/snippets" icon={Pin} label="Trends" />
            <AdminLink href="/admin/users" icon={Users} label="Users" />
            <AdminLink href="/admin/blogs" icon={FileText} label="Blogs" />
            <AdminLink href="/admin/settings" icon={Settings} label="Settings" />
          </aside>

          <section>{children}</section>
        </div>
      </div>
    </div>
  );
}

function AdminLink({
  href,
  icon: Icon,
  label,
  disabled,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-muted/30 cursor-not-allowed">
        <Icon className="w-4 h-4" />
        {label}
        <span className="ml-auto text-[9px] font-medium normal-case tracking-normal">soon</span>
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-muted hover:text-fg hover:bg-surface transition"
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}
