import { requireAdminAccess } from "@/lib/permissions/staff";
import { prisma } from "@/lib/prisma";
import { getSwitch } from "@/lib/admin/switches";
import { getConversation, listConversations } from "@/lib/admin/assistant/conversations";
import { assistantApiKey, assistantModel } from "@/lib/admin/assistant/model";
import AssistantClient from "./AssistantClient";
import type { AlertItem } from "./AlertsPanel";

export const metadata = {
  title: "Assistant — Admin",
  robots: { index: false, follow: false },
};

const SEVERITY_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

/** "zai-org/GLM-5.3-Flash" reads as "GLM 5.3 Flash"; anything else shows as is. */
function modelLabel(model: string): string {
  const m = model.replace(/^.*\//, "").match(/^GLM-(\d+(?:\.\d+)?)(?:-(\w+))?$/i);
  if (!m) return model;
  return `GLM ${m[1]}${m[2] ? ` ${m[2].charAt(0).toUpperCase()}${m[2].slice(1)}` : ""}`;
}

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const session = await requireAdminAccess("platform:admin");
  const userId = session?.user?.id ?? "";
  const { c } = await searchParams;

  const [conversations, sw, alertRows] = await Promise.all([
    listConversations(userId),
    getSwitch("admin-assistant"),
    prisma.gemmaAlert.findMany({
      where: { status: "UNRESOLVED" },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, type: true, title: true, body: true, severity: true, proposedAction: true, createdAt: true },
    }),
  ]);
  const opened = c ? await getConversation(c, userId) : null;

  const alerts: AlertItem[] = alertRows
    .map((a) => {
      let proposedAction: AlertItem["proposedAction"] = null;
      try {
        proposedAction = a.proposedAction ? JSON.parse(a.proposedAction) : null;
      } catch {
        proposedAction = null;
      }
      return { id: a.id, type: a.type, title: a.title, body: a.body, severity: a.severity, createdAt: a.createdAt.toISOString(), proposedAction };
    })
    .sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9));

  return (
    <AssistantClient
      initialConversations={conversations}
      initialConversation={opened?.conversation.id ?? null}
      initialMessages={opened?.messages ?? []}
      status={{
        configured: !!assistantApiKey(),
        paused: sw.state === "on" ? null : sw.message || "The assistant is paused.",
        model: modelLabel(assistantModel()),
      }}
      alerts={alerts}
    />
  );
}
