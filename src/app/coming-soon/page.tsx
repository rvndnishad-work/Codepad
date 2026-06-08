import ComingSoon, { type ComingSoonMode } from "@/components/ComingSoon";

export const metadata = {
  title: "Coming Soon — Interviewpad",
  // Gated/unavailable screens shouldn't be indexed — they're transient states,
  // not real content. Keeps them out of search results and link previews.
  robots: { index: false, follow: true },
};

export default async function ComingSoonPage({
  searchParams,
}: {
  searchParams: Promise<{ feature?: string; mode?: string }>;
}) {
  const { feature, mode } = await searchParams;
  const resolvedMode: ComingSoonMode = mode === "unavailable" ? "unavailable" : "soon";

  return <ComingSoon feature={feature} mode={resolvedMode} />;
}
