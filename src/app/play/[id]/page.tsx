import Playground from "@/components/Playground";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import type { SandpackFiles } from "@codesandbox/sandpack-react";

export default async function SavedPlaygroundPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; interview?: string; token?: string }>;
}) {
  const { id } = await params;
  const { view, interview: interviewId, token } = await searchParams;
  const snippet = await prisma.snippet.findUnique({ where: { slug: id } });
  if (!snippet) notFound();
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  const isOwner = Boolean(userId && snippet.userId === userId);

  // Grant access via interview shareToken: the candidate of a playground
  // interview round doesn't own the Snippet (it's the interviewer's), so
  // we accept a valid interview token + presence in playgroundIds as proof
  // of legitimate access to a private Snippet.
  let viaInterviewToken = false;
  if (!isOwner && interviewId && token) {
    const iv = await prisma.interviewSession.findUnique({
      where: { id: interviewId },
      select: { shareToken: true, playgroundIds: true, sourceType: true },
    });
    if (iv && iv.shareToken === token && iv.sourceType === "playground") {
      try {
        const ids = JSON.parse(iv.playgroundIds);
        if (Array.isArray(ids) && ids.includes(snippet.id)) {
          viaInterviewToken = true;
        }
      } catch {}
    }
  }

  if (!isOwner && !viaInterviewToken && snippet.visibility !== "public") {
    notFound();
  }

  const files = JSON.parse(snippet.files) as SandpackFiles;
  const previewOnly = view === "preview";
  const tags = parseTags(snippet.tags);

  const inner = (
    <Playground
      templateId={snippet.template}
      initialTitle={snippet.title}
      initialFiles={files}
      snippet={{
        id: snippet.id,
        slug: snippet.slug,
        title: snippet.title,
        template: snippet.template,
        files,
        visibility: snippet.visibility as "private" | "public",
        tags,
      }}
      signedIn={Boolean(userId)}
      isOwner={isOwner}
      previewOnly={previewOnly}
    />
  );

  if (previewOnly) {
    return <div className="fixed inset-0 flex">{inner}</div>;
  }
  return inner;
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((t): t is string => typeof t === "string")
      : [];
  } catch {
    return [];
  }
}
