import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AdminLink from "./AdminLink";

export const metadata = {
  title: "Admin — Interviewpad",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) notFound();

  return (
    <div className="bg-bg text-fg flex flex-col lg:flex-row overflow-hidden h-[calc(100vh-64px)]">
      {/* Premium Left Sidebar Dashboard Menu */}
      <aside className="w-full lg:w-60 shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-panel flex flex-col h-auto lg:h-full z-20">
        {/* Brand Header */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-bg font-black text-sm shrink-0">
              IP
            </div>
            <div>
              <div className="text-[9px] font-black tracking-[0.2em] text-muted uppercase leading-none">
                Internal
              </div>
              <h1 className="text-sm font-black tracking-tight mt-0.5">Admin Panel</h1>
            </div>
          </div>
          <Link
            href="/"
            className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-muted hover:text-fg hover:border-border-strong transition"
            title="Back to site"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Dynamic Sidebar Links */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="text-[9px] font-bold tracking-wider text-muted/55 uppercase px-3 mb-2">
            Core
          </div>
          <AdminLink href="/admin" icon="LayoutDashboard" label="Dashboard" />
          <AdminLink href="/admin/inbox" icon="Inbox" label="Inbox" />
          <AdminLink href="/admin/challenges" icon="Target" label="Challenges" />
          <AdminLink href="/admin/attempts" icon="Code2" label="Attempts" />
          <AdminLink href="/admin/interviews" icon="Briefcase" label="Interviews" />
          
          <div className="text-[9px] font-bold tracking-wider text-muted/55 uppercase px-3 pt-4 mb-2">
            Content & Users
          </div>
          <AdminLink href="/admin/snippets" icon="Pin" label="Trends" />
          <AdminLink href="/admin/users" icon="Users" label="Users" />
          <AdminLink href="/admin/blogs" icon="FileText" label="Blogs" />
          <AdminLink href="/admin/comments" icon="MessageCircle" label="Comments" />
          
          <div className="text-[9px] font-bold tracking-wider text-muted/55 uppercase px-3 pt-4 mb-2">
            System
          </div>
          <AdminLink href="/admin/settings" icon="Settings" label="Settings" />
        </nav>

        {/* Bottom Profile Details */}
        <div className="p-4 border-t border-border bg-elevated/20 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-mono font-bold text-xs uppercase shrink-0">
            {session?.user?.name?.[0] || session?.user?.email?.[0] || "A"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-fg truncate">
              {session?.user?.name || "Administrator"}
            </div>
            <div className="text-[10px] text-muted truncate leading-none mt-0.5">
              {session?.user?.email}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Scrollable Dashboard Content */}
      <main className="flex-1 h-full overflow-y-auto bg-surface">
        <div className="px-6 py-8 lg:px-10 lg:py-8 max-w-6xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
