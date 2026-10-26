import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { renderAIInterviewRun } from "./run";

type Props = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AIInterviewRunPage({ params, searchParams }: Props) {
  const { token } = await params;
  const sp = (searchParams ? await searchParams : {}) ?? {};
  // Developer practice runs live on the developer site, next to their results.
  const practice = await prisma.aIInterviewSession.findUnique({ where: { inviteToken: token }, select: { practice: true } });
  if (practice?.practice) redirect(`/candidate/interview/ai/${encodeURIComponent(token)}`);
  return renderAIInterviewRun(token, sp, `/ai-interview/${token}`);
}

