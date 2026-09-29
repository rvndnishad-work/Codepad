/**
 * In-app listeners on the workspace event bus. Server only.
 *
 * Webhook endpoints are one kind of receiver; these are the others that live
 * in the app itself (today: the ATS write-back). They run after the response,
 * like webhook sends, and never throw into the code that emitted the event.
 */
import { after } from "next/server";
import type { WorkspaceEvent } from "./catalog";

/** Events the ATS write-back cares about: a decision, or a finished screening. */
const ATS_EVENTS: ReadonlySet<WorkspaceEvent> = new Set(["candidate.decided", "screening.completed", "takehome.submitted"]);

export function runEventListeners(workspaceId: string, event: WorkspaceEvent, data: unknown): void {
  if (!ATS_EVENTS.has(event)) return;
  const run = async () => {
    try {
      const { onAtsWorkspaceEvent } = await import("@/lib/ats/writeback");
      await onAtsWorkspaceEvent(workspaceId, event, (data ?? {}) as Parameters<typeof onAtsWorkspaceEvent>[2]);
    } catch (err) {
      console.error(`[events] ATS listener for ${event} failed:`, err);
    }
  };
  try {
    after(run);
  } catch {
    void run();
  }
}
