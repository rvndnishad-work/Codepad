/**
 * Seed a GROWTH-plan workspace for end-to-end testing of the AI Screening
 * revamp (batches → multi-round → grading), and mint a NextAuth session cookie
 * so the browser can act as the recruiter without the login UI.
 *
 * Run:  node --env-file=.env scripts/seed-growth-e2e.mjs
 * Re-runnable — upserts by stable identifiers.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { encode } from "@auth/core/jwt";

const prisma = new PrismaClient();

const RECRUITER_EMAIL = "recruiter-e2e@test.local";
const RECRUITER_PASSWORD = "Password123!";
const WORKSPACE_SLUG = "growth-e2e";
const CANDIDATES = [
  { name: "Ada Lovelace", email: "ada-e2e@test.local" },
  { name: "Alan Turing", email: "alan-e2e@test.local" },
  { name: "Grace Hopper", email: "grace-e2e@test.local" },
];

async function main() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET not set — run with: node --env-file=.env scripts/seed-growth-e2e.mjs");

  // 1. Recruiter user (credentials login + JWT session).
  const passwordHash = bcrypt.hashSync(RECRUITER_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: RECRUITER_EMAIL },
    update: { passwordHash, userType: "recruiter" },
    create: { email: RECRUITER_EMAIL, name: "E2E Recruiter", passwordHash, userType: "recruiter" },
    select: { id: true, name: true, email: true, image: true, userType: true },
  });

  // 2. GROWTH workspace + OWNER membership.
  const workspace = await prisma.workspace.upsert({
    where: { slug: WORKSPACE_SLUG },
    update: { planName: "GROWTH" },
    create: { slug: WORKSPACE_SLUG, name: "Growth E2E", planName: "GROWTH" },
    select: { id: true, slug: true },
  });
  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: { role: "OWNER" },
    create: { workspaceId: workspace.id, userId: user.id, role: "OWNER" },
  });

  // 3. Credits — grant 10 if balance is low.
  const bal = await prisma.aIInterviewCreditLedger.aggregate({
    where: { workspaceId: workspace.id },
    _sum: { amount: true },
  });
  const balance = bal._sum.amount ?? 0;
  if (balance < 5) {
    await prisma.aIInterviewCreditLedger.create({
      data: { workspaceId: workspace.id, kind: "GRANT", amount: 10, adminUserId: user.id, note: "E2E seed" },
    });
  }

  // 4. CRM candidates (with email so they're invitable).
  for (const c of CANDIDATES) {
    await prisma.candidate.upsert({
      where: { workspaceId_email: { workspaceId: workspace.id, email: c.email } },
      update: { name: c.name, stage: "SCREENED", status: "active" },
      create: { workspaceId: workspace.id, name: c.name, email: c.email, stage: "SCREENED", source: "e2e-seed" },
    });
  }

  // 5. Mint the session cookie (dev = plain http → "authjs.session-token").
  const cookieName = "authjs.session-token";
  const token = {
    sub: user.id,
    uid: user.id,
    name: user.name,
    email: user.email,
    picture: user.image,
    userType: user.userType,
  };
  const jwt = await encode({ token, secret, salt: cookieName, maxAge: 30 * 24 * 60 * 60 });

  const finalBalance = (await prisma.aIInterviewCreditLedger.aggregate({
    where: { workspaceId: workspace.id },
    _sum: { amount: true },
  }))._sum.amount ?? 0;

  console.log(JSON.stringify({
    ok: true,
    workspaceSlug: workspace.slug,
    recruiterEmail: RECRUITER_EMAIL,
    recruiterPassword: RECRUITER_PASSWORD,
    userId: user.id,
    credits: finalBalance,
    candidates: CANDIDATES.map((c) => c.email),
    cookieName,
    cookieValue: jwt,
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
