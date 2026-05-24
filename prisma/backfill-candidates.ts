/**
 * Backfill the new Candidate model from existing TakeHomeAssignment + InterviewSession rows.
 *
 * Run with: npx tsx prisma/backfill-candidates.ts
 *
 * Idempotent: upserts candidates by (workspaceId, email) — re-runnable safely.
 *
 * After running, every TakeHomeAssignment and InterviewSession that had inline
 * candidateName/email data will be linked to a real Candidate row via candidateId.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Backfilling Candidate records from existing data…\n");

  const workspaces = await prisma.workspace.findMany({ select: { id: true, name: true } });

  let createdCount = 0;
  let updatedCount = 0;
  let linkedTakeHomes = 0;
  let linkedSessions = 0;

  for (const ws of workspaces) {
    console.log(`  workspace: ${ws.name} (${ws.id})`);

    // 1. Pull all take-home rows for this workspace
    const takeHomes = await prisma.takeHomeAssignment.findMany({
      where: { workspaceId: ws.id },
      select: { id: true, candidateName: true, candidateEmail: true, candidateId: true },
    });

    // 2. Pull all session rows for this workspace that have a candidateName
    const sessions = await prisma.interviewSession.findMany({
      where: { workspaceId: ws.id, candidateName: { not: null } },
      select: { id: true, candidateName: true, candidateId: true },
    });

    // 3. Build the dedup map. Prefer email as the key (more reliable);
    //    fall back to a lowercased name when no email exists.
    type Aggregate = {
      key: string;
      name: string;
      email: string | null;
      takeHomeIds: string[];
      sessionIds: string[];
    };
    const map = new Map<string, Aggregate>();

    for (const th of takeHomes) {
      const key = (th.candidateEmail || th.candidateName).toLowerCase().trim();
      const existing = map.get(key);
      if (existing) {
        existing.takeHomeIds.push(th.id);
        if (!existing.email && th.candidateEmail) existing.email = th.candidateEmail;
      } else {
        map.set(key, {
          key,
          name: th.candidateName,
          email: th.candidateEmail || null,
          takeHomeIds: [th.id],
          sessionIds: [],
        });
      }
    }

    for (const s of sessions) {
      if (!s.candidateName) continue;
      const key = s.candidateName.toLowerCase().trim();
      const existing = map.get(key);
      if (existing) {
        existing.sessionIds.push(s.id);
      } else {
        map.set(key, {
          key,
          name: s.candidateName,
          email: null,
          takeHomeIds: [],
          sessionIds: [s.id],
        });
      }
    }

    // 4. Upsert each Candidate and link the source rows back
    for (const agg of map.values()) {
      // Prisma's unique constraint is (workspaceId, email). For candidates with
      // no email, we can't use upsert — we'd have to look up by name first.
      let candidate;
      if (agg.email) {
        candidate = await prisma.candidate.upsert({
          where: { workspaceId_email: { workspaceId: ws.id, email: agg.email } },
          update: { name: agg.name },
          create: {
            workspaceId: ws.id,
            name: agg.name,
            email: agg.email,
            source: "backfill",
            status: "active",
          },
        });
        if (candidate.createdAt.getTime() === candidate.updatedAt.getTime()) {
          createdCount += 1;
        } else {
          updatedCount += 1;
        }
      } else {
        // No email: try to find an existing emailless candidate with same name in this workspace
        const existing = await prisma.candidate.findFirst({
          where: { workspaceId: ws.id, email: null, name: agg.name },
        });
        candidate = existing ?? await prisma.candidate.create({
          data: {
            workspaceId: ws.id,
            name: agg.name,
            email: null,
            source: "backfill",
            status: "active",
          },
        });
        if (!existing) createdCount += 1;
      }

      // 5. Link the take-homes and sessions to this candidate
      if (agg.takeHomeIds.length > 0) {
        const res = await prisma.takeHomeAssignment.updateMany({
          where: { id: { in: agg.takeHomeIds }, candidateId: null },
          data: { candidateId: candidate.id },
        });
        linkedTakeHomes += res.count;
      }
      if (agg.sessionIds.length > 0) {
        const res = await prisma.interviewSession.updateMany({
          where: { id: { in: agg.sessionIds }, candidateId: null },
          data: { candidateId: candidate.id },
        });
        linkedSessions += res.count;
      }
    }
  }

  console.log(`\nDone:`);
  console.log(`  Candidates created:  ${createdCount}`);
  console.log(`  Candidates updated:  ${updatedCount}`);
  console.log(`  Take-homes linked:   ${linkedTakeHomes}`);
  console.log(`  Sessions linked:     ${linkedSessions}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
