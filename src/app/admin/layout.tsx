import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { notFound } from "next/navigation";
import AdminSidebar from "./AdminSidebar";

export const metadata = {
  title: "Admin — Interviewpad",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) notFound();

  return (
    <div className="bg-bg text-fg flex flex-col lg:flex-row overflow-hidden h-[calc(100vh-64px)] relative">
      {/* Background ambient spotlight glows */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-fuchsia-500/5 rounded-full blur-[150px] pointer-events-none z-0" />

      {/* Dynamic Collapsible & Frosted Navigation Sidebar */}
      <AdminSidebar session={session} />

      {/* Main Scrollable Dashboard Content */}
      <main className="flex-1 h-full overflow-y-auto bg-surface relative z-10">
        <div className="px-6 py-8 lg:px-10 lg:py-8 max-w-6xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
