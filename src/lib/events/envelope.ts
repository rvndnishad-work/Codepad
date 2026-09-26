/**
 * The JSON body receivers get. Pure (node:crypto only), so it is unit-tested.
 *
 *   { id: "evt_...", event, createdAt, workspace: { id, slug, name }, data }
 *
 * `data.reportPath` (relative to /w/<slug>/) becomes an absolute
 * `data.reportUrl`.
 */
import { randomBytes } from "crypto";

export function newEventId(): string {
  return `evt_${randomBytes(12).toString("hex")}`;
}

/** Builds the JSON body receivers get. Exported for tests and the test ping. */
export function buildEnvelope(
  eventId: string,
  event: string,
  workspace: { id: string; slug: string; name: string },
  data: Record<string, unknown>,
  origin: string,
  now: Date = new Date(),
): Record<string, unknown> {
  const { reportPath, ...rest } = data as { reportPath?: unknown } & Record<string, unknown>;
  const out: Record<string, unknown> = { ...rest };
  if (typeof reportPath === "string" && reportPath) {
    out.reportUrl = `${origin.replace(/\/+$/, "")}/w/${workspace.slug}/${reportPath.replace(/^\/+/, "")}`;
  }
  return {
    id: eventId,
    event,
    createdAt: now.toISOString(),
    workspace: { id: workspace.id, slug: workspace.slug, name: workspace.name },
    data: out,
  };
}
