import { roomForRequest } from "../../../_room/load";
import NoAccess from "../../../_room/NoAccess";
import RoomClient from "../../../_room/RoomClient";

export const metadata = { title: "Interview room — Interviewpad" };
export const dynamic = "force-dynamic";

export default async function RoomPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { res } = await roomForRequest(slug, id);
  if (!res.ok) return <NoAccess reason={res.reason} next={`/w/${slug}/interviews/${id}/room`} />;
  return <RoomClient data={res.data} />;
}
