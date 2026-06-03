import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Fail closed: refuse to run if no CRON_SECRET is configured. Vercel
    // Cron automatically attaches the Authorization header with this env var
    // value when invoking us; manual triggers can pass ?token=... instead.
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error("[Cron Telemetry] CRON_SECRET is not configured — refusing to run.");
      return NextResponse.json(
        { error: "Server misconfigured: CRON_SECRET not set." },
        { status: 503 }
      );
    }

    const authHeader = req.headers.get("authorization");
    const token = req.nextUrl.searchParams.get("token");
    if (authHeader !== `Bearer ${cronSecret}` && token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized: Invalid cron secret token." }, { status: 401 });
    }

    console.log("[Cron] Triggering platform telemetry scan...");

    let createdAlerts = 0;

    // 1. Scan for Stalled Sessions (>6 hours)
    const staleCutoff = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const stalledSessions = await prisma.interviewSession.findMany({
      where: {
        status: "in_progress",
        startedAt: { lt: staleCutoff }
      }
    });

    for (const session of stalledSessions) {
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
            body: `Candidate "${session.candidateName || "Anonymous"}" has been in an active session for over 6 hours. No code submission has been received.`,
            severity: "MEDIUM",
            targetId: session.id,
            proposedAction: JSON.stringify({
              actionType: "ARCHIVE_SESSION",
              targetId: session.id
            })
          }
        });
        createdAlerts++;
      }
    }

    // 2. Scan for Proctoring Anomalies (aiSuspicionScore >= 60)
    const suspiciousAttempts = await prisma.challengeAttempt.findMany({
      where: {
        aiSuspicionScore: { gte: 60 }
      },
      include: {
        user: true,
        challenge: true
      }
    });

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
        createdAlerts++;
      }
    }

    // 3. Scan for Pending Blogs
    const pendingBlogs = await prisma.blogPost.findMany({
      where: { status: "PENDING" },
      include: { user: true }
    });

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
        createdAlerts++;
      }
    }

    // 4. Scan for stale AdminTodo entries — BACKLOG items >14 days old. Surfaces
    // as a low-severity nudge with a proposed UPDATE_TODO_STATUS → TODO action
    // so the admin can promote with one click (or dismiss to keep marinating).
    const staleTodoCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const staleTodos = await prisma.adminTodo.findMany({
      where: { status: "BACKLOG", createdAt: { lt: staleTodoCutoff } },
      orderBy: { createdAt: "asc" },
      take: 25,
    });
    for (const todo of staleTodos) {
      const existing = await prisma.gemmaAlert.findFirst({
        where: { targetId: todo.id, type: "BACKLOG", status: "UNRESOLVED" },
      });
      if (!existing) {
        const ageDays = Math.floor((Date.now() - todo.createdAt.getTime()) / (24 * 60 * 60 * 1000));
        await prisma.gemmaAlert.create({
          data: {
            type: "BACKLOG",
            title: `Stale backlog ticket: ${todo.ticketKey ?? todo.id}`,
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
        createdAlerts++;
      }
    }

    // 5. Scan for comment spam — any user posting >8 comments in the last hour
    // is almost certainly spamming. Surface DELETE_COMMENT proposals on each
    // offending comment so the admin can sweep them quickly.
    const spamCutoff = new Date(Date.now() - 60 * 60 * 1000);
    const recentComments = await prisma.blogComment.findMany({
      where: { createdAt: { gte: spamCutoff } },
      select: { id: true, userId: true, content: true, postId: true },
    });
    const byUser = new Map<string, typeof recentComments>();
    for (const c of recentComments) {
      const arr = byUser.get(c.userId) ?? [];
      arr.push(c);
      byUser.set(c.userId, arr);
    }
    for (const [userId, comments] of byUser.entries()) {
      if (comments.length <= 8) continue;
      // Pull the user once for nicer alert copy.
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, banned: true },
      });
      if (user?.banned) continue; // already handled
      for (const c of comments) {
        const existing = await prisma.gemmaAlert.findFirst({
          where: { targetId: c.id, type: "SPAM", status: "UNRESOLVED" },
        });
        if (existing) continue;
        await prisma.gemmaAlert.create({
          data: {
            type: "SPAM",
            title: `Comment spam burst: ${user?.name || "Anonymous"}`,
            body: `User posted ${comments.length} comments in the last hour. Excerpt: "${c.content.slice(0, 140)}${c.content.length > 140 ? "…" : ""}"`,
            severity: "HIGH",
            targetId: c.id,
            proposedAction: JSON.stringify({
              actionType: "DELETE_COMMENT",
              targetId: c.id,
            }),
          },
        });
        createdAlerts++;
      }
    }

    return NextResponse.json({
      success: true, 
      scannedAt: new Date().toISOString(),
      createdAlerts 
    });
  } catch (error: any) {
    console.error("Cron Telemetry route error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
