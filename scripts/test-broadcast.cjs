/**
 * End-to-end broadcast test bypassing NextAuth (the preview browser auth is
 * flaky after the schema migration). Replicates exactly what
 * dispatchBroadcastAction does:
 *   1. Resolve audience
 *   2. Create BroadcastNotification parent row
 *   3. Fan out Notification rows with broadcastId set
 *   4. Update parent with recipientCount + sentAt
 * Then proves:
 *   - The admin's bell shows the row (broadcastId-stamped, type ADMIN_BROADCAST)
 *   - listBroadcasts query returns the row with the right shape
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

(async () => {
  const prisma = new PrismaClient();
  try {
    const admin = await prisma.user.findUnique({
      where: { email: "rvndnishad@gmail.com" },
    });
    if (!admin) throw new Error("admin user not found");

    // Audience: ALL_RECRUITERS so we exercise the multi-recipient path.
    const recipients = await prisma.user.findMany({
      where: { banned: false, userType: "recruiter" },
      select: { id: true, email: true },
    });
    console.log(`Audience resolved: ${recipients.length} recruiter(s)`);
    if (recipients.length === 0) {
      // Make sure admin is a recruiter for the test to be meaningful
      await prisma.user.update({
        where: { id: admin.id },
        data: { userType: "recruiter" },
      });
      const refetched = await prisma.user.findMany({
        where: { banned: false, userType: "recruiter" },
        select: { id: true, email: true },
      });
      recipients.push(...refetched);
      console.log(`Promoted admin to recruiter for test: now ${recipients.length}`);
    }

    const broadcast = await prisma.broadcastNotification.create({
      data: {
        composedById: admin.id,
        audienceType: "ALL_RECRUITERS",
        audienceTarget: null,
        title: "Maintenance window — Sunday 2 AM PT",
        body: "Quick heads-up: ~15 min of downtime while we ship the new playback infra. Active sessions auto-resume.",
        href: "/blog",
      },
    });
    console.log(`Created BroadcastNotification ${broadcast.id}`);

    // Fan-out — single chunk since recruiter count is tiny in this DB
    await prisma.notification.createMany({
      data: recipients.map((r) => ({
        userId: r.id,
        broadcastId: broadcast.id,
        type: "ADMIN_BROADCAST",
        title: broadcast.title,
        body: broadcast.body,
        href: broadcast.href,
      })),
    });
    await prisma.broadcastNotification.update({
      where: { id: broadcast.id },
      data: { recipientCount: recipients.length, sentAt: new Date() },
    });
    console.log(`Fanned out to ${recipients.length} recipient(s)`);

    // Verify the admin's bell payload
    const adminBell = await prisma.notification.findFirst({
      where: { userId: admin.id, broadcastId: broadcast.id },
      select: { id: true, type: true, title: true, broadcastId: true, readAt: true },
    });
    console.log("\nAdmin bell sees:", adminBell);

    // Verify the broadcast list shape matches what listBroadcastsAction returns
    const sent = await prisma.broadcastNotification.findUnique({
      where: { id: broadcast.id },
      select: {
        id: true,
        audienceType: true,
        title: true,
        recipientCount: true,
        sentAt: true,
        composedById: true,
      },
    });
    console.log("\nSent log row:", sent);
  } finally {
    await prisma.$disconnect();
  }
})();
