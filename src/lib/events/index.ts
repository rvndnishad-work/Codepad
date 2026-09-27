/**
 * Workspace events and outbound webhooks. Server only; the pure catalog is
 * also importable on the client from "@/lib/events/catalog".
 */
export { emitWorkspaceEvent, type EventPayloads } from "./emit";
export { WORKSPACE_EVENTS, type WorkspaceEvent } from "./catalog";
