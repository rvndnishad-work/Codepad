import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderAIInterviewRun } from "@/app/ai-interview/[token]/run";

export const metadata = {
  title: "AI mock interview",
};

/** A developer's own AI practice run, on the developer site. */
export default async function PracticeRunPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const sp = (searchParams ? await searchParams : {}) ?? {};
  const path = `/candidate/interview/ai/${encodeURIComponent(token)}`;
  const run = await prisma.aIInterviewSession.findUnique({ where: { inviteToken: token }, select: { practice: true, candidateEmail: true } });
  if (!run) notFound();
  // Hiring screenings keep their own link.
  if (!run.practice) redirect(`/ai-interview/${encodeURIComponent(token)}`);
  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect(`/login?next=${encodeURIComponent(path)}`);
  if ((session.user.email ?? "").toLowerCase() !== run.candidateEmail.toLowerCase()) notFound();
  return renderAIInterviewRun(token, sp, path);
}
