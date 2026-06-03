const { PrismaClient } = require("@prisma/client");
require("dotenv").config();
(async () => {
  const p = new PrismaClient();
  try {
    const u = await p.user.findUnique({ where: { email: "rvndnishad@gmail.com" } });
    const ws = await p.workspace.findFirst({ where: { slug: "vercel-engineering" }, select: { id: true, slug: true } });
    const rows = [
      { type: "TAKE_HOME_SUBMITTED", title: "Devansh K. submitted Paginated Todo Challenge", body: "Take-home submission is in — open it to review the attempt.", href: `/w/${ws.slug}/candidates/probe-cand`, payload: { takeHomeId: "th_probe", candidateId: "cand_probe" } },
      { type: "INTERVIEW_REPLAY_READY", title: 'Replay ready: "Senior FE — React + TS"', body: "Telemetry and timeline are queued — open the session to review.", href: "/interview/iv_probe_1", payload: { sessionId: "iv_probe_1" } },
      { type: "SCORECARD_REQUESTED", title: 'Scorecard needed: "Senior FE — React + TS"', body: "Session is complete but no rubric is saved yet.", href: "/interview/iv_probe_1", payload: { sessionId: "iv_probe_1" } },
      { type: "PROMPT_UPVOTED", title: "Your shared prompt was upvoted", body: '"Refactor a vague spec into testable requirements" — now at 7 upvotes.', href: "/interview/prompt-practice?attempt=pa_probe", payload: { attemptId: "pa_probe", newCount: 7 } },
      { type: "AI_CREDITS_LOW", title: "AI credits running low (3 remaining)", body: "Roughly 3 sessions remaining. Top up to avoid interruption.", href: `/w/${ws.slug}/ai-interviews`, payload: { workspaceId: ws.id, balance: 3 } },
    ];
    for (const r of rows) {
      await p.notification.create({ data: { userId: u.id, type: r.type, title: r.title, body: r.body, href: r.href, payload: JSON.stringify(r.payload) } });
    }
    const count = await p.notification.count({ where: { userId: u.id, readAt: null, dismissedAt: null } });
    console.log(`Probed ${rows.length} trigger types. Unread now: ${count}`);
    const all = await p.notification.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, select: { type: true } });
    console.log("Types now in user's bell:", all.map(n => n.type));
  } finally { await p.$disconnect(); }
})();
