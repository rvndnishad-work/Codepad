import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { ensureTotpEnrolledOrRedirect } from "@/lib/totp-gate";
import { notFound } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import FloatingJarvisAgent from "./FloatingJarvisAgent";
import { getAdminPersona } from "@/lib/admin-persona.server";

export const metadata = {
  title: "Admin — Interviewpad",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) notFound();

  // IP-42 AC #6: admins must carry a second factor before reaching the console.
  if (session?.user?.id) {
    await ensureTotpEnrolledOrRedirect(session.user.id, true);
  }

  // Persona is read once in the layout so the server-rendered sidebar matches
  // the cookie on first paint — no client-side flicker between defaults.
  const persona = await getAdminPersona();

  return (
    <div className="bg-bg text-fg flex flex-col lg:flex-row overflow-hidden h-[calc(100vh-64px)] relative">
      {/* Background ambient spotlight glows */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-fuchsia-500/5 rounded-full blur-[150px] pointer-events-none z-0" />

      {/* Dynamic Collapsible & Frosted Navigation Sidebar */}
      <AdminSidebar session={session} persona={persona} />

      {/* Main Scrollable Dashboard Content */}
      <main className="flex-1 h-full overflow-y-auto bg-surface relative z-10">
        <div className="px-6 py-8 lg:px-10 lg:py-8 max-w-6xl mx-auto w-full">
          {children}
        </div>
        <FloatingJarvisAgent />
      </main>
    </div>
  );
}
