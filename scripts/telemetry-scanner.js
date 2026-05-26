const { PrismaClient } = require("@prisma/client");

async function runTelemetryScanner() {
  const prisma = new PrismaClient();
  try {
    console.log("[Scanner] Starting Platform Telemetry Scan...");

    // 1. Scan for Stalled Interview Sessions (>6 hours active)
    const staleCutoff = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const stalledSessions = await prisma.interviewSession.findMany({
      where: {
        status: "in_progress",
        startedAt: { lt: staleCutoff }
      }
    });

    console.log(`[Scanner] Found ${stalledSessions.length} stalled interview sessions.`);
    
    for (const session of stalledSessions) {
      // Check if unresolved alert already exists
      const existing = await prisma.gemmaAlert.findFirst({
        where: {
          targetId: session.id,
          type: "SYSTEM_STALL",
          status: "UNRESOLVED"
        }
      });

      if (!existing) {
        await prisma.gemmaAlert.create({
          data: {
            type: "SYSTEM_STALL",
            title: `Stalled Interview Session: ${session.title}`,
            body: `Candidate "${session.candidateName || "Anonymous"}" has been in an active session for over 6 hours (Started: ${session.startedAt ? session.startedAt.toISOString() : "Unknown"}). No code submission has been received.`,
            severity: "MEDIUM",
            targetId: session.id,
            proposedAction: JSON.stringify({
              actionType: "ARCHIVE_SESSION",
              targetId: session.id
            })
          }
        });
        console.log(`[Scanner] Created STALL alert for session ${session.id}`);
      }
    }

    // 2. Scan for Proctoring Integrity Anomalies (aiSuspicionScore >= 60)
    const suspiciousAttempts = await prisma.challengeAttempt.findMany({
      where: {
        aiSuspicionScore: { gte: 60 }
      },
      include: {
        user: true,
        challenge: true
      }
    });

    console.log(`[Scanner] Found ${suspiciousAttempts.length} suspicious proctoring attempts.`);

    for (const attempt of suspiciousAttempts) {
      if (!attempt.user) continue;

      const existing = await prisma.gemmaAlert.findFirst({
        where: {
          targetId: attempt.user.id,
          type: "INTEGRITY",
          status: "UNRESOLVED"
        }
      });

      if (!existing) {
        await prisma.gemmaAlert.create({
          data: {
            type: "INTEGRITY",
            title: `Proctoring Anomaly: ${attempt.user.name || attempt.user.email}`,
            body: `Candidate "${attempt.user.name || "Anonymous"}" (${attempt.user.email}) triggered a proctoring suspicion score of ${attempt.aiSuspicionScore}% during challenge attempt "${attempt.challenge.title}". High copy-paste or blur rates detected.`,
            severity: "CRITICAL",
            targetId: attempt.user.id,
            proposedAction: JSON.stringify({
              actionType: "BAN_USER",
              targetId: attempt.user.id
            })
          }
        });
        console.log(`[Scanner] Created INTEGRITY alert for user ${attempt.user.id}`);
      }
    }

    // 3. Scan for Pending Blog review queue
    const pendingBlogs = await prisma.blogPost.findMany({
      where: {
        status: "PENDING"
      },
      include: {
        user: true
      }
    });

    console.log(`[Scanner] Found ${pendingBlogs.length} blog posts pending review.`);

    for (const post of pendingBlogs) {
      const existing = await prisma.gemmaAlert.findFirst({
        where: {
          targetId: post.id,
          type: "MODERATION",
          status: "UNRESOLVED"
        }
      });

      if (!existing) {
        await prisma.gemmaAlert.create({
          data: {
            type: "MODERATION",
            title: `Moderation Required: "${post.title}"`,
            body: `Blog post "${post.title}" submitted by "${post.user?.name || "Anonymous"}" is awaiting moderation approval. Review required against platform affiliate guidelines.`,
            severity: "MEDIUM",
            targetId: post.id,
            proposedAction: JSON.stringify({
              actionType: "MODERATE_BLOG",
              targetId: post.id
            })
          }
        });
        console.log(`[Scanner] Created MODERATION alert for blog ${post.id}`);
      }
    }

    // 4. Scan for stale AdminTodo entries — BACKLOG items >14 days old.
    const staleTodoCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const staleTodos = await prisma.adminTodo.findMany({
      where: { status: "BACKLOG", createdAt: { lt: staleTodoCutoff } },
      orderBy: { createdAt: "asc" },
      take: 25,
    });
    console.log(`[Scanner] Found ${staleTodos.length} stale backlog todos.`);
    for (const todo of staleTodos) {
      const existing = await prisma.gemmaAlert.findFirst({
        where: { targetId: todo.id, type: "BACKLOG", status: "UNRESOLVED" },
      });
      if (!existing) {
        const ageDays = Math.floor((Date.now() - todo.createdAt.getTime()) / (24 * 60 * 60 * 1000));
        await prisma.gemmaAlert.create({
          data: {
            type: "BACKLOG",
            title: `Stale backlog ticket: ${todo.ticketKey || todo.id}`,
            body: `"${todo.title}" has been sitting in BACKLOG for ${ageDays} days. Promote to TODO or close it out.`,
            severity: "LOW",
            targetId: todo.id,
            proposedAction: JSON.stringify({
              actionType: "UPDATE_TODO_STATUS",
              targetId: todo.id,
              meta: { newStatus: "TODO" },
            }),
          },
        });
        console.log(`[Scanner] Created BACKLOG alert for todo ${todo.ticketKey || todo.id}`);
      }
    }

    // 5. Scan for comment spam — >8 comments in the last hour by one user.
    const spamCutoff = new Date(Date.now() - 60 * 60 * 1000);
    const recentComments = await prisma.blogComment.findMany({
      where: { createdAt: { gte: spamCutoff } },
      select: { id: true, userId: true, content: true, postId: true },
    });
    const byUser = new Map();
    for (const c of recentComments) {
      const arr = byUser.get(c.userId) || [];
      arr.push(c);
      byUser.set(c.userId, arr);
    }
    let spamUsers = 0;
    for (const [userId, comments] of byUser.entries()) {
      if (comments.length <= 8) continue;
      spamUsers++;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, banned: true },
      });
      if (user && user.banned) continue;
      for (const c of comments) {
        const existing = await prisma.gemmaAlert.findFirst({
          where: { targetId: c.id, type: "SPAM", status: "UNRESOLVED" },
        });
        if (existing) continue;
        await prisma.gemmaAlert.create({
          data: {
            type: "SPAM",
            title: `Comment spam burst: ${(user && user.name) || "Anonymous"}`,
            body: `User posted ${comments.length} comments in the last hour. Excerpt: "${c.content.slice(0, 140)}${c.content.length > 140 ? "…" : ""}"`,
            severity: "HIGH",
            targetId: c.id,
            proposedAction: JSON.stringify({
              actionType: "DELETE_COMMENT",
              targetId: c.id,
            }),
          },
        });
        console.log(`[Scanner] Created SPAM alert for comment ${c.id}`);
      }
    }
    console.log(`[Scanner] Found ${spamUsers} user(s) over the spam threshold.`);

    console.log("[Scanner] Telemetry Scan Completed Successfully.");
  } catch (error) {
    console.error("[Scanner] Error during telemetry scan:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run scanner if called directly from shell
if (require.main === module) {
  runTelemetryScanner();
}

module.exports = { runTelemetryScanner };
