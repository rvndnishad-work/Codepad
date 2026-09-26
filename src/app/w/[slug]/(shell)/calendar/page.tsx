/**
 * Calendar connections: each member connects their own Google or Outlook
 * calendar. The interview wizard then shows their busy times, and the
 * interview event goes on the organiser's calendar.
 */
import { notFound, redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMember } from "@/lib/permissions";
import { calendarProvidersConfigured } from "@/lib/calendar/server";
import CalendarConnectionsClient, { type MemberRow } from "./CalendarConnectionsClient";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `Calendar · ${slug} — Interviewpad`, robots: { index: false, follow: false } };
}

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ connected?: string; error?: string }> };

export default async function CalendarPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect(`/login?next=${encodeURIComponent(`/w/${slug}/calendar`)}`);

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      members: {
        select: { userId: true, role: true, permissions: true, user: { select: { name: true, email: true } } },
        orderBy: { id: "asc" },
      },
      calendarConnections: { select: { userId: true, provider: true, email: true, status: true, updatedAt: true } },
    },
  });
  if (!workspace) notFound();
  const me = workspace.members.find((m) => m.userId === session.user.id);
  if (!me) redirect("/dashboard");

  const rows: MemberRow[] = workspace.members
    .filter((m) => m.role !== "VIEWER")
    .map((m): MemberRow => {
      const c = workspace.calendarConnections.find((x) => x.userId === m.userId);
      return {
        userId: m.userId,
        name: m.user.name || m.user.email || "Member",
        email: m.user.email ?? "",
        connection: c ? { provider: c.provider === "microsoft" ? "microsoft" : "google", email: c.email, status: c.status === "expired" ? "expired" : "active", since: c.updatedAt.toISOString() } : null,
      };
    })
    .sort((a, b) => (a.userId === session.user.id ? -1 : b.userId === session.user.id ? 1 : 0));

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-5">
        <div className="text-xs font-semibold text-secondary/80 flex items-center gap-1.5">
          <CalendarDays className="w-3 h-3" aria-hidden /> Connections
        </div>
        <h1 className="text-2xl md:text-[26px] font-semibold tracking-[-0.02em] text-fg">Calendar</h1>
        <p className="text-[15px] text-muted mt-1.5 max-w-2xl">
          Each interviewer connects their own Google or Outlook calendar. When you schedule an interview, you see when they are busy, and the interview can go on the
          organiser&apos;s calendar with the room link. We only look at free and busy times, never event titles or details.
        </p>
      </div>
      <CalendarConnectionsClient
        slug={slug}
        meId={session.user.id}
        canManage={await canMember(me, "integration:manage")}
        configured={calendarProvidersConfigured()}
        rows={rows}
        flash={sp.connected ? { tone: "ok", provider: sp.connected } : sp.error ? { tone: "error", code: sp.error.slice(0, 40) } : null}
      />
    </div>
  );
}
