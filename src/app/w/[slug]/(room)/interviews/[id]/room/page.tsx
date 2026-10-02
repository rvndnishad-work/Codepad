import { redirect } from "next/navigation";
import { roomForRequest } from "../../../_room/load";
import { isWorkspaceLocked } from "@/lib/workspace/lock";
import WorkspaceLockedNotice from "@/components/WorkspaceLockedNotice";
import NoAccess from "../../../_room/NoAccess";
import RoomClient from "../../../_room/RoomClient";
import { featurePausedPage } from "@/components/FeaturePaused";

export const metadata = { title: "Interview room — Interviewpad" };
export const dynamic = "force-dynamic";

export default async function RoomPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  // Admin lock: the room stays closed to everyone, data is kept.
  if (await isWorkspaceLocked({ slug })) return <WorkspaceLockedNotice audience="candidate" />;
  const { res } = await roomForRequest(slug, id);
  const paused = await featurePausedPage("live-interviews");
  if (paused) return paused;
  if (!res.ok) return <NoAccess reason={res.reason} next={`/w/${slug}/interviews/${id}/room`} />;
  // The workspace asks for consent and the candidate has not given it yet: the lobby asks first.
  if (res.data.interview.consentNeeded) redirect(`/w/${slug}/interviews/${id}/lobby`);
  return <RoomClient data={res.data} />;
}
