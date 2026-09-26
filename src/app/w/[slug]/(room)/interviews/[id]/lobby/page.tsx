import { roomForRequest } from "../../../_room/load";
import NoAccess from "../../../_room/NoAccess";
import LobbyClient from "../../../_room/LobbyClient";

export const metadata = { title: "Interview lobby — Interviewpad" };
export const dynamic = "force-dynamic";

export default async function LobbyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ link?: string }>;
}) {
  const { slug, id } = await params;
  const { link } = await searchParams;
  const { res } = await roomForRequest(slug, id);
  if (!res.ok) return <NoAccess reason={link === "expired" || link === "invalid" ? link : res.reason} next={`/w/${slug}/interviews/${id}/lobby`} />;
  return <LobbyClient data={res.data} />;
}
