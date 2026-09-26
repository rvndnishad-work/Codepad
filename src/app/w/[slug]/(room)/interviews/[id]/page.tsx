import { redirect } from "next/navigation";

/** /w/<slug>/interviews/<id> opens the lobby. */
export default async function InterviewEntry({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  redirect(`/w/${slug}/interviews/${id}/lobby`);
}
