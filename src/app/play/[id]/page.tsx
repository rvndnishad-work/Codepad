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
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const { view } = await searchParams;
  const snippet = await prisma.snippet.findUnique({ where: { slug: id } });
  if (!snippet) notFound();
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  const isOwner = Boolean(userId && snippet.userId === userId);

  if (!isOwner && snippet.visibility !== "public") {
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
