/**
 * Seed 4 sample notifications for the admin user — used for IP-40 visual
 * verification. Re-running the script appends another batch (idempotency
 * isn't important for a demo seeder).
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

(async () => {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst({
      where: { email: "rvndnishad@gmail.com" },
    });
    if (!user) throw new Error("Admin user not found.");

    const samples = [
      {
        type: "INTERVIEW_SCHEDULED",
        title: "Live interview scheduled with Priya M.",
        body: "Tomorrow, 4:30 PM — Front-end Screen (React + TypeScript). Calendar invite sent.",
        href: "/interview",
        payload: { candidate: "Priya M.", durationMin: 60 },
        ageMs: 5 * 60_000,
      },
      {
        type: "TAKE_HOME_EXPIRING",
        title: "Take-home expiring in 18h",
        body: "Devansh K. hasn't submitted the Paginated Todo challenge yet. Send a reminder?",
        href: "/w/vercel-engineering",
        payload: { hoursLeft: 18 },
        ageMs: 35 * 60_000,
      },
      {
        type: "INTERVIEW_REPLAY_READY",
        title: "Replay ready: \"Backend systems screen\"",
        body: "Telemetry + scorecard draft attached. Average focus retention: 94%.",
        href: "/interview",
        payload: { focusRetention: 0.94 },
        ageMs: 3 * 60 * 60_000,
      },
      {
        type: "AI_CREDITS_LOW",
        title: "AI screening credits running low",
        body: "Vercel Engineering has 12 credits left (~3 sessions). Top up to avoid interruption.",
        href: "/w/vercel-engineering/ai-interviews",
        payload: { remaining: 12 },
        ageMs: 26 * 60 * 60_000,
        readAt: new Date(Date.now() - 60_000), // pre-read so we can see read state
      },
    ];

    for (const s of samples) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: s.type,
          title: s.title,
          body: s.body,
          href: s.href,
          payload: JSON.stringify(s.payload),
          createdAt: new Date(Date.now() - s.ageMs),
          readAt: s.readAt ?? null,
        },
      });
    }

    const unread = await prisma.notification.count({
      where: { userId: user.id, readAt: null, dismissedAt: null },
    });
    console.log(`Seeded ${samples.length} notifications. Unread now: ${unread}`);
  } finally {
    await prisma.$disconnect();
  }
})();
