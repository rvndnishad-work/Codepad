import Playground from "@/components/Playground";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { SandpackFiles } from "@codesandbox/sandpack-react";

export const metadata = {
  title: "Codepad embed",
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

  const files = JSON.parse(snippet.files) as SandpackFiles;
  return (
    <div className="fixed inset-0 flex">
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
        }}
        signedIn={false}
        isOwner={false}
        embed
      />
    </div>
  );
}
