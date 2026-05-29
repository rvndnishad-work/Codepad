import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SecurityClient from "./SecurityClient";

export const metadata = {
  title: "Security — Interviewpad",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ enroll?: string }>;
};

export default async function SecurityPage({ searchParams }: Props) {
  const { enroll } = await searchParams;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/profile/security");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      totpEnabledAt: true,
      totpSecret: true,
      totpBackupCodes: true,
    },
  });

  let unusedBackupCodes = 0;
  if (user?.totpBackupCodes) {
    try {
      const parsed = JSON.parse(user.totpBackupCodes);
      if (Array.isArray(parsed)) {
        unusedBackupCodes = parsed.filter((c) => c && c.usedAt === null).length;
      }
    } catch {
      unusedBackupCodes = 0;
    }
  }

  // Last 10 audit events for transparency — the user can see their own 2FA
  // history without needing admin access.
  const recentEvents = await prisma.securityAuditLog.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, event: true, createdAt: true, ip: true, userAgent: true },
  });

  return (
    <SecurityClient
      email={user?.email ?? null}
      required={enroll === "required"}
      enrolled={!!user?.totpEnabledAt}
      enabledAt={user?.totpEnabledAt?.toISOString() ?? null}
      pendingEnrollment={!!user?.totpSecret && !user?.totpEnabledAt}
      unusedBackupCodes={unusedBackupCodes}
      recentEvents={recentEvents.map((e) => ({
        id: e.id,
        event: e.event,
        createdAt: e.createdAt.toISOString(),
        ip: e.ip,
        userAgent: e.userAgent,
      }))}
    />
  );
}
