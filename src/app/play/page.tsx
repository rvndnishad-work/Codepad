import FeaturePaused from "@/components/FeaturePaused";
import PlaygroundLoader from "@/components/PlaygroundLoader";
import { templatesById } from "@/lib/templates";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function NewPlaygroundPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; from?: string }>;
}) {
  const { template, from } = await searchParams;
  const templateId = template ?? "javascript";
  if (!templatesById[templateId]) redirect("/");
  const session = await auth().catch(() => null);
  // Only honour same-origin internal back links (e.g. an interview-question page)
  // to avoid an open-redirect via the `from` param.
  const backHref =
    from && from.startsWith("/interview-question") && !from.startsWith("//") ? from : undefined;
  return (
    <>
      <FeaturePaused featureKey="playground-run" wrapperClassName="mx-auto w-full max-w-6xl px-4 pt-4" />
      <PlaygroundLoader
        templateId={templateId}
        signedIn={Boolean(session?.user)}
        backHref={backHref}
      />
    </>
  );
}

