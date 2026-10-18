import PlaygroundLoader from "@/components/PlaygroundLoader";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { after } from "next/server";
import type { SandpackFiles } from "@codesandbox/sandpack-react";

export const metadata = {
  title: "Interviewpad embed",
};

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const snippet = await prisma.snippet.findUnique({ where: { slug: id } });
  if (!snippet) notFound();
  if (snippet.visibility !== "public") notFound();

  // Count the view after the response is sent (never blocks render). Raw
  // SQL so the @updatedAt column is not bumped by a view.
  const snippetId = snippet.id;
  after(() =>
    prisma.$executeRaw`UPDATE "Snippet" SET "viewCount" = "viewCount" + 1 WHERE "id" = ${snippetId}`
      .then(() => undefined, () => undefined),
  );

  const files = JSON.parse(snippet.files) as SandpackFiles;
  return (
    <div className="fixed inset-0 flex">
      <PlaygroundLoader
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
        }}
        signedIn={false}
        isOwner={false}
        embed
      />
    </div>
  );
}

