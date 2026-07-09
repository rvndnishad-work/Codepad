"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { acceptWorkspaceInviteAction } from "./actions";

export default function AcceptInviteButton({
  token,
  workspaceSlug,
}: {
  token: string;
  workspaceSlug: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function accept() {
    setLoading(true);
    try {
      await acceptWorkspaceInviteAction(token);
      toast.success("Welcome to the team!");
      router.push(`/w/${workspaceSlug}`);
    } catch (err) {
      toast.error((err as Error).message ?? "Couldn't accept the invite.");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={accept}
      disabled={loading}
      className="w-full px-6 py-3 rounded-xl bg-accent hover:bg-accent-soft text-bg text-xs font-black uppercase tracking-wider transition-all shadow-soft hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? "Joining…" : "Accept invitation"}
    </button>
  );
}
