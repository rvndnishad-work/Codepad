import PlaygroundLoader from "@/components/PlaygroundLoader";
import { templatesById } from "@/lib/templates";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function NewPlaygroundPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const { template } = await searchParams;
  const templateId = template ?? "javascript";
  if (!templatesById[templateId]) redirect("/");
  const session = await auth().catch(() => null);
  return (
    <PlaygroundLoader templateId={templateId} signedIn={Boolean(session?.user)} />
  );
}

