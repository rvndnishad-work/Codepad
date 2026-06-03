import { permanentRedirect } from "next/navigation";

type Params = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ invite?: string }>;
};

/**
 * Stage 2 redirect: every `/tracks/<slug>` now lives at `/challenges/<slug>`.
 *
 * We use `permanentRedirect` (HTTP 308 from the App Router) so any existing
 * share links — including magic-link invite URLs — keep working. The
 * `?invite=<token>` query is preserved across the hop so the new detail
 * page can accept it.
 *
 * The Track tables in Prisma still exist for backward compat; this page is
 * the only public surface that pointed at them, and once it forwards
 * everything to the unified Challenge route there's no path to read them.
 */
export default async function TrackRedirectPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const { invite } = (await searchParams) ?? {};
  const qs = invite ? `?invite=${encodeURIComponent(invite)}` : "";
  permanentRedirect(`/challenges/${slug}${qs}`);
}
