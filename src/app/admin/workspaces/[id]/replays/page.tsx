import { redirect } from "next/navigation";

/** The Replays tab only ever counted take homes; it lives under Take homes now. */
export default async function WorkspaceReplaysRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/workspaces/${id}/takehomes`);
}
