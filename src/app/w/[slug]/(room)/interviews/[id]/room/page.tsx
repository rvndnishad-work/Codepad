import { redirect } from "next/navigation";
import { roomForRequest } from "../../../_room/load";
import NoAccess from "../../../_room/NoAccess";
import RoomClient from "../../../_room/RoomClient";

export const metadata = { title: "Interview room — Interviewpad" };
export const dynamic = "force-dynamic";

export default async function RoomPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { res } = await roomForRequest(slug, id);
  if (!res.ok) return <NoAccess reason={res.reason} next={`/w/${slug}/interviews/${id}/room`} />;
  // The workspace asks for consent and the candidate has not given it yet: the lobby asks first.
  if (res.data.interview.consentNeeded) redirect(`/w/${slug}/interviews/${id}/lobby`);
  return <RoomClient data={res.data} />;
}
